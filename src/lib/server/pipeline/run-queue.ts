import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";

export const SUPPORTED_EXECUTION_MODES = ["integrated_full"] as const;
export type SupportedExecutionMode = (typeof SUPPORTED_EXECUTION_MODES)[number];

export type QueueRunInput = {
  companyKey: string;
  executionMode?: string | null;
  runKey?: string | null;
};

export type QueuedRun = {
  id: string;
  run_key: string;
  company_key: string;
  execution_mode: string;
  run_status: string;
  created_at: string;
};

export function resolveSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  ).trim();
  if (!url || !serviceRoleKey) {
    return null;
  }
  return { url, serviceRoleKey };
}

function normalizeExecutionMode(value: string | null | undefined): SupportedExecutionMode {
  const mode = (value ?? "").trim() || "integrated_full";
  if ((SUPPORTED_EXECUTION_MODES as readonly string[]).includes(mode)) {
    return mode as SupportedExecutionMode;
  }
  throw new Error(`지원하지 않는 execution_mode 입니다: ${mode}`);
}

function generateRunKey(companyKey: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `run_${companyKey}_${stamp}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function enqueuePipelineRun(input: QueueRunInput): Promise<QueuedRun> {
  assertValidCompanyKey(input.companyKey);
  const mode = normalizeExecutionMode(input.executionMode);
  const runKey = (input.runKey ?? "").trim() || generateRunKey(input.companyKey);
  const config = resolveSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 설정이 없어 run을 접수할 수 없습니다.");
  }

  const response = await fetch(`${config.url}/rest/v1/pipeline_runs`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify({
      run_key: runKey,
      company_key: input.companyKey,
      execution_mode: mode,
      run_status: "pending"
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`run 접수 실패(${response.status}): ${message || "unknown error"}`);
  }

  const rows = (await response.json()) as QueuedRun[];
  const row = rows[0];
  if (!row?.id) {
    throw new Error("run 접수 응답에 id가 없습니다.");
  }
  return row;
}
