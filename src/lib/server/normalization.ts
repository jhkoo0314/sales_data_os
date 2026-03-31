import { promises as fs } from "node:fs";
import path from "node:path";

import { SOURCE_DEFINITIONS, type SourceKey } from "@/lib/source-registry";
import { readLatestIntakeResult } from "@/lib/server/intake-analysis";
import { assertValidCompanyKey, normalizeMonthToken } from "@/lib/server/source-storage";
import {
  COLUMN_ALIASES,
  PREFERRED_SHEET_NAMES,
  REQUIRED_COLUMNS,
  SOURCE_TO_MODULE,
  STANDARDIZED_FILENAMES,
  type SourceModuleKey
} from "@/lib/server/source-schema";
import { isSpreadsheetFile, isSupportedTabularFile, parseTabularFile } from "@/lib/server/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const STANDARDIZED_ROOT = path.join(process.cwd(), "data", "standardized");

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
  rowCount: number;
  mappedColumns: Record<string, string | null>;
  reviewColumns: string[];
  warnings: string[];
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
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function extractMonthFromPath(filePath: string): string | null {
  const tokens = filePath.match(/\d{6}/g) ?? [];
  for (const token of tokens) {
    const normalized = normalizeMonthToken(token);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function normalizeDateValue(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  return trimmed;
}

function normalizePeriodValue(value: string, fallbackMonthToken: string | null): string {
  const normalized = normalizeMonthToken(value) ?? fallbackMonthToken;
  return normalized ?? value.trim();
}

function normalizeCellValue(column: string, value: string, fallbackMonthToken: string | null): string {
  if (column === "period") {
    return normalizePeriodValue(value, fallbackMonthToken);
  }

  if (column === "activity_date" || column === "ship_date") {
    return normalizeDateValue(value);
  }

  return value.trim();
}

function resolveCanonicalHeaders(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const [column, aliases] of Object.entries(COLUMN_ALIASES)) {
    const matchedHeader =
      headers.find((header) =>
        [column, ...aliases].some((alias) => normalizeHeaderName(header) === normalizeHeaderName(alias))
      ) ?? null;
    result[column] = matchedHeader;
  }

  return result;
}

async function normalizeSource(companyKey: string, sourceKey: SourceKey): Promise<SourceNormalizationResult> {
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
      rowCount: 0,
      mappedColumns: {},
      reviewColumns: REQUIRED_COLUMNS[sourceKey],
      warnings: ["입력 파일이 없어 정규화를 건너뜁니다."]
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
      rowCount: 0,
      mappedColumns: {},
      reviewColumns: REQUIRED_COLUMNS[sourceKey],
      warnings: ["현재 정규화는 csv/xlsx 중심으로 동작합니다."]
    };
  }

  const mergedRows: StandardizedRow[] = [];
  const canonicalHeaders = new Set<string>();
  const mappedColumns: Record<string, string | null> = {};
  const warnings: string[] = [];
  let usedFallbackSheet = false;

  for (const filePath of supportedFiles) {
    const { headers, rows, selectedSheet } = await parseTabularFile(filePath, PREFERRED_SHEET_NAMES[sourceKey]);
    const canonicalMap = resolveCanonicalHeaders(headers);
    const fallbackMonthToken = extractMonthFromPath(filePath);
    if (isSpreadsheetFile(filePath) && selectedSheet) {
      const preferredNames = PREFERRED_SHEET_NAMES[sourceKey].map((item) => item.trim().toLowerCase());
      if (!preferredNames.includes(selectedSheet.trim().toLowerCase())) {
        usedFallbackSheet = true;
      }
    }

    for (const requiredColumn of REQUIRED_COLUMNS[sourceKey]) {
      mappedColumns[requiredColumn] ??= canonicalMap[requiredColumn] ?? null;
    }

    rows.forEach((row) => {
      const normalizedRow: StandardizedRow = {};

      for (const requiredColumn of REQUIRED_COLUMNS[sourceKey]) {
        const matchedHeader = canonicalMap[requiredColumn];
        const rawValue = matchedHeader ? (row[matchedHeader] ?? "") : "";
        normalizedRow[requiredColumn] = normalizeCellValue(requiredColumn, rawValue, fallbackMonthToken);
        canonicalHeaders.add(requiredColumn);
      }

      Object.entries(row).forEach(([header, value]) => {
        const normalizedHeader = normalizeHeaderName(header);
        if (![...canonicalHeaders].some((item) => normalizeHeaderName(item) === normalizedHeader)) {
          normalizedRow[header.trim()] = value.trim();
        }
      });

      mergedRows.push(normalizedRow);
    });
  }

  const reviewColumns = REQUIRED_COLUMNS[sourceKey].filter((column) => !mappedColumns[column]);
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
    input_files: files.map(toPosixRelativePath),
    rows: mergedRows
  };

  const standardizedPayload = {
    company_key: companyKey,
    source_key: sourceKey,
    module_key: SOURCE_TO_MODULE[sourceKey],
    standardized_at: new Date().toISOString(),
    row_count: mergedRows.length,
    schema_version: "v1",
    rows: mergedRows
  };

  const stagingPath = sourceStagingPath(companyKey, sourceKey);
  const standardizedPath = sourceStandardizedPath(companyKey, sourceKey);
  await ensureDir(path.dirname(stagingPath));
  await ensureDir(path.dirname(standardizedPath));
  await fs.writeFile(stagingPath, JSON.stringify(stagingPayload, null, 2), "utf8");
  await fs.writeFile(standardizedPath, JSON.stringify(standardizedPayload, null, 2), "utf8");

  return {
    sourceKey,
    moduleKey: SOURCE_TO_MODULE[sourceKey],
    status: reviewColumns.length > 0 || unsupportedFiles.length > 0 ? "review_only" : "standardized",
    message:
      reviewColumns.length > 0 || unsupportedFiles.length > 0
        ? "표준화는 생성했지만 일부 컬럼 확인 또는 지원하지 않는 형식 검토가 남아 있습니다."
        : "표준화 결과를 생성했습니다.",
    inputFiles: files.map(toPosixRelativePath),
    stagingPath: toPosixRelativePath(stagingPath),
    standardizedPath: toPosixRelativePath(standardizedPath),
    rowCount: mergedRows.length,
    mappedColumns,
    reviewColumns,
    warnings
  };
}

export async function runNormalization(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<NormalizationResult> {
  assertValidCompanyKey(input.companyKey);

  const intakeResult = await readLatestIntakeResult(input.companyKey);
  if (!intakeResult) {
    throw new Error("먼저 intake analyze를 실행해야 합니다.");
  }

  if (intakeResult.status === "blocked") {
    throw new Error("현재 intake 상태가 blocked라서 정규화를 시작할 수 없습니다.");
  }

  const sourceResults = await Promise.all(
    SOURCE_DEFINITIONS.map((definition) => normalizeSource(input.companyKey, definition.sourceKey))
  );

  const moduleOutputs: Record<SourceModuleKey, string[]> = {
    crm: [],
    sandbox: [],
    prescription: []
  };

  sourceResults.forEach((result) => {
    if (result.standardizedPath) {
      moduleOutputs[result.moduleKey].push(result.standardizedPath);
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
