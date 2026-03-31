import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import { SOURCE_DEFINITIONS, type SourceKey } from "@/lib/shared/source-registry";
import { readLatestIntakeResult } from "@/lib/server/intake/analyze";
import {
  findMappedHeaderFromRegistry,
  readColumnMappingRegistry,
  type SourceMappingRegistryEntry,
  upsertSourceMappingRegistry
} from "@/lib/server/intake/registry";
import { mergeMonthlyRawSources } from "@/lib/server/intake/monthly-merge";
import { assertValidCompanyKey, normalizeMonthToken } from "@/lib/server/shared/source-storage";
import {
  COLUMN_ALIASES,
  PREFERRED_SHEET_NAMES,
  REQUIRED_COLUMNS,
  SOURCE_TO_MODULE,
  STANDARDIZED_FILENAMES,
  type SourceModuleKey
} from "@/lib/server/intake/schema";
import { isSpreadsheetFile, isSupportedTabularFile, parseTabularFile } from "@/lib/server/shared/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const STANDARDIZED_ROOT = path.join(process.cwd(), "data", "standardized");
const derivedSupportCache = new Map<string, Promise<DerivedSupportData>>();

type NormalizationStatus = "completed" | "completed_with_review" | "blocked";

type StandardizedRow = Record<string, string>;

type SourceNormalizationResult = {
  sourceKey: SourceKey;
  moduleKey: SourceModuleKey;
  status: "standardized" | "review_only" | "missing";
  message: string;
  inputFiles: string[];
  stagingPath: string | null;
  standardizedPath: string | null;
  standardizedExcelPath: string | null;
  rowCount: number;
  mappedColumns: Record<string, string | null>;
  reviewColumns: string[];
  warnings: string[];
  appliedFixes: string[];
};

type DerivedCrmRow = {
  account_id: string;
  account_name: string;
  branch_id: string;
  branch_name: string;
  rep_id: string;
  rep_name: string;
};

type DerivedRepRow = {
  rep_id: string;
  rep_name: string;
  branch_id: string;
  branch_name: string;
};

type DerivedSupportData = {
  accountRows: DerivedCrmRow[];
  repRows: DerivedRepRow[];
  inputFiles: string[];
};

export type NormalizationResult = {
  company_key: string;
  execution_mode: string;
  intake_status: string;
  status: NormalizationStatus;
  staging_root: string;
  standardized_root: string;
  source_results: SourceNormalizationResult[];
  module_outputs: Record<SourceModuleKey, string[]>;
  summary_message: string;
  generated_at: string;
};

function companyRoot(companyKey: string): string {
  return path.join(COMPANY_SOURCE_ROOT, companyKey);
}

function intakeStagingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_intake_staging");
}

function onboardingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_onboarding");
}

function standardizedCompanyRoot(companyKey: string): string {
  return path.join(STANDARDIZED_ROOT, companyKey);
}

function normalizationMetaRoot(companyKey: string): string {
  return path.join(standardizedCompanyRoot(companyKey), "_meta");
}

function latestNormalizationPath(companyKey: string): string {
  return path.join(normalizationMetaRoot(companyKey), "latest_normalization_result.json");
}

function normalizationHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:T]/g, "").slice(0, 15);
  return path.join(normalizationMetaRoot(companyKey), `normalization_result_${stamp}.json`);
}

function sourceStagingPath(companyKey: string, sourceKey: SourceKey): string {
  return path.join(intakeStagingRoot(companyKey), `${sourceKey}.json`);
}

function sourceStandardizedPath(companyKey: string, sourceKey: SourceKey): string {
  return path.join(
    standardizedCompanyRoot(companyKey),
    SOURCE_TO_MODULE[sourceKey],
    STANDARDIZED_FILENAMES[sourceKey]
  );
}

function sourceStandardizedExcelPath(companyKey: string, sourceKey: SourceKey): string {
  return sourceStandardizedPath(companyKey, sourceKey).replace(/\.json$/i, ".xlsx");
}

function normalizationReportPath(companyKey: string, moduleKey: SourceModuleKey): string {
  return path.join(standardizedCompanyRoot(companyKey), moduleKey, "normalization_report.json");
}

function toPosixRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function collectExcelHeaders(sourceKey: SourceKey, rows: StandardizedRow[]): string[] {
  const headers = new Set<string>(REQUIRED_COLUMNS[sourceKey]);
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headers.add(key));
  });
  return [...headers];
}

async function writeRowsAsExcel(filePath: string, sourceKey: SourceKey, rows: StandardizedRow[]): Promise<void> {
  const headers = collectExcelHeaders(sourceKey, rows);
  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "standardized");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await fs.writeFile(filePath, buffer);
}

async function listFilesRecursively(targetPath: string): Promise<string[]> {
  if (!(await fileExists(targetPath))) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath)));
    } else {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

function normalizeHeaderName(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s()_\-./]+/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function extractMonthFromPath(filePath: string): string | null {
  const pathParts = filePath.split(path.sep);
  for (const part of pathParts) {
    if (!/^\d{6}$/.test(part.trim())) {
      continue;
    }

    const normalized = normalizeMonthToken(part.trim());
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function resolveMatchedHeader(headers: string[], semanticColumn: string): string | null {
  const aliases = [semanticColumn, ...(COLUMN_ALIASES[semanticColumn] ?? [])];
  return (
    headers.find((header) =>
      aliases.some((alias) => normalizeHeaderName(header) === normalizeHeaderName(alias))
    ) ?? null
  );
}

function cleanRawCellValue(value: string): string {
  const normalized = value
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const lowered = normalized.toLowerCase();
  if (["null", "nan", "n/a", "na", "none", "-", "--"].includes(lowered)) {
    return "";
  }

  return normalized;
}

async function collectDerivedSupportData(companyKey: string): Promise<DerivedSupportData> {
  const supportSources: SourceKey[] = ["sales", "target", "crm_activity", "account_master", "crm_account_assignment"];
  const accountRows: DerivedCrmRow[] = [];
  const repRows: DerivedRepRow[] = [];
  const inputFiles = new Set<string>();

  for (const sourceKey of supportSources) {
    const definition = SOURCE_DEFINITIONS.find((item) => item.sourceKey === sourceKey);
    if (!definition) {
      continue;
    }

    const sourceRoot = path.join(companyRoot(companyKey), definition.folder);
    const files = (await listFilesRecursively(sourceRoot)).filter((filePath) => {
      const basename = path.basename(filePath).toLowerCase();
      return basename.includes(definition.sourceKey) || basename.includes(definition.filenameBase);
    });

    for (const filePath of files) {
      if (!isSupportedTabularFile(filePath)) {
        continue;
      }

      inputFiles.add(toPosixRelativePath(filePath));
      const { headers, rows } = await parseTabularFile(filePath, PREFERRED_SHEET_NAMES[sourceKey]);
      const accountIdHeader = resolveMatchedHeader(headers, "account_id");
      const accountNameHeader = resolveMatchedHeader(headers, "account_name");
      const branchIdHeader = resolveMatchedHeader(headers, "branch_id");
      const branchNameHeader = resolveMatchedHeader(headers, "branch_name");
      const repIdHeader = resolveMatchedHeader(headers, "rep_id");
      const repNameHeader = resolveMatchedHeader(headers, "rep_name");
      const repFallbackHeader = resolveMatchedHeader(headers, "rep");

      rows.forEach((row) => {
        const accountId = accountIdHeader ? cleanRawCellValue(row[accountIdHeader] ?? "") : "";
        const accountName = accountNameHeader ? cleanRawCellValue(row[accountNameHeader] ?? "") : "";
        const branchId = branchIdHeader ? cleanRawCellValue(row[branchIdHeader] ?? "") : "";
        const branchName = branchNameHeader ? cleanRawCellValue(row[branchNameHeader] ?? "") : "";
        const repId = repIdHeader ? cleanRawCellValue(row[repIdHeader] ?? "") : "";
        const repName = cleanRawCellValue(
          repNameHeader ? (row[repNameHeader] ?? "") : repFallbackHeader ? (row[repFallbackHeader] ?? "") : ""
        );

        if (accountId && accountName) {
          accountRows.push({
            account_id: accountId,
            account_name: accountName,
            branch_id: branchId,
            branch_name: branchName,
            rep_id: repId,
            rep_name: repName
          });
        }

        if (repId || repName) {
          repRows.push({
            rep_id: repId,
            rep_name: repName,
            branch_id: branchId,
            branch_name: branchName
          });
        }
      });
    }
  }

  return {
    accountRows,
    repRows,
    inputFiles: [...inputFiles]
  };
}

function getDerivedSupportData(companyKey: string): Promise<DerivedSupportData> {
  if (!derivedSupportCache.has(companyKey)) {
    derivedSupportCache.set(companyKey, collectDerivedSupportData(companyKey));
  }

  return derivedSupportCache.get(companyKey)!;
}

async function buildDerivedAccountMasterRows(companyKey: string): Promise<StandardizedRow[]> {
  const derivedRows = (await getDerivedSupportData(companyKey)).accountRows;
  const deduped = new Map<string, StandardizedRow>();

  derivedRows.forEach((row) => {
    if (!deduped.has(row.account_id)) {
      deduped.set(row.account_id, {
        account_id: row.account_id,
        account_name: row.account_name,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        rep_id: row.rep_id,
        rep_name: row.rep_name
      });
    }
  });

  return [...deduped.values()];
}

async function buildDerivedAccountAssignmentRows(companyKey: string): Promise<StandardizedRow[]> {
  const derivedRows = (await getDerivedSupportData(companyKey)).accountRows;
  const deduped = new Map<string, StandardizedRow>();

  derivedRows.forEach((row) => {
    const key = [row.account_id, row.rep_id, row.branch_id].join("::");
    if (!row.account_id || !row.rep_id) {
      return;
    }

    if (!deduped.has(key)) {
      deduped.set(key, {
        account_id: row.account_id,
        account_name: row.account_name,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        rep_id: row.rep_id,
        rep_name: row.rep_name
      });
    }
  });

  return [...deduped.values()];
}

async function buildDerivedRepMasterRows(companyKey: string): Promise<StandardizedRow[]> {
  const derivedRows = (await getDerivedSupportData(companyKey)).repRows;
  const deduped = new Map<string, StandardizedRow>();

  derivedRows.forEach((row) => {
    const key = row.rep_id || row.rep_name;
    if (!key) {
      return;
    }

    if (!deduped.has(key)) {
      deduped.set(key, {
        rep_id: row.rep_id || key,
        rep_name: row.rep_name || key,
        branch_id: row.branch_id,
        branch_name: row.branch_name
      });
    }
  });

  return [...deduped.values()];
}

function normalizeDateValue(value: string): string {
  const trimmed = cleanRawCellValue(value);
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return trimmed;
}

function normalizePeriodValue(value: string, fallbackMonthToken: string | null): string {
  const cleaned = cleanRawCellValue(value);
  const normalized = normalizeMonthToken(cleaned) ?? fallbackMonthToken;
  return normalized ?? cleaned;
}

function normalizeCellValue(column: string, value: string, fallbackMonthToken: string | null): string {
  if (column === "period") {
    return normalizePeriodValue(value, fallbackMonthToken);
  }

  if (column === "activity_date" || column === "ship_date") {
    return normalizeDateValue(value);
  }

  return cleanRawCellValue(value);
}

function dedupeKeyForSource(sourceKey: SourceKey, row: StandardizedRow): string {
  const preferredColumns: Record<SourceKey, string[]> = {
    crm_activity: ["activity_date", "rep", "account", "activity_type"],
    account_master: ["account_id", "account_name"],
    crm_rep_master: ["rep_id", "rep_name"],
    crm_account_assignment: ["account_id", "rep_id", "branch_id"],
    crm_rules: ["metric_code", "metric_version"],
    sales: ["account", "product", "period", "amount"],
    target: ["period", "target_value", "account", "product"],
    prescription: ["ship_date", "pharmacy", "product", "quantity"]
  };

  const preferredValues = preferredColumns[sourceKey]
    .map((column) => cleanRawCellValue(row[column] ?? ""))
    .filter(Boolean);

  if (preferredValues.length > 0) {
    return preferredValues.join("::");
  }

  return Object.entries(row)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${normalizeHeaderName(key)}=${cleanRawCellValue(value)}`)
    .join("::");
}

function dedupeRows(sourceKey: SourceKey, rows: StandardizedRow[]): { rows: StandardizedRow[]; removedCount: number } {
  const deduped = new Map<string, StandardizedRow>();

  rows.forEach((row) => {
    const key = dedupeKeyForSource(sourceKey, row);
    if (!key) {
      return;
    }

    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  });

  return {
    rows: [...deduped.values()],
    removedCount: rows.length - deduped.size
  };
}

function resolveCanonicalHeaders(
  headers: string[],
  sourceRegistry?: SourceMappingRegistryEntry
): {
  mappedColumns: Record<string, string | null>;
  matchedBy: Record<string, "alias" | "registry" | null>;
} {
  const mappedColumns: Record<string, string | null> = {};
  const matchedBy: Record<string, "alias" | "registry" | null> = {};

  for (const [column, aliases] of Object.entries(COLUMN_ALIASES)) {
    const aliasMatchedHeader =
      headers.find((header) =>
        [column, ...aliases].some((alias) => normalizeHeaderName(header) === normalizeHeaderName(alias))
      ) ?? null;

    if (aliasMatchedHeader) {
      mappedColumns[column] = aliasMatchedHeader;
      matchedBy[column] = "alias";
      continue;
    }

    const registryHeader = findMappedHeaderFromRegistry(headers, column, sourceRegistry);
    mappedColumns[column] = registryHeader;
    matchedBy[column] = registryHeader ? "registry" : null;
  }

  return {
    mappedColumns,
    matchedBy
  };
}

async function normalizeSource(
  companyKey: string,
  sourceKey: SourceKey,
  sourceRegistry?: SourceMappingRegistryEntry
): Promise<SourceNormalizationResult> {
  const definition = SOURCE_DEFINITIONS.find((item) => item.sourceKey === sourceKey);
  if (!definition) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  const sourceRoot = path.join(companyRoot(companyKey), definition.folder);
  const files = (await listFilesRecursively(sourceRoot)).filter((filePath) => {
    const basename = path.basename(filePath).toLowerCase();
    return basename.includes(definition.sourceKey) || basename.includes(definition.filenameBase);
  });

  if (files.length === 0) {
    return {
      sourceKey,
      moduleKey: SOURCE_TO_MODULE[sourceKey],
      status: "missing",
      message: "정규화할 입력 파일이 없습니다.",
      inputFiles: [],
      stagingPath: null,
      standardizedPath: null,
      standardizedExcelPath: null,
      rowCount: 0,
      mappedColumns: {},
      reviewColumns: REQUIRED_COLUMNS[sourceKey],
      warnings: ["입력 파일이 없어 정규화를 건너뜁니다."],
      appliedFixes: []
    };
  }

  const supportedFiles = files.filter((filePath) => isSupportedTabularFile(filePath));
  const unsupportedFiles = files.filter((filePath) => !supportedFiles.includes(filePath));

  if (supportedFiles.length === 0) {
    return {
      sourceKey,
      moduleKey: SOURCE_TO_MODULE[sourceKey],
      status: "review_only",
      message: "csv/xlsx 입력이 없어 현재 1차 정규화는 메타만 남기고 검토 대상으로 둡니다.",
      inputFiles: files.map(toPosixRelativePath),
      stagingPath: null,
      standardizedPath: null,
      standardizedExcelPath: null,
      rowCount: 0,
      mappedColumns: {},
      reviewColumns: REQUIRED_COLUMNS[sourceKey],
      warnings: ["현재 정규화는 csv/xlsx 중심으로 동작합니다."],
      appliedFixes: []
    };
  }

  let mergedRows: StandardizedRow[] = [];
  const canonicalHeaders = new Set<string>();
  const mappedColumns: Record<string, string | null> = {};
  const warnings: string[] = [];
  const appliedFixes: string[] = [];
  const supportInputFiles = new Set<string>();
  const registryReusedColumns = new Set<string>();
  let usedFallbackSheet = false;
  let blankNormalizedCount = 0;

  for (const filePath of supportedFiles) {
    const { headers, rows, selectedSheet } = await parseTabularFile(filePath, PREFERRED_SHEET_NAMES[sourceKey]);
    const canonicalResolution = resolveCanonicalHeaders(headers, sourceRegistry);
    const canonicalMap = canonicalResolution.mappedColumns;
    const fallbackMonthToken = extractMonthFromPath(filePath);
    if (isSpreadsheetFile(filePath) && selectedSheet) {
      const preferredNames = PREFERRED_SHEET_NAMES[sourceKey].map((item) => item.trim().toLowerCase());
      if (!preferredNames.includes(selectedSheet.trim().toLowerCase())) {
        usedFallbackSheet = true;
      }
    }

    for (const requiredColumn of REQUIRED_COLUMNS[sourceKey]) {
      mappedColumns[requiredColumn] ??= canonicalMap[requiredColumn] ?? null;
      if (canonicalResolution.matchedBy[requiredColumn] === "registry") {
        registryReusedColumns.add(requiredColumn);
      }
    }

    rows.forEach((row) => {
      const normalizedRow: StandardizedRow = {};

      for (const requiredColumn of REQUIRED_COLUMNS[sourceKey]) {
        const matchedHeader = canonicalMap[requiredColumn];
        const rawValue = matchedHeader ? (row[matchedHeader] ?? "") : "";
        const normalizedValue = normalizeCellValue(requiredColumn, rawValue, fallbackMonthToken);
        if (cleanRawCellValue(rawValue) !== normalizedValue) {
          blankNormalizedCount += 1;
        }
        normalizedRow[requiredColumn] = normalizedValue;
        canonicalHeaders.add(requiredColumn);
      }

      Object.entries(row).forEach(([header, value]) => {
        const normalizedHeader = normalizeHeaderName(header);
        if (![...canonicalHeaders].some((item) => normalizeHeaderName(item) === normalizedHeader)) {
          const cleanedValue = cleanRawCellValue(value);
          if (cleanRawCellValue(value) !== value.trim()) {
            blankNormalizedCount += 1;
          }
          normalizedRow[header.trim()] = cleanedValue;
        }
      });

      mergedRows.push(normalizedRow);
    });
  }

  let reviewColumns = REQUIRED_COLUMNS[sourceKey].filter((column) => !mappedColumns[column]);
  if (
    (sourceKey === "account_master" || sourceKey === "crm_account_assignment") &&
    (reviewColumns.includes("account_id") || reviewColumns.includes("account_name"))
  ) {
    const derivedRows =
      sourceKey === "account_master"
        ? await buildDerivedAccountMasterRows(companyKey)
        : await buildDerivedAccountAssignmentRows(companyKey);

    if (derivedRows.length > 0) {
      const derivedSupport = await getDerivedSupportData(companyKey);
      mergedRows = derivedRows;
      mappedColumns.account_id ??= "derived_from_support_sources";
      mappedColumns.account_name ??= "derived_from_support_sources";
      mappedColumns.branch_id ??= "derived_from_support_sources";
      mappedColumns.branch_name ??= "derived_from_support_sources";
      mappedColumns.rep_id ??= "derived_from_support_sources";
      mappedColumns.rep_name ??= "derived_from_support_sources";
      reviewColumns = REQUIRED_COLUMNS[sourceKey].filter((column) => !mappedColumns[column]);
      const message =
        sourceKey === "account_master"
          ? "원본 account master가 약해 다른 source를 이용한 실행용 거래처 마스터를 생성했습니다."
          : "원본 account assignment가 약해 다른 source를 이용한 실행용 거래처 배정표를 생성했습니다.";
      warnings.push(message);
      appliedFixes.push(message);
      appliedFixes.push(`${sourceKey}에서 account_id, account_name 실행용 컬럼을 자동 생성했습니다.`);
      derivedSupport.inputFiles.forEach((item) => supportInputFiles.add(item));
    }
  }

  if (
    sourceKey === "crm_rep_master" &&
    (reviewColumns.includes("rep_id") || reviewColumns.includes("rep_name") || reviewColumns.includes("branch_id") || reviewColumns.includes("branch_name"))
  ) {
    const derivedRows = await buildDerivedRepMasterRows(companyKey);
    if (derivedRows.length > 0) {
      const derivedSupport = await getDerivedSupportData(companyKey);
      mergedRows = derivedRows;
      mappedColumns.rep_id ??= "derived_from_support_sources";
      mappedColumns.rep_name ??= "derived_from_support_sources";
      mappedColumns.branch_id ??= "derived_from_support_sources";
      mappedColumns.branch_name ??= "derived_from_support_sources";
      reviewColumns = REQUIRED_COLUMNS[sourceKey].filter((column) => !mappedColumns[column]);
      const message = "원본 rep master가 약해 다른 source를 이용한 실행용 담당자 마스터를 생성했습니다.";
      warnings.push(message);
      appliedFixes.push(message);
      appliedFixes.push("crm_rep_master에서 rep_id, rep_name 실행용 컬럼을 자동 생성했습니다.");
      derivedSupport.inputFiles.forEach((item) => supportInputFiles.add(item));
    }
  }

  const dedupedResult = dedupeRows(sourceKey, mergedRows);
  mergedRows = dedupedResult.rows;
  if (registryReusedColumns.size > 0) {
    appliedFixes.push(`${sourceKey}에서 저장된 매핑을 재사용했습니다: ${[...registryReusedColumns].join(", ")}.`);
  }
  if (dedupedResult.removedCount > 0) {
    appliedFixes.push(`${sourceKey}에서 중복 행 ${dedupedResult.removedCount}건을 제거했습니다.`);
  }
  if (blankNormalizedCount > 0) {
    appliedFixes.push(`${sourceKey}에서 공백/빈값 표현 ${blankNormalizedCount}건을 정리했습니다.`);
  }

  if (reviewColumns.length > 0) {
    warnings.push(`확정되지 않은 필수 컬럼이 있습니다: ${reviewColumns.join(", ")}`);
  }
  if (unsupportedFiles.length > 0) {
    warnings.push("지원하지 않는 형식의 파일은 제외하고 csv/xlsx만 정규화했습니다.");
  }
  if (supportedFiles.some((filePath) => isSpreadsheetFile(filePath))) {
    warnings.push(
      usedFallbackSheet
        ? "일부 xlsx는 지정한 시트 이름을 찾지 못해 첫 번째 시트 기준으로 정규화했습니다."
        : "xlsx 입력은 source별 우선 시트 이름 규칙 기준으로 정규화했습니다."
    );
  }

  const stagingPayload = {
    company_key: companyKey,
    source_key: sourceKey,
    module_key: SOURCE_TO_MODULE[sourceKey],
    row_count: mergedRows.length,
    mapped_columns: mappedColumns,
    review_columns: reviewColumns,
    input_files: [...new Set([...files.map(toPosixRelativePath), ...supportInputFiles])],
    applied_fixes: appliedFixes,
    rows: mergedRows
  };

  const standardizedPayload = {
    company_key: companyKey,
    source_key: sourceKey,
    module_key: SOURCE_TO_MODULE[sourceKey],
    standardized_at: new Date().toISOString(),
    row_count: mergedRows.length,
    schema_version: "v1",
    applied_fixes: appliedFixes,
    rows: mergedRows
  };

  const stagingPath = sourceStagingPath(companyKey, sourceKey);
  const standardizedPath = sourceStandardizedPath(companyKey, sourceKey);
  const standardizedExcelPath = sourceStandardizedExcelPath(companyKey, sourceKey);
  await ensureDir(path.dirname(stagingPath));
  await ensureDir(path.dirname(standardizedPath));
  await ensureDir(path.dirname(standardizedExcelPath));
  await fs.writeFile(stagingPath, JSON.stringify(stagingPayload, null, 2), "utf8");
  await fs.writeFile(standardizedPath, JSON.stringify(standardizedPayload, null, 2), "utf8");
  await writeRowsAsExcel(standardizedExcelPath, sourceKey, mergedRows);
  await upsertSourceMappingRegistry({
    companyKey,
    sourceKey,
    matchedColumns: mappedColumns,
    derivedColumns: Object.entries(mappedColumns)
      .filter(([, value]) => Boolean(value?.startsWith("derived_from_")))
      .map(([column]) => column)
  });

  return {
    sourceKey,
    moduleKey: SOURCE_TO_MODULE[sourceKey],
    status: reviewColumns.length > 0 || unsupportedFiles.length > 0 ? "review_only" : "standardized",
    message:
      reviewColumns.length > 0 || unsupportedFiles.length > 0
        ? "표준화는 생성했지만 일부 컬럼 확인 또는 지원하지 않는 형식 검토가 남아 있습니다."
        : "표준화 결과를 생성했습니다.",
    inputFiles: [...new Set([...files.map(toPosixRelativePath), ...supportInputFiles])],
    stagingPath: toPosixRelativePath(stagingPath),
    standardizedPath: toPosixRelativePath(standardizedPath),
    standardizedExcelPath: toPosixRelativePath(standardizedExcelPath),
    rowCount: mergedRows.length,
    mappedColumns,
    reviewColumns,
    warnings,
    appliedFixes
  };
}

export async function runNormalization(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<NormalizationResult> {
  assertValidCompanyKey(input.companyKey);
  derivedSupportCache.delete(input.companyKey);

  await mergeMonthlyRawSources({ companyKey: input.companyKey });

  const intakeResult = await readLatestIntakeResult(input.companyKey);
  if (!intakeResult) {
    throw new Error("먼저 intake analyze를 실행해야 합니다.");
  }

  if (intakeResult.status === "blocked") {
    throw new Error("현재 intake 상태가 blocked라서 정규화를 시작할 수 없습니다.");
  }

  const mappingRegistry = await readColumnMappingRegistry(input.companyKey);
  const sourceResults: SourceNormalizationResult[] = [];
  for (const definition of SOURCE_DEFINITIONS) {
    sourceResults.push(
      await normalizeSource(
        input.companyKey,
        definition.sourceKey,
        mappingRegistry.source_mappings[definition.sourceKey]
      )
    );
  }

  const moduleOutputs: Record<SourceModuleKey, string[]> = {
    crm: [],
    sandbox: [],
    prescription: []
  };

  sourceResults.forEach((result) => {
    if (result.standardizedPath) {
      moduleOutputs[result.moduleKey].push(result.standardizedPath);
    }
    if (result.standardizedExcelPath) {
      moduleOutputs[result.moduleKey].push(result.standardizedExcelPath);
    }
  });

  const generatedAt = new Date().toISOString();
  await Promise.all(
    (Object.keys(moduleOutputs) as SourceModuleKey[]).map(async (moduleKey) => {
      const reportPath = normalizationReportPath(input.companyKey, moduleKey);
      await ensureDir(path.dirname(reportPath));
      await fs.writeFile(
        reportPath,
        JSON.stringify(
          {
            company_key: input.companyKey,
            module_key: moduleKey,
            generated_at: generatedAt,
            output_files: moduleOutputs[moduleKey],
            source_results: sourceResults.filter((result) => result.moduleKey === moduleKey)
          },
          null,
          2
        ),
        "utf8"
      );
    })
  );

  const hasReview = sourceResults.some(
    (result) => result.status === "review_only" || result.reviewColumns.length > 0 || result.warnings.length > 0
  );

  const result: NormalizationResult = {
    company_key: input.companyKey,
    execution_mode: input.executionMode ?? intakeResult.execution_mode,
    intake_status: intakeResult.status,
    status: hasReview ? "completed_with_review" : "completed",
    staging_root: toPosixRelativePath(intakeStagingRoot(input.companyKey)),
    standardized_root: toPosixRelativePath(standardizedCompanyRoot(input.companyKey)),
    source_results: sourceResults,
    module_outputs: moduleOutputs,
    summary_message: hasReview
      ? "표준화 결과를 생성했지만 일부 source는 추가 검토가 필요합니다."
      : "표준화 결과를 생성했고 다음 KPI 단계로 넘길 수 있습니다.",
    generated_at: generatedAt
  };

  await ensureDir(normalizationMetaRoot(input.companyKey));
  await fs.writeFile(latestNormalizationPath(input.companyKey), JSON.stringify(result, null, 2), "utf8");
  await fs.writeFile(normalizationHistoryPath(input.companyKey, generatedAt), JSON.stringify(result, null, 2), "utf8");

  return result;
}

export async function readLatestNormalizationResult(companyKey: string): Promise<NormalizationResult | null> {
  assertValidCompanyKey(companyKey);
  const targetPath = latestNormalizationPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return null;
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as NormalizationResult;
}
