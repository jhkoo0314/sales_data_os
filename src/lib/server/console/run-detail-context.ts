import { promises as fs } from "node:fs";
import path from "node:path";

import { getRadarContext } from "@/lib/server/console/radar-context";
import type { RunBuilderSummary, RunDetailContext, RunEvidenceItem, RunModuleSummary, RunModuleStatusTone } from "@/lib/shared/run-detail-context";

const MODULE_LABELS: Record<string, string> = {
  crm: "CRM",
  prescription: "Prescription",
  sandbox: "Sandbox",
  territory: "Territory",
  radar: "RADAR",
  builder: "Builder",
};

function toTone(status: string | null | undefined): RunModuleStatusTone {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved") {
    return "approved";
  }
  if (normalized === "pass") {
    return "pass";
  }
  if (normalized === "warn" || normalized === "warning" || normalized === "partial") {
    return "warn";
  }
  if (normalized === "fail" || normalized === "failed") {
    return "fail";
  }
  return "ready";
}

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(targetPath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toDisplayValue(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("ko-KR") : value.toFixed(1);
  }
  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

function buildEvidence(summary: Record<string, unknown>): RunEvidenceItem[] {
  const preferredKeys = [
    "hospital_count",
    "crm_activity_count",
    "sales_record_count",
    "target_record_count",
    "standard_record_count",
    "flow_record_count",
    "connected_hospital_count",
    "marker_count",
    "route_count",
    "gap_count",
    "signal_count",
    "period_value",
    "metric_month_count",
    "coverage_rate",
    "built_report_count",
    "top_issue",
  ];

  const labels: Record<string, string> = {
    hospital_count: "병원 수",
    crm_activity_count: "CRM 활동 수",
    sales_record_count: "매출 레코드 수",
    target_record_count: "목표 레코드 수",
    standard_record_count: "표준 레코드 수",
    flow_record_count: "흐름 레코드 수",
    connected_hospital_count: "연결 병원 수",
    marker_count: "마커 수",
    route_count: "경로 수",
    gap_count: "갭 수",
    signal_count: "신호 수",
    period_value: "기준 기간",
    metric_month_count: "월 수",
    coverage_rate: "커버리지",
    built_report_count: "생성 보고서 수",
    top_issue: "가장 큰 이슈",
  };

  const items: RunEvidenceItem[] = [];

  for (const key of preferredKeys) {
    const displayValue = toDisplayValue(summary[key]);
    if (!displayValue) {
      continue;
    }

    items.push({
      label: labels[key] ?? key,
      value: key === "coverage_rate" && typeof summary[key] === "number"
        ? `${Math.round(Number(summary[key]) * 100)}%`
        : displayValue,
    });
  }

  const claimSummary = summary.claim_validation_summary;
  if (claimSummary && typeof claimSummary === "object") {
    const payload = claimSummary as Record<string, unknown>;
    const claimItems: Array<[string, string]> = [
      ["total_cases", "청구 검토 건수"],
      ["review_count", "재검토 건수"],
      ["suspect_count", "의심 건수"],
    ];
    for (const [key, label] of claimItems) {
      const displayValue = toDisplayValue(payload[key]);
      if (displayValue) {
        items.push({ label, value: displayValue });
      }
    }
  }

  return items.slice(0, 6);
}

function buildSummaryText(moduleKey: string, summary: Record<string, unknown>, score: number | null) {
  if (moduleKey === "crm") {
    return `CRM 입력과 활동 연결 상태를 검토했습니다.${score !== null ? ` 품질 점수는 ${score.toFixed(1)}점입니다.` : ""}`;
  }
  if (moduleKey === "prescription") {
    return `Prescription 흐름과 청구 검토 상태를 확인했습니다.${score !== null ? ` 품질 점수는 ${score.toFixed(1)}점입니다.` : ""}`;
  }
  if (moduleKey === "sandbox") {
    return `매출과 목표 데이터를 비교할 준비가 끝났습니다.${score !== null ? ` 품질 점수는 ${score.toFixed(1)}점입니다.` : ""}`;
  }
  if (moduleKey === "territory") {
    return `권역과 이동 경로 재료를 점검했습니다.${score !== null ? ` 품질 점수는 ${score.toFixed(1)}점입니다.` : ""}`;
  }
  if (moduleKey === "radar") {
    const issue = toDisplayValue(summary.top_issue);
    return issue ? `RADAR가 우선 확인 이슈를 잡았습니다: ${issue}` : "RADAR가 우선 확인 신호를 정리했습니다.";
  }
  if (moduleKey === "builder") {
    const count = typeof summary.built_report_count === "number" ? Number(summary.built_report_count) : null;
    return count !== null ? `Builder가 미리보기 보고서 ${count}개를 만들었습니다.` : "Builder 결과를 확인할 수 있습니다.";
  }
  return `${MODULE_LABELS[moduleKey] ?? moduleKey} 결과를 확인했습니다.`;
}

function toModuleSummary(moduleKey: string, summary: Record<string, unknown>, explicitStatus?: string): RunModuleSummary {
  const rawStatus = explicitStatus ?? toDisplayValue(summary.quality_status) ?? "ready";
  const score = typeof summary.quality_score === "number" ? Number(summary.quality_score) : null;
  const nextModules = Array.isArray(summary.next_modules)
    ? summary.next_modules.filter((value): value is string => typeof value === "string")
    : [];

  return {
    moduleKey,
    moduleLabel: MODULE_LABELS[moduleKey] ?? moduleKey,
    status: String(rawStatus).toUpperCase(),
    tone: toTone(rawStatus),
    score,
    summaryText: buildSummaryText(moduleKey, summary, score),
    evidence: buildEvidence(summary),
    nextModules,
  };
}

function buildBuilderSummary(summary: Record<string, unknown>): RunBuilderSummary {
  const reportNames = Object.entries(summary)
    .filter(([key, value]) => key !== "templates_validated" && key !== "skipped_reports" && typeof value === "object" && value !== null)
    .map(([key]) => key);

  const skippedReports = Array.isArray(summary.skipped_reports)
    ? summary.skipped_reports.filter((value): value is string => typeof value === "string")
    : [];

  return {
    builtReportCount: typeof summary.built_report_count === "number" ? Number(summary.built_report_count) : reportNames.length,
    skippedReports,
    reportNames,
  };
}

function buildOverallSummary(context: Pick<RunDetailContext, "overallStatus" | "modules">) {
  if (context.overallStatus === "FAIL") {
    return "이 run은 일부 단계에서 실패가 있어 원인 확인이 먼저 필요합니다.";
  }
  const warnModules = context.modules.filter((module) => module.tone === "warn" || module.tone === "fail");
  if (warnModules.length > 0) {
    return `전체 실행은 끝났지만 ${warnModules.map((item) => item.moduleLabel).join(", ")} 쪽은 추가 검토가 필요합니다.`;
  }
  return "전체 실행이 끝났고, 주요 결과를 이어서 확인할 수 있습니다.";
}

function buildNextActions(
  modules: RunModuleSummary[],
  builder: RunBuilderSummary | null,
  radarTopIssue: string | null,
) {
  const actions: string[] = [];
  const warnModules = modules.filter((module) => module.tone === "warn" || module.tone === "fail");
  if (warnModules.length > 0) {
    actions.push(`${warnModules[0].moduleLabel} 근거 수치를 먼저 확인하고 필요한 입력 보강 여부를 판단합니다.`);
  }
  if (radarTopIssue) {
    actions.push(`RADAR 기준 최우선 신호는 "${radarTopIssue}"이므로 관련 근거 파일과 보고서를 먼저 확인합니다.`);
  }
  if (builder?.builtReportCount) {
    actions.push(`Reports에서 생성된 보고서 ${builder.builtReportCount}개를 열어 실제 결과를 확인합니다.`);
  }
  if (!actions.length) {
    actions.push("Artifacts와 Reports로 이동해 결과 파일과 보고서를 확인합니다.");
  }
  return actions;
}

async function readPipelineValidationSummary(companyKey: string) {
  const summaryPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    "pipeline",
    "pipeline_validation_summary.json",
  );
  return readJsonFile<Record<string, unknown>>(summaryPath);
}

async function readModuleValidationSummary(companyKey: string, moduleKey: string) {
  const filename = moduleKey === "builder" ? "builder_validation_summary.json" : `${moduleKey}_validation_summary.json`;
  const targetPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    moduleKey,
    filename,
  );
  return readJsonFile<Record<string, unknown>>(targetPath);
}

export async function getRunDetailContext(companyKey: string): Promise<RunDetailContext> {
  const radar = await getRadarContext(companyKey);
  const pipelineSummary = await readPipelineValidationSummary(companyKey);

  if (pipelineSummary) {
    const stages = (pipelineSummary.stages as Record<string, Record<string, unknown>> | undefined) ?? {};
    const modules = ["crm", "prescription", "sandbox", "territory", "radar", "builder"]
      .filter((key) => stages[key])
      .map((key) => toModuleSummary(key, stages[key]));
    const builder = stages.builder ? buildBuilderSummary(stages.builder) : null;

    const context: RunDetailContext = {
      sourceType: "pipeline_validation_summary",
      overallStatus: typeof pipelineSummary.overall_status === "string" ? pipelineSummary.overall_status : null,
      overallScore: typeof pipelineSummary.overall_score === "number" ? Number(pipelineSummary.overall_score) : null,
      totalDurationMs: typeof pipelineSummary.total_duration_ms === "number" ? Number(pipelineSummary.total_duration_ms) : null,
      overallSummary: "",
      modules,
      builder,
      radar,
      nextActions: [],
    };

    context.overallSummary = buildOverallSummary(context);
    context.nextActions = buildNextActions(modules, builder, radar.topIssue);
    return context;
  }

  const moduleKeys = ["crm", "prescription", "sandbox", "territory", "radar", "builder"];
  const loaded = await Promise.all(
    moduleKeys.map(async (moduleKey) => ({
      moduleKey,
      summary: await readModuleValidationSummary(companyKey, moduleKey),
    })),
  );

  const modules = loaded
    .filter((item): item is { moduleKey: string; summary: Record<string, unknown> } => Boolean(item.summary))
    .map((item) => toModuleSummary(item.moduleKey, item.summary));

  const builderSummaryRecord = loaded.find((item) => item.moduleKey === "builder")?.summary ?? null;
  const builder = builderSummaryRecord ? buildBuilderSummary(builderSummaryRecord) : null;

  if (modules.length > 0) {
    const hasWarn = modules.some((module) => module.tone === "warn" || module.tone === "fail");
    const context: RunDetailContext = {
      sourceType: "module_validation_files",
      overallStatus: hasWarn ? "WARN" : "PASS",
      overallScore: null,
      totalDurationMs: null,
      overallSummary: "",
      modules,
      builder,
      radar,
      nextActions: [],
    };
    context.overallSummary = buildOverallSummary(context);
    context.nextActions = buildNextActions(modules, builder, radar.topIssue);
    return context;
  }

  return {
    sourceType: "missing",
    overallStatus: null,
    overallScore: null,
    totalDurationMs: null,
    overallSummary: "아직 validation 요약 파일이 없어 상세 해석을 붙일 수 없습니다.",
    modules: [],
    builder: null,
    radar,
    nextActions: ["worker 실행과 validation 결과 저장 여부를 먼저 확인합니다."],
  };
}

export async function hasRunDetailContext(companyKey: string) {
  const pipelinePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    "pipeline",
    "pipeline_validation_summary.json",
  );
  if (await fileExists(pipelinePath)) {
    return true;
  }

  const crmPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    "crm",
    "crm_validation_summary.json",
  );
  return fileExists(crmPath);
}
