import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import { getSourceDefinition, type SourceKey } from "@/lib/source-registry";
import { assertValidCompanyKey, normalizeMonthToken } from "@/lib/server/source-storage";
import { parseTabularFile } from "@/lib/server/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const MERGEABLE_SOURCE_KEYS: SourceKey[] = ["crm_activity", "sales", "target", "prescription"];

type MonthlySourceSummary = {
  sourceKey: SourceKey;
  monthCount: number;
  months: string[];
  files: string[];
  mergedTargetPath: string;
  mergedRowCount: number;
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

function monthlyFilePath(companyKey: string, monthToken: string, sourceKey: SourceKey): string {
  const definition = getSourceDefinition(sourceKey);
  if (!definition) {
    throw new Error(`Unknown source key: ${sourceKey}`);
  }

  return path.join(monthlyRawRoot(companyKey), monthToken, `${definition.filenameBase}${defaultExtensionForSource(sourceKey)}`);
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
          const filePath = monthlyFilePath(input.companyKey, monthToken, sourceKey);
          return (await fileExists(filePath)) ? filePath : null;
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
          status: "no_monthly_files",
          message: "병합할 월별 raw 파일이 없습니다."
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
          status: "skipped",
          message: "기존 merged raw가 더 최신이라 월별 병합을 다시 수행하지 않았습니다."
        } satisfies MonthlySourceSummary;
      }

      const mergedHeaders: string[] = [];
      const mergedRows: Record<string, string>[] = [];

      for (const filePath of availablePaths) {
        const { headers, rows } = await parseTabularFile(filePath);
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

      return {
        sourceKey,
        monthCount: summaryMonths.length,
        months: summaryMonths,
        files: availablePaths.map(toPosixRelativePath),
        mergedTargetPath: toPosixRelativePath(targetPath),
        mergedRowCount: mergedRows.length,
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
