import { promises as fs } from "node:fs";
import path from "node:path";
import { randomInt } from "node:crypto";

import { listPipelineRunSnapshots, type PipelineRunSnapshot } from "@/lib/server/pipeline/run-monitor";
import { resolveSupabaseConfig } from "@/lib/server/pipeline/run-queue";
import { listCompanySources, type CompanySourceItem } from "@/lib/server/shared/source-storage";
import {
  type IntakeSnapshot,
  intakeLabelFromStatus,
  intakeToneFromStatus,
  formatAnalysisWindow,
} from "@/lib/shared/intake-status";

type CompanyRegistryRow = {
  company_key: string;
  company_name: string;
  status: string;
};

export type CompanyOption = {
  companyKey: string;
  companyName: string;
  status: string;
};

type CreateCompanyInput = {
  companyName: string;
  status?: string | null;
  notes?: string | null;
};

export type Phase11CompanySnapshot = {
  company: CompanyOption;
  intake: IntakeSnapshot | null;
  sources: CompanySourceItem[];
  recentRuns: PipelineRunSnapshot[];
};

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");

function buildHeaders(config: { serviceRoleKey: string }) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function prettifyCompanyName(companyKey: string) {
  return companyKey
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function listCompanyKeysFromFilesystem(): Promise<string[]> {
  try {
    const entries = await fs.readdir(COMPANY_SOURCE_ROOT, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch {
    return [];
  }
}

async function listCompaniesFromRegistry(): Promise<CompanyOption[]> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return [];
  }

  const response = await fetch(
    `${config.url}/rest/v1/company_registry?select=company_key,company_name,status&order=company_name.asc`,
    {
      headers: buildHeaders(config),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return [];
  }

  const rows = (await response.json()) as CompanyRegistryRow[];
  return rows.map((row) => ({
    companyKey: row.company_key,
    companyName: row.company_name,
    status: row.status || "active",
  }));
}

function normalizeCompanyName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCompanyNameForSearch(value: string) {
  return normalizeCompanyName(value).toLowerCase();
}

function createRandomCompanyKey() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

async function ensureCompanyFolders(companyKey: string) {
  await fs.mkdir(path.join(COMPANY_SOURCE_ROOT, companyKey, "_onboarding"), { recursive: true });
}

export async function createCompany(input: CreateCompanyInput): Promise<CompanyOption> {
  const config = resolveSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 설정이 없어 회사를 등록할 수 없습니다.");
  }

  const companyName = normalizeCompanyName(input.companyName);
  if (!companyName) {
    throw new Error("회사 이름을 입력해 주세요.");
  }

  const normalizedName = normalizeCompanyNameForSearch(companyName);
  const existingCompanies = await listCompaniesFromRegistry();
  const duplicated = existingCompanies.find(
    (company) => normalizeCompanyNameForSearch(company.companyName) === normalizedName,
  );
  if (duplicated) {
    return duplicated;
  }

  const headers = buildHeaders(config);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const companyKey = createRandomCompanyKey();
    const response = await fetch(`${config.url}/rest/v1/company_registry`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        company_key: companyKey,
        company_name: companyName,
        company_name_normalized: normalizedName,
        status: input.status?.trim() || "active",
        notes: input.notes?.trim() || "",
      }),
    });

    if (response.ok) {
      await ensureCompanyFolders(companyKey);
      const rows = (await response.json()) as CompanyRegistryRow[];
      const row = rows[0];
      return {
        companyKey: row?.company_key ?? companyKey,
        companyName: row?.company_name ?? companyName,
        status: row?.status || "active",
      };
    }

    const message = await response.text();
    const duplicatedKey =
      response.status === 409 ||
      message.toLowerCase().includes("duplicate") ||
      message.toLowerCase().includes("unique");
    if (duplicatedKey) {
      continue;
    }

    throw new Error(`회사 등록에 실패했습니다. ${message || response.statusText}`);
  }

  throw new Error("회사 키 생성이 계속 겹쳐 회사 등록을 완료하지 못했습니다.");
}

export async function listCompanyOptions(): Promise<CompanyOption[]> {
  const [registryCompanies, fileCompanies] = await Promise.all([
    listCompaniesFromRegistry(),
    listCompanyKeysFromFilesystem(),
  ]);

  const merged = new Map<string, CompanyOption>();

  for (const company of registryCompanies) {
    merged.set(company.companyKey, company);
  }

  for (const companyKey of fileCompanies) {
    if (!merged.has(companyKey)) {
      merged.set(companyKey, {
        companyKey,
        companyName: prettifyCompanyName(companyKey),
        status: "filesystem",
      });
    }
  }

  return [...merged.values()].sort((left, right) => left.companyName.localeCompare(right.companyName, "ko"));
}

export async function resolveSelectedCompanyKey(requestedCompanyKey?: string | null) {
  const companies = await listCompanyOptions();
  const requested = requestedCompanyKey?.trim();
  const selectedCompanyKey =
    requested && companies.some((company) => company.companyKey === requested) ? requested : null;

  return {
    companies,
    selectedCompanyKey,
  };
}

export async function readIntakeSnapshot(companyKey: string): Promise<IntakeSnapshot | null> {
  const targetPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "_onboarding", "intake_result.latest.json");
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw) as IntakeSnapshot;
  } catch {
    return null;
  }
}

export async function getPhase11CompanySnapshot(companyKey: string): Promise<Phase11CompanySnapshot> {
  const companies = await listCompanyOptions();
  const company =
    companies.find((item) => item.companyKey === companyKey) ??
    ({
      companyKey,
      companyName: prettifyCompanyName(companyKey),
      status: "filesystem",
    } satisfies CompanyOption);

  const [intake, sourcesResult, recentRuns] = await Promise.all([
    readIntakeSnapshot(companyKey),
    listCompanySources(companyKey).catch(() => ({ companyKey, items: [] as CompanySourceItem[] })),
    listPipelineRunSnapshots(companyKey, 6).catch(() => [] as PipelineRunSnapshot[]),
  ]);

  return {
    company,
    intake,
    sources: sourcesResult.items,
    recentRuns,
  };
}

export { formatAnalysisWindow, intakeLabelFromStatus, intakeToneFromStatus };
