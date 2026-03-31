import { promises as fs } from "node:fs";
import path from "node:path";

import { StandardizedPayload, type LookupRow } from "@/lib/server/kpi/types";

const STANDARDIZED_ROOT = path.join(process.cwd(), "data", "standardized");
const VALIDATION_ROOT = path.join(process.cwd(), "data", "validation");
export type KpiModuleKey = "crm" | "sandbox" | "prescription" | "territory" | "radar";

export function standardizedCompanyRoot(companyKey: string): string {
  return path.join(STANDARDIZED_ROOT, companyKey);
}

export function validationCompanyRoot(companyKey: string): string {
  return path.join(VALIDATION_ROOT, companyKey);
}

export function validationMetaRoot(companyKey: string): string {
  return path.join(validationCompanyRoot(companyKey), "_meta");
}

export function latestKpiPath(companyKey: string): string {
  return path.join(validationMetaRoot(companyKey), "latest_kpi_result.json");
}

export function kpiHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:T]/g, "").slice(0, 15);
  return path.join(validationMetaRoot(companyKey), `kpi_result_${stamp}.json`);
}

export function moduleRoot(companyKey: string, moduleKey: KpiModuleKey): string {
  return path.join(validationCompanyRoot(companyKey), moduleKey);
}

export function moduleResultAssetPath(companyKey: string, moduleKey: KpiModuleKey): string {
  return path.join(moduleRoot(companyKey, moduleKey), `${moduleKey}_result_asset.json`);
}

export async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

export async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

export async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function toPosixRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

export function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

export function toNumber(value: unknown, fallback = 0): number {
  const text = String(value ?? "").replace(/,/g, "").replace(/[^0-9.\-]/g, "");
  if (!text) {
    return fallback;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toMonthToken(value: unknown): string {
  const text = cleanText(value).replace(/[^0-9]/g, "");
  if (text.length >= 6) {
    return text.slice(0, 6);
  }
  return "";
}

export function toDateToken(value: unknown): string {
  const text = cleanText(value);
  if (!text) {
    return "";
  }
  const normalized = text.replace(/[./]/g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) {
    return "";
  }
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function clip01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function toPct(value01: number): number {
  return Number((clip01(value01) * 100).toFixed(1));
}

export function avg(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export async function readStandardizedPayload(
  companyKey: string,
  moduleKey: string,
  filename: string
): Promise<StandardizedPayload | null> {
  const filePath = path.join(standardizedCompanyRoot(companyKey), moduleKey, filename);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<StandardizedPayload>(filePath);
}

export async function readLookupRows(companyKey: string): Promise<{
  byAccountName: Map<string, LookupRow>;
  byRepName: Map<string, LookupRow>;
}> {
  const assignment = await readStandardizedPayload(
    companyKey,
    "crm",
    "standardized_crm_account_assignment.json"
  );
  const byAccountName = new Map<string, LookupRow>();
  const byRepName = new Map<string, LookupRow>();
  for (const row of assignment?.rows ?? []) {
    const normalized: LookupRow = {
      accountId: cleanText(row.account_id),
      accountName: cleanText(row.account_name),
      repId: cleanText(row.rep_id),
      repName: cleanText(row.rep_name),
      branchId: cleanText(row.branch_id),
      branchName: cleanText(row.branch_name)
    };
    if (normalized.accountName) {
      byAccountName.set(normalized.accountName, normalized);
    }
    if (normalized.repName) {
      byRepName.set(normalized.repName, normalized);
    }
  }
  return { byAccountName, byRepName };
}
