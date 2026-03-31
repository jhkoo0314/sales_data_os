import path from "node:path";

import { isKpiModuleKey, readLatestKpiModuleResult } from "@/lib/server/kpi";
import {
  ensureDir,
  fileExists,
  moduleRoot,
  readJsonFile,
  toMonthToken,
  toNumber,
  toPosixRelativePath,
  validationCompanyRoot,
  validationMetaRoot,
  writeJsonFile
} from "@/lib/server/kpi/shared";
import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";
import {
  readLatestValidationModuleSummary,
  readLatestValidationSummary,
  readRunArtifactsIndex,
  readRunReportContext,
  runValidation
} from "@/lib/server/validation";
import type { ModuleValidationSummary, ValidationModuleKey, ValidationRunSummary } from "@/lib/server/validation/types";

import type {
  BuilderInputStandard,
  BuilderModuleKey,
  BuilderPayloadRunResult,
  BuilderPayloadStandard,
  BuilderTemplateKey
} from "@/lib/server/builder/types";
import { buildSandboxTemplatePayloadData } from "@/lib/server/builder/sandbox-payload";
import { buildPrescriptionTemplatePayloadData } from "@/lib/server/builder/prescription-payload";

const TEMPLATE_PATHS: Record<BuilderModuleKey, string> = {
  crm: "workers/templates/reports/crm_analysis_template.html",
  sandbox: "workers/templates/reports/sandbox_report_template.html",
  territory: "workers/templates/reports/territory_optimizer_template.html",
  prescription: "workers/templates/reports/prescription_flow_template.html",
  radar: "workers/templates/reports/radar_report_template.html"
};

const TEMPLATE_KEYS: Record<BuilderModuleKey, BuilderTemplateKey> = {
  crm: "crm_analysis",
  sandbox: "sandbox_report",
  territory: "territory_optimizer",
  prescription: "prescription_flow",
  radar: "radar_report"
};

const REPORT_TITLES: Record<BuilderModuleKey, string> = {
  crm: "Behavior CRM - System Intelligence Report",
  sandbox: "Sales Strategic Intel - Clinical Precision",
  territory: "Territory Optimizer Report",
  prescription: "Prescription Flow Intelligence Report",
  radar: "RADAR Decision Brief"
};

function builderRoot(companyKey: string): string {
  return path.join(validationCompanyRoot(companyKey), "builder");
}

function latestBuilderPayloadPath(companyKey: string): string {
  return path.join(builderRoot(companyKey), "latest_payload_result.json");
}

function builderPayloadHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:TZ.]/g, "").slice(0, 14);
  return path.join(builderRoot(companyKey), `payload_result_${stamp}.json`);
}

function moduleBuilderPayloadPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(moduleRoot(companyKey, moduleKey), `${moduleKey}_builder_payload.json`);
}

function moduleBuilderInputPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${moduleKey}_builder_input_standard.json`);
}

function runPayloadIndexPath(companyKey: string, runId: string): string {
  return path.join(validationCompanyRoot(companyKey), "runs", runId, "builder_payload_index.json");
}

function latestPayloadIndexPath(companyKey: string): string {
  return path.join(builderRoot(companyKey), "builder_payload_index.json");
}

function periodFromAsset(asset: Record<string, unknown>): {
  months: string[];
  start_month: string | null;
  end_month: string | null;
  label: string;
} {
  const monthCandidates = [
    ...(((asset.metric_months as unknown[]) ?? []).map((item) => toMonthToken(item))),
    ...((((asset.monthly_kpi_11 as unknown[]) ?? []) as Array<Record<string, unknown>>).map((item) =>
      toMonthToken(item.metric_month)
    )),
    ...((((asset.flow_series as unknown[]) ?? []) as Array<Record<string, unknown>>).map((item) =>
      toMonthToken(item.month_key)
    )),
    ...((((asset.activity_context as Record<string, unknown> | undefined)?.activity_months as unknown[]) ?? []).map((item) =>
      toMonthToken(item)
    )),
    ...((((asset.lineage_summary as Record<string, unknown> | undefined)?.active_months as unknown[]) ?? []).map((item) =>
      toMonthToken(item)
    )),
    toMonthToken(asset.period_label)
  ]
    .filter(Boolean)
    .sort();

  const months = Array.from(new Set(monthCandidates));
  const start = months[0] ?? null;
  const end = months[months.length - 1] ?? null;
  const label = start && end ? (start === end ? start : `${start}~${end}`) : "period_unknown";
  return {
    months,
    start_month: start,
    end_month: end,
    label
  };
}

function topRows<T>(rows: T[] | undefined, size: number): T[] {
  return Array.isArray(rows) ? rows.slice(0, size) : [];
}

function groupCount(rows: Array<Record<string, unknown>>, key: string): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "").trim() || "unknown";
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([groupKey, count]) => ({ key: groupKey, count }))
    .sort((left, right) => right.count - left.count);
}

function toPercentDisplay(value: number): string {
  return `${value.toFixed(1)}%`;
}

function metricTone(value: number, thresholds: { good: number; warn: number }): string {
  if (value >= thresholds.good) return "green";
  if (value >= thresholds.warn) return "amber";
  return "red";
}

const CRM_TEAM_ALL_TOKEN = "ALL";
const CRM_TEAM_ALL_LABEL = "전체 팀";
const CRM_REP_ALL_TOKEN = "ALL";
const CRM_REP_ALL_LABEL = "전체 담당자";
const CRM_BEHAVIOR_KEYS = ["PT", "Demo", "Closing", "Needs", "FaceToFace", "Contact", "Access", "Feedback"];
const CRM_COACH_WEIGHTS = [
  { label: "HIR", value: 0.3 },
  { label: "RTR", value: 0.2 },
  { label: "BCR", value: 0.15 },
  { label: "PHR", value: 0.15 },
  { label: "NAR", value: 0.1 },
  { label: "AHS", value: 0.1 }
] as const;

function crmMonthLabel(metricMonth: string): string {
  const text = String(metricMonth ?? "").trim();
  if (text.length === 6 && /^\d{6}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}`;
  }
  return text || "-";
}

function crmNormalizeRatio(value: unknown): number {
  const numeric = toNumber(value);
  return numeric > 1 ? numeric / 100 : numeric;
}

function crmNormalizeHir(value: unknown): number {
  const numeric = toNumber(value);
  if (numeric <= 1) return numeric;
  if (numeric <= 5) return numeric / 3;
  return numeric / 100;
}

function crmNormalizeCoachScore(value: unknown): number {
  const numeric = toNumber(value);
  return numeric > 1 ? numeric / 100 : numeric;
}

function crmAdjustFgr(value: unknown): number {
  const numeric = toNumber(value);
  return numeric > 50 ? numeric - 100 : numeric;
}

function crmAvgKey(rows: Array<Record<string, unknown>>, key: string): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0) / rows.length;
}

function crmMetricTile(code: string, name: string, value: number, tone: string): Record<string, unknown> {
  if (["HIR", "RTR", "BCR", "PHR", "NAR"].includes(code)) {
    return {
      code,
      name,
      value,
      display: value.toFixed(2),
      fill_pct: Math.max(0, Math.min(100, value * 100)),
      tone
    };
  }

  if (["AHS", "PV", "PI"].includes(code)) {
    return {
      code,
      name,
      value,
      display: value.toFixed(1),
      fill_pct: Math.max(0, Math.min(100, value)),
      tone
    };
  }

  if (code === "FGR") {
    return {
      code,
      name,
      value,
      display: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
      fill_pct: Math.max(0, Math.min(100, 50 + value * 4)),
      tone
    };
  }

  if (code === "TRG") {
    return {
      code,
      name,
      value,
      display: `${value >= 0 ? "+" : ""}${value.toFixed(1)}pt`,
      fill_pct: Math.max(0, Math.min(100, 100 - Math.abs(value * 4))),
      tone
    };
  }

  return {
    code,
    name,
    value,
    display: value.toFixed(1),
    fill_pct: Math.max(0, Math.min(100, value)),
    tone
  };
}

function crmBuildMonthlyRows(asset: Record<string, unknown>): Array<Record<string, unknown>> {
  const rows = ((asset.monthly_kpi_11 as unknown[]) ?? []) as Array<Record<string, unknown>>;
  return rows
    .map((row) => {
      const metricMonth = String(row.metric_month ?? "");
      const metricSet = ((row.metric_set as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
      return {
        metric_month: metricMonth,
        month_label: crmMonthLabel(metricMonth),
        hir: crmNormalizeHir(metricSet.hir),
        rtr: crmNormalizeRatio(metricSet.rtr),
        bcr: crmNormalizeRatio(metricSet.bcr),
        phr: crmNormalizeRatio(metricSet.phr),
        nar: crmNormalizeRatio(metricSet.nar),
        ahs: toNumber(metricSet.ahs),
        pv: toNumber(metricSet.pv),
        fgr: crmAdjustFgr(metricSet.fgr),
        pi: toNumber(metricSet.pi),
        trg: toNumber(metricSet.trg),
        swr: toNumber(metricSet.swr),
        coach_score: crmNormalizeCoachScore(metricSet.coach_score)
      };
    })
    .sort((left, right) => String(left.metric_month).localeCompare(String(right.metric_month)));
}

function crmBuildRepRowsByMonth(asset: Record<string, unknown>): {
  repRowsByMonth: Record<string, Array<Record<string, unknown>>>;
  branchLabels: Record<string, string>;
} {
  const behaviorProfiles = ((asset.behavior_profiles as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const repMonthly = ((asset.rep_monthly_kpi_11 as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const profileMap = new Map(behaviorProfiles.map((item) => [String(item.rep_id ?? ""), item]));
  const branchLabels: Record<string, string> = {};
  const repRowsByMonth: Record<string, Array<Record<string, unknown>>> = {};

  for (const row of repMonthly) {
    const metricMonth = String(row.metric_month ?? "");
    const repId = String(row.rep_id ?? "");
    const profile = profileMap.get(repId) ?? {};
    const metricSet = ((row.metric_set as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const behaviorMix = ((row.behavior_mix_8 as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const branchId = String(profile.branch_id ?? "UNASSIGNED");
    const branchName = String(profile.branch_name ?? (branchId || CRM_TEAM_ALL_LABEL));
    branchLabels[branchId] = branchName;

    repRowsByMonth[metricMonth] ??= [];
    repRowsByMonth[metricMonth].push({
      metric_month: metricMonth,
      rep_id: repId,
      rep_name: String(profile.rep_name ?? repId),
      branch_id: branchId,
      branch_name: branchName,
      hir: crmNormalizeHir(metricSet.hir),
      rtr: crmNormalizeRatio(metricSet.rtr),
      bcr: crmNormalizeRatio(metricSet.bcr),
      phr: crmNormalizeRatio(metricSet.phr),
      nar: crmNormalizeRatio(metricSet.nar),
      ahs: toNumber(metricSet.ahs),
      pv: toNumber(metricSet.pv),
      fgr: crmAdjustFgr(metricSet.fgr),
      pi: toNumber(metricSet.pi),
      trg: toNumber(metricSet.trg),
      swr: toNumber(metricSet.swr),
      coach_score: crmNormalizeCoachScore(metricSet.coach_score),
      total_visits: toNumber(profile.total_visits),
      behavior_mix_8: behaviorMix
    });
  }

  for (const month of Object.keys(repRowsByMonth)) {
    repRowsByMonth[month] = repRowsByMonth[month].sort((left, right) => {
      return (
        toNumber(right.coach_score) - toNumber(left.coach_score) ||
        toNumber(right.hir) - toNumber(left.hir) ||
        toNumber(right.total_visits) - toNumber(left.total_visits)
      );
    });
  }

  return { repRowsByMonth, branchLabels };
}

function crmFilterRows(
  repRowsByMonth: Record<string, Array<Record<string, unknown>>>,
  periodToken: string,
  teamToken: string
): { monthlyRows: Array<Record<string, unknown>>; latestRows: Array<Record<string, unknown>> } {
  const selectedMonths = periodToken === "ALL" ? Object.keys(repRowsByMonth).sort() : [periodToken];
  const monthlyRows: Array<Record<string, unknown>> = [];
  let latestRows: Array<Record<string, unknown>> = [];

  for (const month of selectedMonths) {
    let rows = [...(repRowsByMonth[month] ?? [])];
    if (teamToken !== CRM_TEAM_ALL_TOKEN) {
      rows = rows.filter((row) => String(row.branch_id ?? "") === teamToken);
    }
    if (rows.length > 0) {
      monthlyRows.push(...rows);
      latestRows = rows;
    }
  }

  return { monthlyRows, latestRows };
}

function crmBuildTrendRows(monthlyRows: Array<Record<string, unknown>>, periodToken: string): Record<string, unknown> {
  let monthOrder = Array.from(new Set(monthlyRows.map((row) => String(row.metric_month ?? "")).filter(Boolean))).sort();
  if (periodToken !== "ALL") {
    monthOrder = monthOrder.includes(periodToken) ? [periodToken] : monthOrder.slice(0, 1);
  }

  const trendSource = monthOrder
    .map((month) => {
      const rows = monthlyRows.filter((row) => String(row.metric_month ?? "") === month);
      if (rows.length === 0) return null;
      return {
        month_label: crmMonthLabel(month),
        hir: crmAvgKey(rows, "hir"),
        bcr: crmAvgKey(rows, "bcr"),
        fgr: crmAvgKey(rows, "fgr")
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return {
    labels: trendSource.map((row) => String(row.month_label ?? "")),
    hir: trendSource.map((row) => Number(toNumber(row.hir).toFixed(3))),
    bcr: trendSource.map((row) => Number(toNumber(row.bcr).toFixed(3))),
    fgr: trendSource.map((row) => Number(toNumber(row.fgr).toFixed(1)))
  };
}

function crmBuildBehaviorAxis(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  if (rows.length === 0) return [];
  return CRM_BEHAVIOR_KEYS.map((key) => ({
    label: key,
    score: Number(
      (
        rows.reduce((sum, row) => sum + toNumber(((row.behavior_mix_8 as Record<string, unknown> | undefined) ?? {})[key]), 0) /
        rows.length
      ).toFixed(3)
    ),
    tone: "blue"
  }));
}

function crmBuildBehaviorDiagnosis(axis: Array<Record<string, unknown>>): string {
  if (axis.length === 0) {
    return "CRM KPI 자산 기준으로 표시됩니다.";
  }
  const weakest = [...axis].sort((left, right) => toNumber(left.score) - toNumber(right.score)).slice(0, 2);
  if (weakest.length === 1) {
    return `${String(weakest[0].label ?? "")}(${(toNumber(weakest[0].score) * 100).toFixed(0)}%) 축 보강이 우선입니다.`;
  }
  return `${String(weakest[0].label ?? "")}(${(toNumber(weakest[0].score) * 100).toFixed(0)}%), ${String(weakest[1].label ?? "")}(${(toNumber(weakest[1].score) * 100).toFixed(0)}%) 축 보강이 우선입니다.`;
}

function crmBuildKpiBanner(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  if (rows.length === 0) {
    return { leading: [], ops: [], outcome: [] };
  }

  const avg = (key: string) => crmAvgKey(rows, key);
  return {
    leading: [
      crmMetricTile("HIR", "High-Impact Rate", Number(avg("hir").toFixed(3)), "blue"),
      crmMetricTile("RTR", "Relationship Temp.", Number(avg("rtr").toFixed(3)), "teal"),
      crmMetricTile("BCR", "Behavior Consistency", Number(avg("bcr").toFixed(3)), "purple"),
      crmMetricTile("PHR", "Proactive Health", Number(avg("phr").toFixed(3)), "pink")
    ],
    ops: [
      crmMetricTile("NAR", "Next Action Reliability", Number(avg("nar").toFixed(3)), "amber"),
      crmMetricTile("AHS", "Account Health Score", Number(avg("ahs").toFixed(1)), "amber"),
      crmMetricTile("PV", "Pipeline Velocity", Number(avg("pv").toFixed(1)), "amber")
    ],
    outcome: [
      crmMetricTile("FGR", "Field Growth Rate", Number(avg("fgr").toFixed(1)), "green"),
      crmMetricTile("PI", "Prescription Index", Number(avg("pi").toFixed(1)), "green"),
      crmMetricTile("TRG", "Target Readiness Gap", Number(avg("trg").toFixed(1)), "muted"),
      crmMetricTile("SWR", "Share Win Rate", Number(avg("swr").toFixed(1)), "muted")
    ]
  };
}

function crmBuildRadar(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    labels: ["HIR", "RTR", "BCR", "PHR", "NAR", "AHS"],
    team_avg:
      rows.length > 0
        ? [
            Number(crmAvgKey(rows, "hir").toFixed(3)),
            Number(crmAvgKey(rows, "rtr").toFixed(3)),
            Number(crmAvgKey(rows, "bcr").toFixed(3)),
            Number(crmAvgKey(rows, "phr").toFixed(3)),
            Number(crmAvgKey(rows, "nar").toFixed(3)),
            Number((crmAvgKey(rows, "ahs") / 100).toFixed(3))
          ]
        : [0, 0, 0, 0, 0, 0],
    target: [0.8, 0.75, 0.75, 0.7, 0.8, 0.8]
  };
}

function crmBuildCoachSummary(rows: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    score: Number(crmAvgKey(rows, "coach_score").toFixed(3)),
    delta: 0,
    delta_display: "+0.000",
    weight_rows: CRM_COACH_WEIGHTS.map((item) => ({ ...item }))
  };
}

function crmBuildRepScope(
  repRowsAllMonths: Array<Record<string, unknown>>,
  repToken: string,
  periodLabel: string,
  teamLabel: string
): Record<string, unknown> | null {
  const repRows = repRowsAllMonths.filter((row) => String(row.rep_id ?? "") === repToken);
  if (repRows.length === 0) return null;
  const latestRow = [...repRows].sort((left, right) => String(left.metric_month ?? "").localeCompare(String(right.metric_month ?? ""))).at(-1) ?? {};
  const behaviorAxis = CRM_BEHAVIOR_KEYS.map((key) => ({
    label: key,
    score: Number(toNumber(((latestRow.behavior_mix_8 as Record<string, unknown> | undefined) ?? {})[key]).toFixed(3)),
    tone: "blue"
  }));

  return {
    period_token: String(latestRow.metric_month ?? "ALL"),
    period_label: periodLabel,
    team_token: String(latestRow.branch_id ?? CRM_TEAM_ALL_TOKEN),
    team_label: teamLabel,
    rep_token: repToken,
    rep_label: String(latestRow.rep_name ?? repToken),
    kpi_banner: crmBuildKpiBanner([latestRow]),
    radar: crmBuildRadar([latestRow]),
    integrity: {
      verified_pct: 0,
      assisted_pct: 0,
      self_only_pct: 0,
      verified_count: 0,
      assisted_count: 0,
      self_only_count: 0,
      penalty_count: 0,
      unscored_count: 0
    },
    coach_summary: crmBuildCoachSummary([latestRow]),
    behavior_axis: behaviorAxis,
    behavior_diagnosis: crmBuildBehaviorDiagnosis(behaviorAxis),
    pipeline: { stages: [], avg_dwell_days: 0, conversion_rate: 0 },
    matrix_rows: [latestRow],
    trend: crmBuildTrendRows(repRows, "ALL"),
    quality_flags: [],
    rep_options: [{ token: CRM_REP_ALL_TOKEN, label: CRM_REP_ALL_LABEL }],
    rep_scope_data: {}
  };
}

function crmBuildScopePayload(input: {
  periodToken: string;
  periodLabel: string;
  teamToken: string;
  teamLabel: string;
  repRowsByMonth: Record<string, Array<Record<string, unknown>>>;
}): Record<string, unknown> {
  const { monthlyRows, latestRows } = crmFilterRows(input.repRowsByMonth, input.periodToken, input.teamToken);
  const repOptions = [{ token: CRM_REP_ALL_TOKEN, label: CRM_REP_ALL_LABEL }];
  const repScopeData: Record<string, Record<string, unknown>> = {};

  const repPairs = Array.from(
    new Map(
      monthlyRows
        .filter((row) => String(row.rep_id ?? "").trim().length > 0)
        .map((row) => [String(row.rep_id ?? ""), String(row.rep_name ?? row.rep_id ?? "")])
    ).entries()
  ).sort((left, right) => left[1].localeCompare(right[1]));

  for (const [repId, repName] of repPairs) {
    repOptions.push({ token: repId, label: repName });
    const repScope = crmBuildRepScope(monthlyRows, repId, input.periodLabel, input.teamLabel);
    if (repScope) {
      repScopeData[repId] = repScope;
    }
  }

  const behaviorAxis = crmBuildBehaviorAxis(latestRows);
  return {
    period_token: input.periodToken,
    period_label: input.periodLabel,
    team_token: input.teamToken,
    team_label: input.teamLabel,
    rep_token: CRM_REP_ALL_TOKEN,
    rep_label: CRM_REP_ALL_LABEL,
    kpi_banner: crmBuildKpiBanner(latestRows),
    radar: crmBuildRadar(latestRows),
    integrity: {
      verified_pct: 0,
      assisted_pct: 0,
      self_only_pct: 0,
      verified_count: 0,
      assisted_count: 0,
      self_only_count: 0,
      penalty_count: 0,
      unscored_count: 0
    },
    coach_summary: crmBuildCoachSummary(latestRows),
    behavior_axis: behaviorAxis,
    behavior_diagnosis: crmBuildBehaviorDiagnosis(behaviorAxis),
    pipeline: { stages: [], avg_dwell_days: 0, conversion_rate: 0 },
    matrix_rows: latestRows,
    trend: crmBuildTrendRows(monthlyRows, input.periodToken),
    quality_flags: [],
    rep_options: repOptions,
    rep_scope_data: repScopeData
  };
}

function buildCrmTemplatePayload(
  asset: Record<string, unknown>,
  period: BuilderPayloadStandard["period"],
  context: { companyKey: string; generatedAt: string; summary: ModuleValidationSummary }
) {
  const monthlyRows = crmBuildMonthlyRows(asset);
  const { repRowsByMonth, branchLabels } = crmBuildRepRowsByMonth(asset);
  const activityContext = ((asset.activity_context as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const mappingQuality = ((asset.mapping_quality as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;

  const periodOptions = [{ token: "ALL", label: "전체 기간" }, ...monthlyRows.map((row) => ({
    token: String(row.metric_month ?? "ALL"),
    label: String(row.month_label ?? "-")
  }))];
  const teamOptions = [
    { token: CRM_TEAM_ALL_TOKEN, label: CRM_TEAM_ALL_LABEL },
    ...Object.entries(branchLabels)
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([token, label]) => ({ token, label }))
  ];

  const defaultPeriod = String(monthlyRows.at(-1)?.metric_month ?? "ALL");
  const defaultTeam = CRM_TEAM_ALL_TOKEN;
  const defaultRep = CRM_REP_ALL_TOKEN;

  const scopeData: Record<string, Record<string, unknown>> = {};
  const periods = [{ token: "ALL", label: "전체 기간" }, ...monthlyRows.map((row) => ({
    token: String(row.metric_month ?? "ALL"),
    label: String(row.month_label ?? "-")
  }))];
  const teams = [{ token: CRM_TEAM_ALL_TOKEN, label: CRM_TEAM_ALL_LABEL }, ...Object.entries(branchLabels).map(([token, label]) => ({ token, label }))];

  for (const periodOption of periods) {
    for (const teamOption of teams) {
      const scopeKey = `${periodOption.token}|${teamOption.token}`;
      scopeData[scopeKey] = crmBuildScopePayload({
        periodToken: periodOption.token,
        periodLabel: periodOption.label,
        teamToken: teamOption.token,
        teamLabel: teamOption.label,
        repRowsByMonth
      });
    }
  }

  const allScope = scopeData[`${CRM_TEAM_ALL_TOKEN}|${CRM_TEAM_ALL_TOKEN}`] ?? scopeData["ALL|ALL"] ?? {};

  return {
    company: context.companyKey,
    generated_at: context.generatedAt,
    overview: {
      quality_status: String(context.summary.quality_status ?? "unknown").toLowerCase(),
      quality_score: context.summary.quality_score,
      crm_activity_count: toNumber(activityContext.total_activity_records),
      unique_reps: toNumber(activityContext.unique_reps),
      unique_hospitals: toNumber(activityContext.unique_hospitals),
      unique_branches: toNumber(activityContext.unique_branches),
      hospital_mapping_rate: Number((toNumber(mappingQuality.hospital_mapping_rate) * 100).toFixed(1)),
      crm_unmapped_count: toNumber(mappingQuality.unmapped_hospital_count)
    },
    activity_context: activityContext,
    mapping_quality: mappingQuality,
    logic_reference: {
      core_kpis: ["HIR", "RTR", "BCR", "PHR"],
      ops_kpis: ["NAR", "AHS", "PV"],
      result_kpis: ["FGR", "PI", "TRG", "SWR"],
      weights: CRM_COACH_WEIGHTS.map((item) => ({ ...item })),
      note: "Builder is rendering-only. KPI source: crm_result_asset (rep_monthly_kpi_11/monthly_kpi_11)."
    },
    filters: {
      period_options: periodOptions,
      team_options: teamOptions,
      rep_options: ((allScope.rep_options as unknown[]) ?? [{ token: CRM_REP_ALL_TOKEN, label: CRM_REP_ALL_LABEL }]) as Array<Record<string, unknown>>,
      default_period: defaultPeriod,
      default_team: defaultTeam,
      default_rep: defaultRep
    },
    default_scope_key: `${defaultPeriod}|${defaultTeam}`,
    scope_asset_manifest: {},
    scope_data: scopeData
  };
}

function buildTerritoryTemplatePayload(asset: Record<string, unknown>, period: BuilderPayloadStandard["period"]) {
  const gaps = ((asset.gaps as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const repIndex = ((asset.rep_index as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const repPayloads = ((asset.rep_payloads as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const repOptions = (((asset.filters as Record<string, unknown> | undefined)?.rep_options as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const hospitalCatalog = ((asset.hospital_catalog as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const defaultSelection = ((asset.default_selection as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const availableMonths = period.months.length
    ? period.months
    : (((asset.metric_months as unknown[]) ?? []) as unknown[])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
  const defaultMonth = String(defaultSelection.month_key ?? period.end_month ?? availableMonths[availableMonths.length - 1] ?? "");

  return {
    overview: {
      report_title: REPORT_TITLES.territory,
      map_title: "Territory Optimizer",
      period_label: period.label,
      total_reps: toNumber((asset.overview as Record<string, unknown> | undefined)?.rep_count),
      ...(asset.overview ?? {})
    },
    filters: {
      available_months: availableMonths,
      default_month: defaultMonth || null,
      default_scope_key: "company",
      rep_options: repOptions
    },
    hospital_catalog: hospitalCatalog,
    rep_index: repIndex,
    rep_payloads: repPayloads,
    default_selection: defaultSelection,
    rep_catalog: groupCount(gaps, "rep_name"),
    zone_catalog: asset.region_zones ?? [],
    route_assets: [],
    map_assets: [],
    route_summary: asset.optimization_summary ?? {},
    coverage_summary: asset.coverage_summary ?? {},
    gaps: topRows(gaps, 200),
    leaflet_asset_mode: "phase9_builder_copy_pending"
  };
}

function buildRadarTemplatePayload(asset: Record<string, unknown>, period: BuilderPayloadStandard["period"]) {
  const signals = ((asset.signals as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const periodLabel = period.label === "period_unknown" ? String(asset.period_label ?? "") : period.label;
  return {
    report_title: REPORT_TITLES.radar,
    period_label: periodLabel,
    overall_status: asset.overall_status ?? "review",
    top_issue: asset.top_issue ?? "",
    top_issue_desc: asset.top_issue_desc ?? "",
    decision_readiness: toNumber(asset.decision_readiness),
    validation_status: String(asset.validation_status ?? "REVIEW"),
    signal_count: toNumber(asset.signal_count),
    confidence: toNumber(asset.confidence),
    kpi_snapshot: asset.kpi_snapshot ?? {},
    signals,
    priority_summary: {
      signal_count: toNumber(asset.signal_count),
      top_issue: asset.top_issue ?? "",
      decision_readiness: toNumber(asset.decision_readiness),
      confidence: toNumber(asset.confidence)
    },
    decision_options: signals.flatMap((signal) => ((signal.decision_options as unknown[]) ?? []) as unknown[]),
    trend_chart: asset.trend_chart ?? {},
    scope_summaries: asset.scope_summaries ?? {},
    branch_options: asset.branch_options ?? [],
    overview: {
      report_title: REPORT_TITLES.radar,
      period_label: periodLabel
    }
  };
}

async function templatePayloadForModule(
  moduleKey: BuilderModuleKey,
  asset: Record<string, unknown>,
  period: BuilderPayloadStandard["period"],
  context: { companyKey: string; generatedAt: string; summary: ModuleValidationSummary }
): Promise<Record<string, unknown>> {
  switch (moduleKey) {
    case "crm":
      return buildCrmTemplatePayload(asset, period, context);
    case "sandbox":
      return buildSandboxTemplatePayloadData({
        companyKey: context.companyKey,
        asset,
        period,
        reportTitle: REPORT_TITLES.sandbox
      });
    case "territory":
      return buildTerritoryTemplatePayload(asset, period);
    case "prescription":
      return buildPrescriptionTemplatePayloadData({
        companyKey: context.companyKey,
        asset,
        period,
        reportTitle: REPORT_TITLES.prescription,
        summary: context.summary
      });
    case "radar":
      return buildRadarTemplatePayload(asset, period);
  }
}

async function createPayloadStandard(input: {
  companyKey: string;
  runId: string;
  generatedAt: string;
  overallStatus: ValidationRunSummary["overall_status"];
  moduleKey: BuilderModuleKey;
  asset: Record<string, unknown>;
  summary: ModuleValidationSummary;
}): Promise<BuilderPayloadStandard> {
  const period = periodFromAsset(input.asset);
  const payloadPath = moduleBuilderPayloadPath(input.companyKey, input.moduleKey);
  const templatePayload = await templatePayloadForModule(input.moduleKey, input.asset, period, {
    companyKey: input.companyKey,
    generatedAt: input.generatedAt,
    summary: input.summary
  });
  return {
    schema_version: "builder_payload_standard_v1",
    payload_type: "builder_payload_standard",
    module: input.moduleKey,
    template_key: TEMPLATE_KEYS[input.moduleKey],
    report_title: REPORT_TITLES[input.moduleKey],
    output_name: `${TEMPLATE_KEYS[input.moduleKey]}_preview`,
    quality_status: input.summary.quality_status,
    company_key: input.companyKey,
    run_id: input.runId,
    generated_at: input.generatedAt,
    period,
    source_paths: {
      result_asset_path: toPosixRelativePath(moduleRoot(input.companyKey, input.moduleKey) + `\\${input.moduleKey}_result_asset.json`),
      validation_summary_path: input.summary.summary_path
    },
    common_payload: {
      company_key: input.companyKey,
      run_id: input.runId,
      report_title: REPORT_TITLES[input.moduleKey],
      template_key: TEMPLATE_KEYS[input.moduleKey],
      template_path: TEMPLATE_PATHS[input.moduleKey],
      overall_status: input.overallStatus,
      module_status: input.summary.quality_status,
      generated_at: input.generatedAt
    },
    template_payload: templatePayload,
    asset_manifest: [
      {
        asset_type: "result_asset",
        path: toPosixRelativePath(moduleRoot(input.companyKey, input.moduleKey) + `\\${input.moduleKey}_result_asset.json`)
      },
      {
        asset_type: "validation_summary",
        path: input.summary.summary_path
      }
    ],
    payload_path: toPosixRelativePath(payloadPath)
  };
}

function createInputStandard(
  companyKey: string,
  runId: string,
  moduleKey: BuilderModuleKey,
  payload: BuilderPayloadStandard
): BuilderInputStandard {
  return {
    schema_version: "builder_input_standard_v1",
    input_type: "builder_input_standard",
    module: moduleKey,
    template_key: payload.template_key,
    template_path: TEMPLATE_PATHS[moduleKey],
    output_name: payload.output_name,
    report_title: payload.report_title,
    company_key: companyKey,
    run_id: runId,
    payload_path: payload.payload_path ?? toPosixRelativePath(moduleBuilderPayloadPath(companyKey, moduleKey)),
    source_result_asset_path: payload.source_paths.result_asset_path,
    validation_summary_path: payload.source_paths.validation_summary_path,
    render_mode: "preview"
  };
}

async function updateRunArtifactsIndex(
  companyKey: string,
  runId: string,
  payloadArtifacts: Array<{ module: BuilderModuleKey; payloadPath: string; inputPath: string; status: string }>,
  payloadIndexPath: string
): Promise<void> {
  const existing = (await readRunArtifactsIndex(companyKey, runId)) ?? {
    company_key: companyKey,
    run_id: runId,
    artifacts: []
  };
  const artifacts = Array.isArray((existing as { artifacts?: unknown[] }).artifacts)
    ? [...(existing as { artifacts: unknown[] }).artifacts]
    : [];

  const filtered = artifacts.filter((item) => {
    if (!item || typeof item !== "object") {
      return true;
    }
    const artifactType = String((item as { artifact_type?: unknown }).artifact_type ?? "");
    return artifactType !== "builder_payload" && artifactType !== "builder_input_standard" && artifactType !== "payload_index";
  });

  filtered.push(
    ...payloadArtifacts.flatMap((item) => [
      {
        artifact_type: "builder_payload",
        module: item.module,
        path: item.payloadPath,
        status: item.status
      },
      {
        artifact_type: "builder_input_standard",
        module: item.module,
        path: item.inputPath,
        status: item.status
      }
    ]),
    {
      artifact_type: "payload_index",
      module: "builder",
      path: payloadIndexPath,
      status: "READY"
    }
  );

  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "artifacts.index.json"), {
    ...(existing as Record<string, unknown>),
    artifacts: filtered
  });
}

async function updateRunReportContext(
  companyKey: string,
  runId: string,
  payloadArtifacts: Array<{ module: BuilderModuleKey; payloadPath: string; inputPath: string }>
): Promise<void> {
  const existing = await readRunReportContext(companyKey, runId);
  if (!existing) {
    return;
  }

  const full = { ...existing.full } as Record<string, unknown>;
  const linkedArtifacts = { ...((full.linked_artifacts as Record<string, unknown> | undefined) ?? {}) };
  linkedArtifacts.builder_payloads = payloadArtifacts.map((item) => ({
    module: item.module,
    path: item.payloadPath
  }));
  linkedArtifacts.builder_inputs = payloadArtifacts.map((item) => ({
    module: item.module,
    path: item.inputPath
  }));
  linkedArtifacts.payload_index = toPosixRelativePath(runPayloadIndexPath(companyKey, runId));
  full.linked_artifacts = linkedArtifacts;
  full.payload_ready_modules = payloadArtifacts.map((item) => item.module);

  const prompt = { ...existing.prompt } as Record<string, unknown>;
  prompt.payload_ready_modules = payloadArtifacts.map((item) => item.module);

  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "report_context.full.json"), full);
  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "report_context.prompt.json"), prompt);
}

export async function runBuilderPayload(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<BuilderPayloadRunResult> {
  const companyKey = input.companyKey;
  assertValidCompanyKey(companyKey);

  const shouldRefreshUpstream = Boolean(input.executionMode);
  let validation = shouldRefreshUpstream ? null : await readLatestValidationSummary(companyKey);
  if (!validation) {
    validation = await runValidation({ companyKey, executionMode: input.executionMode ?? null });
  }

  const generatedAt = new Date().toISOString();
  const modulePayloads: BuilderPayloadRunResult["module_payloads"] = [];
  const payloadArtifacts: Array<{ module: BuilderModuleKey; payloadPath: string; inputPath: string; status: string }> = [];

  for (const moduleKey of ["crm", "sandbox", "territory", "prescription", "radar"] as BuilderModuleKey[]) {
    if (!isKpiModuleKey(moduleKey)) {
      continue;
    }
    const asset = await readLatestKpiModuleResult(companyKey, moduleKey);
    const summary = await readLatestValidationModuleSummary(companyKey, moduleKey);
    if (!asset || !summary) {
      continue;
    }

    const payload = await createPayloadStandard({
      companyKey,
      runId: validation.run_id,
      generatedAt,
      overallStatus: validation.overall_status,
      moduleKey,
      asset,
      summary
    });
    const inputStandard = createInputStandard(companyKey, validation.run_id, moduleKey, payload);
    const payloadPath = moduleBuilderPayloadPath(companyKey, moduleKey);
    const inputPath = moduleBuilderInputPath(companyKey, moduleKey);
    await writeJsonFile(payloadPath, payload);
    await writeJsonFile(inputPath, inputStandard);

    const payloadPathRelative = toPosixRelativePath(payloadPath);
    const inputPathRelative = toPosixRelativePath(inputPath);
    modulePayloads.push({
      module: moduleKey,
      template_key: payload.template_key,
      quality_status: summary.quality_status,
      payload_path: payloadPathRelative,
      input_standard_path: inputPathRelative,
      summary: `${moduleKey.toUpperCase()} payload를 Builder 전달용으로 정리했습니다.`
    });
    payloadArtifacts.push({
      module: moduleKey,
      payloadPath: payloadPathRelative,
      inputPath: inputPathRelative,
      status: summary.quality_status
    });
  }

  const result: BuilderPayloadRunResult = {
    company_key: companyKey,
    run_id: validation.run_id,
    generated_at: generatedAt,
    overall_status: validation.overall_status,
    builder_root: toPosixRelativePath(builderRoot(companyKey)),
    payload_index_path: toPosixRelativePath(latestPayloadIndexPath(companyKey)),
    module_payloads: modulePayloads,
    summary_message: "Builder가 바로 읽을 수 있는 모듈별 payload와 input standard를 생성했습니다."
  };

  await ensureDir(builderRoot(companyKey));
  await writeJsonFile(latestBuilderPayloadPath(companyKey), result);
  await writeJsonFile(builderPayloadHistoryPath(companyKey, generatedAt), result);
  await writeJsonFile(latestPayloadIndexPath(companyKey), {
    company_key: companyKey,
    run_id: validation.run_id,
    generated_at: generatedAt,
    payloads: modulePayloads
  });
  await writeJsonFile(runPayloadIndexPath(companyKey, validation.run_id), {
    company_key: companyKey,
    run_id: validation.run_id,
    generated_at: generatedAt,
    payloads: modulePayloads
  });

  await updateRunArtifactsIndex(
    companyKey,
    validation.run_id,
    payloadArtifacts,
    toPosixRelativePath(runPayloadIndexPath(companyKey, validation.run_id))
  );
  await updateRunReportContext(companyKey, validation.run_id, payloadArtifacts);
  return result;
}

export async function readLatestBuilderPayloadResult(companyKey: string): Promise<BuilderPayloadRunResult | null> {
  assertValidCompanyKey(companyKey);
  const filePath = latestBuilderPayloadPath(companyKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<BuilderPayloadRunResult>(filePath);
}

export async function readLatestBuilderModulePayload(
  companyKey: string,
  moduleKey: BuilderModuleKey
): Promise<BuilderPayloadStandard | null> {
  assertValidCompanyKey(companyKey);
  const filePath = moduleBuilderPayloadPath(companyKey, moduleKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<BuilderPayloadStandard>(filePath);
}
