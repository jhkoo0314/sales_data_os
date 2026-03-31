import { promises as fs } from "node:fs";
import path from "node:path";

import { SOURCE_DEFINITIONS, SourceKey } from "@/lib/source-registry";
import { COLUMN_ALIASES, PREFERRED_SHEET_NAMES, REQUIRED_COLUMNS } from "@/lib/server/source-schema";
import { assertValidCompanyKey, normalizeMonthToken } from "@/lib/server/source-storage";
import { isSupportedTabularFile, readTabularHeaders } from "@/lib/server/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");

type IntakeStatus = "ready" | "ready_with_fixes" | "needs_review" | "blocked";

type ExecutionModeKey = "crm_only" | "sandbox" | "integrated" | "prescription";

type IntakeFinding = {
  level: "info" | "warn" | "fail";
  sourceKey?: SourceKey;
  message: string;
};

type IntakePackage = {
  sourceKey: SourceKey;
  status: "saved" | "missing" | "review";
  message: string;
  files: string[];
};

type ColumnReview = {
  requiredColumn: string;
  status: "matched" | "candidate" | "missing" | "not_checked";
  matchedHeader: string | null;
  candidateHeaders: string[];
};

type PeriodCoverage = {
  sourceKey: SourceKey;
  startMonth: string | null;
  endMonth: string | null;
  monthCount: number;
  basis: "monthly_folder" | "csv_values" | "unknown";
};

export type IntakeAnalysisResult = {
  company_key: string;
  execution_mode: string;
  status: IntakeStatus;
  ready_for_adapter: boolean;
  findings: IntakeFinding[];
  fixes: string[];
  suggestions: string[];
  timing_alerts: string[];
  period_coverages: PeriodCoverage[];
  analysis_basis_sources: SourceKey[];
  analysis_start_month: string | null;
  analysis_end_month: string | null;
  analysis_month_count: number;
  analysis_summary_message: string;
  proceed_confirmation_message: string | null;
  packages: IntakePackage[];
  generated_at: string;
};

type IntakeConfirmation = {
  company_key: string;
  execution_mode: string;
  confirmed: boolean;
  confirmed_at: string;
};

type SourceInspection = {
  sourceKey: SourceKey;
  files: string[];
  csvHeaders: string[];
  columnReviews: ColumnReview[];
  periodCoverage: PeriodCoverage;
  hasUnsupportedStructuredFile: boolean;
};

type StoredIntakePackage = IntakePackage & {
  company_key: string;
  execution_mode: string;
  required: boolean;
  latest_uploaded_at: string | null;
  column_reviews: ColumnReview[];
  period_coverage: PeriodCoverage;
  generated_at: string;
};

function companyRoot(companyKey: string): string {
  return path.join(COMPANY_SOURCE_ROOT, companyKey);
}

function onboardingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_onboarding");
}

function latestAnalysisPath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "latest_intake_result.json");
}

function latestConfirmationPath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "latest_intake_confirmation.json");
}

function intakeHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:T]/g, "").slice(0, 15);
  return path.join(onboardingRoot(companyKey), `intake_result_${stamp}.json`);
}

function onboardingPackagePath(companyKey: string, sourceKey: SourceKey): string {
  return path.join(onboardingRoot(companyKey), `${sourceKey}_onboarding_package.json`);
}

function normalizeHeaderName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function resolveExecutionModeKey(executionMode: string | null | undefined): ExecutionModeKey {
  const normalized = (executionMode ?? "integrated").toLowerCase();

  if (normalized.includes("crm")) {
    return "crm_only";
  }
  if (normalized.includes("sandbox")) {
    return "sandbox";
  }
  if (normalized.includes("prescription")) {
    return "prescription";
  }

  return "integrated";
}

function requiredSourcesForMode(mode: ExecutionModeKey): SourceKey[] {
  switch (mode) {
    case "crm_only":
      return ["crm_activity", "crm_rep_master", "crm_account_assignment"];
    case "sandbox":
      return ["crm_activity", "crm_rep_master", "crm_account_assignment", "sales", "target"];
    case "prescription":
      return ["prescription"];
    case "integrated":
    default:
      return ["crm_activity", "crm_rep_master", "crm_account_assignment", "sales", "target", "prescription"];
  }
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
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

async function readCsvHeaders(filePath: string): Promise<string[]> {
  return readTabularHeaders(filePath);
}

function detectMonthFromFilePath(filePath: string): string | null {
  const tokens = filePath.match(/\d{6}/g) ?? [];
  for (const token of tokens) {
    const normalized = normalizeMonthToken(token);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function monthRangeSummary(months: string[]): { start: string | null; end: string | null; count: number } {
  const sorted = [...new Set(months)].sort();
  return {
    start: sorted[0] ?? null,
    end: sorted.at(-1) ?? null,
    count: sorted.length
  };
}

function intersectMonths(coverages: PeriodCoverage[]): string[] {
  const monthSets = coverages
    .map((coverage) => expandCoverageMonths(coverage))
    .filter((months) => months.length > 0);

  if (monthSets.length === 0) {
    return [];
  }

  return [...monthSets.reduce((acc, months) => new Set(months.filter((month) => acc.has(month))), new Set(monthSets[0]))].sort();
}

function expandCoverageMonths(coverage: PeriodCoverage): string[] {
  if (!coverage.startMonth || !coverage.endMonth) {
    return [];
  }

  const months: string[] = [];
  let cursor = coverage.startMonth;
  while (cursor <= coverage.endMonth) {
    months.push(cursor);
    const year = Number(cursor.slice(0, 4));
    const month = Number(cursor.slice(4, 6));
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    cursor = `${nextYear}${String(nextMonth).padStart(2, "0")}`;
  }

  return months;
}

function hasColumn(headers: string[], expected: string): boolean {
  const normalizedHeaders = headers.map(normalizeHeaderName);
  const aliases = COLUMN_ALIASES[expected] ?? [expected];
  return aliases.some((alias) => normalizedHeaders.includes(normalizeHeaderName(alias)));
}

function candidateHeadersForColumn(headers: string[], expected: string): string[] {
  const aliases = [...(COLUMN_ALIASES[expected] ?? []), expected]
    .map(normalizeHeaderName)
    .filter(Boolean);

  return headers.filter((header) => {
    const normalizedHeader = normalizeHeaderName(header);
    return aliases.some((alias) => normalizedHeader.includes(alias) || alias.includes(normalizedHeader));
  });
}

function buildColumnReviews(sourceKey: SourceKey, headers: string[], hasUnsupportedStructuredFile: boolean): ColumnReview[] {
  const requiredColumns = REQUIRED_COLUMNS[sourceKey];
  if (requiredColumns.length === 0) {
    return [];
  }

  return requiredColumns.map((requiredColumn) => {
    const aliases = COLUMN_ALIASES[requiredColumn] ?? [requiredColumn];
    const matchedHeader =
      headers.find((header) =>
        aliases.some((alias) => normalizeHeaderName(header) === normalizeHeaderName(alias))
      ) ?? null;

    if (matchedHeader) {
      return {
        requiredColumn,
        status: "matched",
        matchedHeader,
        candidateHeaders: []
      };
    }

    const candidateHeaders = candidateHeadersForColumn(headers, requiredColumn);
    if (candidateHeaders.length > 0) {
      return {
        requiredColumn,
        status: "candidate",
        matchedHeader: null,
        candidateHeaders
      };
    }

    return {
      requiredColumn,
      status: hasUnsupportedStructuredFile && headers.length === 0 ? "not_checked" : "missing",
      matchedHeader: null,
      candidateHeaders: []
    };
  });
}

async function inspectSource(companyKey: string, sourceKey: SourceKey): Promise<SourceInspection> {
  const definition = SOURCE_DEFINITIONS.find((item) => item.sourceKey === sourceKey);
  if (!definition) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  const sourceRoot = path.join(companyRoot(companyKey), definition.folder);
  const files = (await listFilesRecursively(sourceRoot)).filter((filePath) => {
    const basename = path.basename(filePath).toLowerCase();
    return basename.includes(definition.sourceKey) || basename.includes(definition.filenameBase);
  });

  const csvHeaders: string[] = [];
  let hasUnsupportedStructuredFile = false;
  const monthTokens: string[] = [];

  for (const filePath of files) {
    const monthToken = detectMonthFromFilePath(filePath);
    if (monthToken) {
      monthTokens.push(monthToken);
    }

    if (isSupportedTabularFile(filePath)) {
      const headers = await readTabularHeaders(filePath, PREFERRED_SHEET_NAMES[sourceKey]);
      csvHeaders.push(...headers);
      continue;
    }

    hasUnsupportedStructuredFile = true;
  }

  const range = monthRangeSummary(monthTokens);
  const basis: PeriodCoverage["basis"] =
    monthTokens.length > 0 ? "monthly_folder" : csvHeaders.length > 0 ? "csv_values" : "unknown";

  return {
    sourceKey,
    files,
    csvHeaders,
    columnReviews: buildColumnReviews(sourceKey, csvHeaders, hasUnsupportedStructuredFile),
    hasUnsupportedStructuredFile,
    periodCoverage: {
      sourceKey,
      startMonth: range.start,
      endMonth: range.end,
      monthCount: range.count,
      basis
    }
  };
}

function packageStatusForInspection(required: boolean, inspection: SourceInspection): IntakePackage["status"] {
  if (inspection.files.length === 0) {
    return required ? "missing" : "review";
  }

  if (inspection.hasUnsupportedStructuredFile) {
    return "review";
  }

  return "saved";
}

function packageMessage(required: boolean, inspection: SourceInspection): string {
  if (inspection.files.length === 0) {
    return required ? "필수 입력 파일이 아직 저장되지 않았습니다." : "선택 입력 파일이 아직 없습니다.";
  }

  if (inspection.hasUnsupportedStructuredFile) {
    return "지원하지 않는 형식의 파일이 포함되어 있어 csv/xlsx 기준으로 다시 확인이 필요합니다.";
  }

  return "입력 파일이 저장되어 있고 기본 점검 대상에 포함됩니다.";
}

export async function analyzeIntake(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<IntakeAnalysisResult> {
  assertValidCompanyKey(input.companyKey);

  const executionMode = input.executionMode ?? "integrated";
  const modeKey = resolveExecutionModeKey(executionMode);
  const requiredSources = requiredSourcesForMode(modeKey);

  const findings: IntakeFinding[] = [];
  const fixes: string[] = [];
  const suggestions: string[] = [];
  const timingAlerts: string[] = [];

  const inspections = await Promise.all(
    SOURCE_DEFINITIONS.map((definition) => inspectSource(input.companyKey, definition.sourceKey))
  );
  const requiredInspections = inspections.filter((inspection) => requiredSources.includes(inspection.sourceKey));
  const periodCoverages = requiredInspections.map((inspection) => inspection.periodCoverage);
  const packages: IntakePackage[] = inspections.map((inspection) => ({
    sourceKey: inspection.sourceKey,
    status: packageStatusForInspection(requiredSources.includes(inspection.sourceKey), inspection),
    message: packageMessage(requiredSources.includes(inspection.sourceKey), inspection),
    files: inspection.files.map((filePath) => path.relative(process.cwd(), filePath).split(path.sep).join("/"))
  }));

  let blocked = false;
  let needsReview = false;
  let autoFixSuggested = false;

  for (const inspection of requiredInspections) {
    if (inspection.files.length === 0) {
      blocked = true;
      findings.push({
        level: "fail",
        sourceKey: inspection.sourceKey,
        message: `${inspection.sourceKey} 필수 입력이 없습니다.`
      });
      continue;
    }

    for (const review of inspection.columnReviews) {
      if (review.status === "candidate") {
        autoFixSuggested = true;
        fixes.push(
          `${inspection.sourceKey}의 ${review.requiredColumn}는 후보 컬럼 ${review.candidateHeaders.join(", ")} 기준으로 매핑 보조가 필요합니다.`
        );
        findings.push({
          level: "warn",
          sourceKey: inspection.sourceKey,
          message: `${inspection.sourceKey}의 ${review.requiredColumn}는 후보 컬럼이 있어 자동보정 또는 사용자 확인 후 계속 진행할 수 있습니다.`
        });
      }

      if (review.status === "missing") {
        needsReview = true;
        findings.push({
          level: "warn",
          sourceKey: inspection.sourceKey,
          message: `${inspection.sourceKey}에서 ${review.requiredColumn} 후보를 찾지 못했습니다. 컬럼 매핑 검토가 필요합니다.`
        });
      }

      if (review.status === "not_checked") {
        needsReview = true;
        suggestions.push(
          `${inspection.sourceKey}는 지원 형식 확인이 필요해 필수 컬럼 점검을 사람 검토로 넘깁니다.`
        );
      }
    }

    if (inspection.hasUnsupportedStructuredFile) {
      needsReview = true;
      suggestions.push(`${inspection.sourceKey}에 csv/xlsx 외 형식이 포함되어 있어 파일 형식 정리가 필요합니다.`);
      findings.push({
        level: "warn",
        sourceKey: inspection.sourceKey,
        message: `${inspection.sourceKey}는 저장되었지만 지원하지 않는 형식이 포함되어 있어 csv/xlsx 기준으로 다시 확인이 필요합니다.`
      });
    }
  }

  const coverageWithMonths = periodCoverages.filter((coverage) => coverage.monthCount > 0);
  const commonMonths = intersectMonths(coverageWithMonths);
  const commonRange = monthRangeSummary(commonMonths);

  if (coverageWithMonths.length > 1) {
    const uniqueRanges = new Set(coverageWithMonths.map((coverage) => `${coverage.startMonth}-${coverage.endMonth}`));
    if (uniqueRanges.size > 1) {
      const message =
        commonRange.count > 0
          ? `일부 입력 데이터의 기간이 서로 다르지만, 공통 분석 구간 ${commonRange.start} ~ ${commonRange.end} 기준으로 진행 가능합니다.`
          : "입력 데이터 간 공통 분석 구간을 찾지 못해 사람 확인이 필요합니다.";
      timingAlerts.push(message);
      suggestions.push(message);
      needsReview = true;
    }
  }

  const analysisBasisSources = coverageWithMonths.map((coverage) => coverage.sourceKey);
  const readyForAdapter = !blocked && !needsReview;

  let status: IntakeStatus = "ready";
  if (blocked) {
    status = "blocked";
  } else if (needsReview) {
    status = "needs_review";
  } else if (fixes.length > 0 || autoFixSuggested) {
    status = "ready_with_fixes";
  }

  const analysisSummaryMessage = blocked
    ? "필수 입력 또는 구조 검증에서 차단 이슈가 있어 아직 다음 단계로 진행할 수 없습니다."
    : status === "needs_review"
      ? suggestions[0] ?? "입력은 저장되어 있지만 컬럼 구조나 기간 차이에 대한 검토가 필요합니다."
      : status === "ready_with_fixes"
        ? fixes[0] ?? "입력은 저장되어 있고 자동보정 후보가 있어 다음 단계로 연결할 수 있습니다."
        : "필수 입력이 저장되어 있고 기본 점검 기준으로 다음 단계 진행이 가능합니다.";

  const proceedConfirmationMessage =
    status === "needs_review"
      ? "기간 차이 또는 확인 필요 항목이 있습니다. 내용을 검토한 뒤 계속 진행 여부를 확정해주세요."
      : null;

  const generatedAt = new Date().toISOString();

  const result: IntakeAnalysisResult = {
    company_key: input.companyKey,
    execution_mode: executionMode,
    status,
    ready_for_adapter: readyForAdapter,
    findings,
    fixes,
    suggestions,
    timing_alerts: timingAlerts,
    period_coverages: periodCoverages,
    analysis_basis_sources: analysisBasisSources,
    analysis_start_month: commonRange.start,
    analysis_end_month: commonRange.end,
    analysis_month_count: commonRange.count,
    analysis_summary_message: analysisSummaryMessage,
    proceed_confirmation_message: proceedConfirmationMessage,
    packages,
    generated_at: generatedAt
  };

  await ensureDir(onboardingRoot(input.companyKey));
  await fs.writeFile(latestAnalysisPath(input.companyKey), JSON.stringify(result, null, 2), "utf8");
  await fs.writeFile(intakeHistoryPath(input.companyKey, generatedAt), JSON.stringify(result, null, 2), "utf8");

  await Promise.all(
    inspections.map(async (inspection) => {
      const packagePayload: StoredIntakePackage = {
        company_key: input.companyKey,
        execution_mode: executionMode,
        sourceKey: inspection.sourceKey,
        status: packageStatusForInspection(requiredSources.includes(inspection.sourceKey), inspection),
        message: packageMessage(requiredSources.includes(inspection.sourceKey), inspection),
        files: inspection.files.map((filePath) => path.relative(process.cwd(), filePath).split(path.sep).join("/")),
        required: requiredSources.includes(inspection.sourceKey),
        latest_uploaded_at:
          inspection.files.length > 0
            ? (await fs.stat(inspection.files[0])).mtime.toISOString()
            : null,
        column_reviews: inspection.columnReviews,
        period_coverage: inspection.periodCoverage,
        generated_at: generatedAt
      };

      await fs.writeFile(
        onboardingPackagePath(input.companyKey, inspection.sourceKey),
        JSON.stringify(packagePayload, null, 2),
        "utf8"
      );
    })
  );

  return result;
}

export async function readLatestIntakeResult(companyKey: string): Promise<IntakeAnalysisResult | null> {
  assertValidCompanyKey(companyKey);

  const targetPath = latestAnalysisPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return null;
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as IntakeAnalysisResult;
}

export async function saveIntakeConfirmation(input: {
  companyKey: string;
  executionMode?: string | null;
  confirmed: boolean;
}): Promise<IntakeConfirmation> {
  assertValidCompanyKey(input.companyKey);
  const payload: IntakeConfirmation = {
    company_key: input.companyKey,
    execution_mode: input.executionMode ?? "integrated",
    confirmed: input.confirmed,
    confirmed_at: new Date().toISOString()
  };

  await ensureDir(onboardingRoot(input.companyKey));
  await fs.writeFile(latestConfirmationPath(input.companyKey), JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

export async function readLatestIntakeConfirmation(companyKey: string): Promise<IntakeConfirmation | null> {
  assertValidCompanyKey(companyKey);

  const targetPath = latestConfirmationPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return null;
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as IntakeConfirmation;
}
