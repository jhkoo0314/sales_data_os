import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import { getSourceDefinition, type SourceKey } from "@/lib/shared/source-registry";
import { assertValidCompanyKey, normalizeMonthToken } from "@/lib/server/shared/source-storage";
import { parseTabularFile } from "@/lib/server/shared/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const MERGEABLE_SOURCE_KEYS: SourceKey[] = ["crm_activity", "sales", "target", "prescription"];

type MonthlySourceSummary = {
  sourceKey: SourceKey;
  monthCount: number;
  months: string[];
  files: string[];
  mergedTargetPath: string;
  mergedRowCount: number;
  monthlyRowCounts: Record<string, number>;
  monthlyTotalRowCount: number;
  mergedRowCountMatchesMonthlyTotal: boolean;
  status: "merged" | "skipped" | "no_monthly_files";
  message: string;
};

export type MonthlyMergeResult = {
  company_key: string;
  monthly_root: string;
  months_detected: string[];
  source_summaries: MonthlySourceSummary[];
  merged_sources: Record<string, number>;
  generated_at: string;
};

function companyRoot(companyKey: string): string {
  return path.join(COMPANY_SOURCE_ROOT, companyKey);
}

function monthlyRawRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "monthly_raw");
}

function onboardingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_onboarding");
}

function uploadIndexPath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "source_upload_index.json");
}

function latestMonthlyMergePath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "latest_monthly_merge_result.json");
}

function monthlyMergeHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:T]/g, "").slice(0, 15);
  return path.join(onboardingRoot(companyKey), `monthly_merge_result_${stamp}.json`);
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

async function readUploadIndex(companyKey: string): Promise<{
  uploads: Array<{ sourceKey: string; category: string; uploadedAt: string }>;
}> {
  const targetPath = uploadIndexPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return { uploads: [] };
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as { uploads: Array<{ sourceKey: string; category: string; uploadedAt: string }> };
}

function defaultExtensionForSource(sourceKey: SourceKey): ".xlsx" | ".csv" {
  return sourceKey === "prescription" ? ".csv" : ".xlsx";
}

function mergedTargetPath(companyKey: string, sourceKey: SourceKey): string {
  const definition = getSourceDefinition(sourceKey);
  if (!definition) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  return path.join(companyRoot(companyKey), definition.folder, `${definition.filenameBase}${defaultExtensionForSource(sourceKey)}`);
}

function monthlySourceMonthRoot(companyKey: string, monthToken: string): string {
  return path.join(monthlyRawRoot(companyKey), monthToken);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveMonthlyFilePath(companyKey: string, monthToken: string, sourceKey: SourceKey): Promise<string | null> {
  const definition = getSourceDefinition(sourceKey);
  if (!definition) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  const monthRoot = monthlySourceMonthRoot(companyKey, monthToken);
  if (!(await fileExists(monthRoot))) {
    return null;
  }

  const expectedExtension = defaultExtensionForSource(sourceKey);
  const exactFilename = `${definition.filenameBase}${expectedExtension}`.toLowerCase();
  const suffixedPattern = new RegExp(
    `^${escapeRegex(definition.filenameBase)}(?:[_-]?${escapeRegex(monthToken)})${escapeRegex(expectedExtension)}$`,
    "i"
  );

  const entries = await fs.readdir(monthRoot, { withFileTypes: true });
  const fileCandidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => {
      const lowered = name.toLowerCase();
      return lowered === exactFilename || suffixedPattern.test(lowered);
    })
    .sort((left, right) => {
      const leftExact = left.toLowerCase() === exactFilename ? 0 : 1;
      const rightExact = right.toLowerCase() === exactFilename ? 0 : 1;
      return leftExact - rightExact || left.localeCompare(right);
    });

  if (fileCandidates.length === 0) {
    return null;
  }

  return path.join(monthRoot, fileCandidates[0]);
}

function csvEscape(value: string): string {
  const normalized = String(value ?? "");
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }
  return normalized;
}

async function writeMergedRows(filePath: string, headers: string[], rows: Record<string, string>[]): Promise<void> {
  await ensureDir(path.dirname(filePath));

  if (filePath.toLowerCase().endsWith(".csv")) {
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(","))
    ];
    await fs.writeFile(filePath, lines.join("\n"), "utf8");
    return;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filePath);
}

async function readMonthDirectories(companyKey: string): Promise<string[]> {
  const root = monthlyRawRoot(companyKey);
  if (!(await fileExists(root))) {
    return [];
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => normalizeMonthToken(entry.name))
    .filter((entry): entry is string => Boolean(entry))
    .sort();
}

async function shouldMerge(monthlyPaths: string[], targetPath: string): Promise<boolean> {
  if (!(await fileExists(targetPath))) {
    return true;
  }

  const targetStat = await fs.stat(targetPath);
  for (const monthlyPath of monthlyPaths) {
    const sourceStat = await fs.stat(monthlyPath);
    if (sourceStat.mtimeMs > targetStat.mtimeMs) {
      return true;
    }
  }

  return false;
}

async function shouldPreferGeneralUpload(companyKey: string, sourceKey: SourceKey): Promise<boolean> {
  const uploadIndex = await readUploadIndex(companyKey);
  const latestGeneralUpload =
    uploadIndex.uploads
      .filter((upload) => upload.sourceKey === sourceKey && upload.category === "general")
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0] ?? null;

  const latestMonthlyUpload =
    uploadIndex.uploads
      .filter((upload) => upload.sourceKey === sourceKey && upload.category === "monthly")
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))[0] ?? null;

  if (!latestGeneralUpload) {
    return false;
  }

  if (!latestMonthlyUpload) {
    return true;
  }

  return latestGeneralUpload.uploadedAt >= latestMonthlyUpload.uploadedAt;
}

export async function mergeMonthlyRawSources(input: {
  companyKey: string;
  sourceKeys?: SourceKey[];
}): Promise<MonthlyMergeResult> {
  assertValidCompanyKey(input.companyKey);

  const monthsDetected = await readMonthDirectories(input.companyKey);
  const activeSourceKeys = input.sourceKeys?.filter((sourceKey) => MERGEABLE_SOURCE_KEYS.includes(sourceKey)) ?? MERGEABLE_SOURCE_KEYS;
  const generatedAt = new Date().toISOString();

  const sourceSummaries = await Promise.all(
    activeSourceKeys.map(async (sourceKey) => {
      const monthPaths = await Promise.all(
        monthsDetected.map(async (monthToken) => {
          return resolveMonthlyFilePath(input.companyKey, monthToken, sourceKey);
        })
      );
      const availablePaths = monthPaths.filter((filePath): filePath is string => Boolean(filePath));
      const summaryMonths = availablePaths
        .map((filePath) => normalizeMonthToken(path.basename(path.dirname(filePath))))
        .filter((value): value is string => Boolean(value));
      const targetPath = mergedTargetPath(input.companyKey, sourceKey);

      if (availablePaths.length === 0) {
        return {
          sourceKey,
          monthCount: 0,
          months: [],
          files: [],
          mergedTargetPath: toPosixRelativePath(targetPath),
          mergedRowCount: 0,
          monthlyRowCounts: {},
          monthlyTotalRowCount: 0,
          mergedRowCountMatchesMonthlyTotal: true,
          status: "no_monthly_files",
          message: "병합할 월별 raw 파일이 없습니다."
        } satisfies MonthlySourceSummary;
      }

      if (await shouldPreferGeneralUpload(input.companyKey, sourceKey)) {
        const rowCount = await fileExists(targetPath)
          ? (await parseTabularFile(targetPath)).rows.length
          : 0;
        return {
          sourceKey,
          monthCount: summaryMonths.length,
          months: summaryMonths,
          files: availablePaths.map(toPosixRelativePath),
          mergedTargetPath: toPosixRelativePath(targetPath),
          mergedRowCount: rowCount,
          monthlyRowCounts: {},
          monthlyTotalRowCount: 0,
          mergedRowCountMatchesMonthlyTotal: true,
          status: "skipped",
          message: "일반 업로드 raw가 더 우선이라 월별 병합을 건너뜁니다."
        } satisfies MonthlySourceSummary;
      }

      if (!(await shouldMerge(availablePaths, targetPath))) {
        const rowCount = await fileExists(targetPath)
          ? (await parseTabularFile(targetPath)).rows.length
          : 0;
        return {
          sourceKey,
          monthCount: summaryMonths.length,
          months: summaryMonths,
          files: availablePaths.map(toPosixRelativePath),
          mergedTargetPath: toPosixRelativePath(targetPath),
          mergedRowCount: rowCount,
          monthlyRowCounts: {},
          monthlyTotalRowCount: 0,
          mergedRowCountMatchesMonthlyTotal: true,
          status: "skipped",
          message: "기존 merged raw가 더 최신이라 월별 병합을 다시 수행하지 않았습니다."
        } satisfies MonthlySourceSummary;
      }

      const mergedHeaders: string[] = [];
      const mergedRows: Record<string, string>[] = [];
      const monthlyRowCounts: Record<string, number> = {};

      for (const filePath of availablePaths) {
        const { headers, rows } = await parseTabularFile(filePath);
        monthlyRowCounts[toPosixRelativePath(filePath)] = rows.length;
        headers.forEach((header) => {
          if (!mergedHeaders.includes(header)) {
            mergedHeaders.push(header);
          }
        });
        rows.forEach((row) => {
          const normalizedRow = mergedHeaders.reduce<Record<string, string>>((acc, header) => {
            acc[header] = row[header] ?? "";
            return acc;
          }, {});
          mergedRows.push(normalizedRow);
        });
      }

      await writeMergedRows(targetPath, mergedHeaders, mergedRows);
      const monthlyTotalRowCount = Object.values(monthlyRowCounts).reduce((sum, count) => sum + count, 0);

      return {
        sourceKey,
        monthCount: summaryMonths.length,
        months: summaryMonths,
        files: availablePaths.map(toPosixRelativePath),
        mergedTargetPath: toPosixRelativePath(targetPath),
        mergedRowCount: mergedRows.length,
        monthlyRowCounts,
        monthlyTotalRowCount,
        mergedRowCountMatchesMonthlyTotal: monthlyTotalRowCount === mergedRows.length,
        status: "merged",
        message: "월별 raw를 병합해 공식 raw 경로를 다시 생성했습니다."
      } satisfies MonthlySourceSummary;
    })
  );

  const result: MonthlyMergeResult = {
    company_key: input.companyKey,
    monthly_root: toPosixRelativePath(monthlyRawRoot(input.companyKey)),
    months_detected: monthsDetected,
    source_summaries: sourceSummaries,
    merged_sources: sourceSummaries
      .filter((summary) => summary.status === "merged")
      .reduce<Record<string, number>>((acc, summary) => {
        acc[summary.sourceKey] = summary.monthCount;
        return acc;
      }, {}),
    generated_at: generatedAt
  };

  await ensureDir(onboardingRoot(input.companyKey));
  await fs.writeFile(latestMonthlyMergePath(input.companyKey), JSON.stringify(result, null, 2), "utf8");
  await fs.writeFile(monthlyMergeHistoryPath(input.companyKey, generatedAt), JSON.stringify(result, null, 2), "utf8");

  return result;
}
