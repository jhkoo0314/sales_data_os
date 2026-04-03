import { resolveSupabaseConfig } from "@/lib/server/pipeline/run-queue";

type PipelineRunRow = {
  id: string;
  run_key: string;
  company_key: string;
  execution_mode: string;
  run_status: string;
  overall_status: string | null;
  overall_score: number | null;
  result_summary: {
    total_duration_ms?: number;
    summary_by_module?: Record<string, unknown>;
  } | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at?: string | null;
};

type PipelineStepRow = {
  id: string;
  run_id: string;
  step_name: string;
  step_order: number;
  step_status: string;
  quality_status: string | null;
  output_summary: Record<string, unknown>;
  duration_ms: number;
  finished_at: string | null;
  created_at?: string | null;
};

export type PipelineStepSnapshot = {
  id: string;
  stepName: string;
  stepLabel: string;
  stepOrder: number;
  stepStatus: string;
  qualityStatus: string | null;
  tone: "ready" | "running" | "pass" | "warn" | "fail" | "approved" | "generated";
  statusLabel: string;
  description: string;
  durationMs: number;
  finishedAt: string | null;
};

export type PipelineRunSnapshot = {
  id: string;
  runKey: string;
  companyKey: string;
  executionMode: string;
  runStatus: string;
  overallStatus: string | null;
  overallScore: number | null;
  tone: "ready" | "running" | "pass" | "warn" | "fail" | "approved" | "generated";
  statusLabel: string;
  queueLabel: string;
  explanation: string;
  progressPercent: number;
  currentStepLabel: string;
  totalDurationMs: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps: PipelineStepSnapshot[];
  errorMessage: string | null;
};

const STEP_LABELS: Record<string, string> = {
  crm: "CRM 검증",
  prescription: "Prescription 검증",
  sandbox: "Sandbox 검증",
  territory: "Territory 검증",
  radar: "RADAR 검증",
  builder: "Builder 렌더",
};

function buildHeaders(config: { serviceRoleKey: string }) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapStepLabel(stepName: string): string {
  return STEP_LABELS[stepName] ?? stepName;
}

function mapStepTone(row: PipelineStepRow): PipelineStepSnapshot["tone"] {
  if (row.quality_status === "fail" || row.step_status === "failed") {
    return "fail";
  }
  if (row.quality_status === "warn" || row.step_status === "partial") {
    return "warn";
  }
  if (row.step_status === "skipped") {
    return "ready";
  }
  return "pass";
}

function mapStepStatusLabel(row: PipelineStepRow): string {
  if (row.step_status === "failed") {
    return "FAIL";
  }
  if (row.step_status === "partial") {
    return "WARN";
  }
  if (row.step_status === "skipped") {
    return "SKIP";
  }
  return "PASS";
}

function buildStepDescription(row: PipelineStepRow): string {
  const summary = row.output_summary ?? {};
  const noteCandidate = [
    summary.reasoning_note,
    summary.message,
    summary.summary_text,
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  if (typeof noteCandidate === "string") {
    return noteCandidate;
  }
  if (row.step_status === "failed") {
    return `${mapStepLabel(row.step_name)} 단계에서 실행 오류가 발생했습니다.`;
  }
  if (row.step_status === "partial") {
    return `${mapStepLabel(row.step_name)} 단계는 경고와 함께 완료되었습니다.`;
  }
  if (row.step_status === "skipped") {
    return `${mapStepLabel(row.step_name)} 단계는 이번 실행에서 건너뛰었습니다.`;
  }
  return `${mapStepLabel(row.step_name)} 단계가 정상 완료되었습니다.`;
}

function toStepSnapshot(row: PipelineStepRow): PipelineStepSnapshot {
  return {
    id: row.id,
    stepName: row.step_name,
    stepLabel: mapStepLabel(row.step_name),
    stepOrder: row.step_order,
    stepStatus: row.step_status,
    qualityStatus: row.quality_status,
    tone: mapStepTone(row),
    statusLabel: mapStepStatusLabel(row),
    description: buildStepDescription(row),
    durationMs: row.duration_ms,
    finishedAt: formatDateTime(row.finished_at),
  };
}

function mapRunTone(row: PipelineRunRow): PipelineRunSnapshot["tone"] {
  if (row.run_status === "failed") {
    return "fail";
  }
  if (row.run_status === "running") {
    return "running";
  }
  if (row.run_status === "pending") {
    return "ready";
  }
  if (row.overall_status === "fail") {
    return "fail";
  }
  if (row.overall_status === "warn") {
    return "warn";
  }
  if (row.overall_status === "pass") {
    return "approved";
  }
  return "ready";
}

function mapRunStatusLabel(row: PipelineRunRow): string {
  if (row.run_status === "pending") {
    return "PENDING";
  }
  if (row.run_status === "running") {
    return "RUNNING";
  }
  if (row.run_status === "failed") {
    return "FAILED";
  }
  if (row.overall_status === "pass") {
    return "PASS";
  }
  if (row.overall_status === "warn") {
    return "WARN";
  }
  if (row.overall_status === "fail") {
    return "FAIL";
  }
  return "COMPLETED";
}

function mapQueueLabel(row: PipelineRunRow): string {
  if (row.run_status === "pending") {
    return "worker 대기";
  }
  if (row.run_status === "running") {
    return "실행 중";
  }
  if (row.run_status === "failed") {
    return "실패";
  }
  return "완료";
}

function buildRunExplanation(row: PipelineRunRow, steps: PipelineStepSnapshot[]): string {
  if (row.run_status === "pending") {
    return "실행 요청은 접수됐고, worker가 이 run을 아직 가져가기 전 상태입니다.";
  }
  if (row.run_status === "running") {
    if (steps.length > 0) {
      const activeStep = steps[steps.length - 1];
      return `${activeStep.stepLabel}까지 기록되었고, 나머지 단계를 계속 처리하고 있습니다.`;
    }
    return "worker가 계산을 시작했습니다. 현재 구현은 단계 요약이 완료 시점에 반영됩니다.";
  }
  if (row.run_status === "failed") {
    return row.error_message?.trim() || "실행 중 오류가 발생해 중단되었습니다.";
  }

  const warnStep = steps.find((step) => step.tone === "warn");
  const failStep = steps.find((step) => step.tone === "fail");
  if (failStep) {
    return `${failStep.stepLabel} 단계에서 실패가 확인되어 결과 전달이 중단되었습니다.`;
  }
  if (warnStep) {
    return `${warnStep.stepLabel} 단계에 경고가 있어 운영 검토가 필요합니다.`;
  }
  return "전체 단계가 정상 완료되어 다음 결과 확인으로 넘어갈 수 있습니다.";
}

function buildProgressPercent(row: PipelineRunRow, steps: PipelineStepSnapshot[]): number {
  if (row.run_status === "pending") {
    return 0;
  }
  if (row.run_status === "running") {
    if (steps.length === 0) {
      return 12;
    }
    return Math.min(95, Math.max(20, Math.round((steps.length / 6) * 100)));
  }
  if (row.run_status === "failed") {
    return steps.length > 0 ? Math.min(99, Math.round((steps.length / 6) * 100)) : 0;
  }
  return 100;
}

function buildCurrentStepLabel(row: PipelineRunRow, steps: PipelineStepSnapshot[]): string {
  if (row.run_status === "pending") {
    return "Worker 대기";
  }
  if (row.run_status === "running") {
    return steps[steps.length - 1]?.stepLabel ?? "Worker 실행 시작";
  }
  if (row.run_status === "failed") {
    return steps[steps.length - 1]?.stepLabel ?? "실행 실패";
  }
  return steps[steps.length - 1]?.stepLabel ?? "실행 완료";
}

function toRunSnapshot(row: PipelineRunRow, steps: PipelineStepRow[]): PipelineRunSnapshot {
  const stepSnapshots = steps
    .sort((left, right) => left.step_order - right.step_order)
    .map(toStepSnapshot);

  return {
    id: row.id,
    runKey: row.run_key,
    companyKey: row.company_key,
    executionMode: row.execution_mode,
    runStatus: row.run_status,
    overallStatus: row.overall_status,
    overallScore: row.overall_score,
    tone: mapRunTone(row),
    statusLabel: mapRunStatusLabel(row),
    queueLabel: mapQueueLabel(row),
    explanation: buildRunExplanation(row, stepSnapshots),
    progressPercent: buildProgressPercent(row, stepSnapshots),
    currentStepLabel: buildCurrentStepLabel(row, stepSnapshots),
    totalDurationMs: Number(row.result_summary?.total_duration_ms ?? 0),
    createdAt: formatDateTime(row.created_at) ?? row.created_at,
    startedAt: formatDateTime(row.started_at),
    finishedAt: formatDateTime(row.finished_at),
    steps: stepSnapshots,
    errorMessage: row.error_message,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const config = resolveSupabaseConfig();
  if (!config) {
    throw new Error("Supabase 설정이 없어 실행 상태를 읽을 수 없습니다.");
  }

  const response = await fetch(url, {
    headers: buildHeaders(config),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`실행 상태 조회 실패(${response.status}): ${message || "unknown error"}`);
  }

  return (await response.json()) as T;
}

export async function listPipelineRunSnapshots(companyKey: string, limit = 20): Promise<PipelineRunSnapshot[]> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return [];
  }

  const runsUrl =
    `${config.url}/rest/v1/pipeline_runs?` +
    `company_key=eq.${encodeURIComponent(companyKey)}` +
    `&select=*` +
    `&order=created_at.desc` +
    `&limit=${limit}`;
  const runRows = await fetchJson<PipelineRunRow[]>(runsUrl);
  if (runRows.length === 0) {
    return [];
  }

  const ids = runRows.map((row) => row.id).join(",");
  const stepsUrl =
    `${config.url}/rest/v1/pipeline_run_steps?` +
    `run_id=in.(${ids})` +
    `&select=*` +
    `&order=step_order.asc`;
  const stepRows = await fetchJson<PipelineStepRow[]>(stepsUrl);
  const stepMap = new Map<string, PipelineStepRow[]>();

  for (const row of stepRows) {
    const current = stepMap.get(row.run_id) ?? [];
    current.push(row);
    stepMap.set(row.run_id, current);
  }

  return runRows.map((row) => toRunSnapshot(row, stepMap.get(row.id) ?? []));
}

export async function getPipelineRunSnapshot(
  companyKey: string,
  runKey: string,
): Promise<PipelineRunSnapshot | null> {
  const config = resolveSupabaseConfig();
  if (!config) {
    return null;
  }

  const runUrl =
    `${config.url}/rest/v1/pipeline_runs?` +
    `company_key=eq.${encodeURIComponent(companyKey)}` +
    `&run_key=eq.${encodeURIComponent(runKey)}` +
    `&select=*` +
    `&limit=1`;
  const runRows = await fetchJson<PipelineRunRow[]>(runUrl);
  const row = runRows[0];
  if (!row) {
    return null;
  }

  const stepsUrl =
    `${config.url}/rest/v1/pipeline_run_steps?` +
    `run_id=eq.${encodeURIComponent(row.id)}` +
    `&select=*` +
    `&order=step_order.asc`;
  const stepRows = await fetchJson<PipelineStepRow[]>(stepsUrl);
  return toRunSnapshot(row, stepRows);
}
