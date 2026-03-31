import { avg, cleanText, toNumber } from "@/lib/server/kpi/shared";

type Signal = {
  signal_type: string;
  severity: "normal" | "warning" | "critical";
  priority_score: number;
  title: string;
  message: string;
  scope: {
    level: "company" | "branch";
    branch_keys: string[];
  };
  evidence: {
    metric: string;
    current_value: number;
    threshold: number;
  };
  possible_explanations: string[];
  decision_options: Array<{ option_code: string }>;
};

export async function buildRadarResultAsset(input: {
  companyKey: string;
  crmAsset: Record<string, unknown>;
  sandboxAsset: Record<string, unknown>;
  territoryAsset: Record<string, unknown> | null;
  prescriptionAsset: Record<string, unknown> | null;
}): Promise<{ asset: Record<string, unknown>; rowCount: number }> {
  const monthlyKpi11 = ((input.crmAsset.monthly_kpi_11 as Array<Record<string, unknown>> | undefined) ?? []).sort((a, b) =>
    cleanText(a.metric_month).localeCompare(cleanText(b.metric_month))
  );
  const latestCrm = monthlyKpi11.at(-1)?.metric_set as Record<string, unknown> | undefined;
  const sandboxSummary = (input.sandboxAsset.analysis_summary as Record<string, unknown> | undefined) ?? {};
  const sandboxCustom = (sandboxSummary.custom_metrics as Record<string, unknown> | undefined) ?? {};
  const coverageSummary = (input.territoryAsset?.coverage_summary as Record<string, unknown> | undefined) ?? {};
  const branchOptions =
    ((input.territoryAsset?.region_zones as Array<Record<string, unknown>> | undefined) ?? [])
      .map((item) => cleanText(item.region))
      .filter(Boolean) || [];

  const goalAttainment = toNumber(sandboxCustom.monthly_attainment_rate);
  const rtr = toNumber(latestCrm?.rtr);
  const hir = toNumber(latestCrm?.hir);
  const pv = toNumber(latestCrm?.pv);
  const coverageRate = toNumber(coverageSummary.fully_joined_hospitals) /
    Math.max(toNumber(sandboxSummary.total_hospitals), 1);

  const signals: Signal[] = [];
  if (goalAttainment > 0 && goalAttainment < 95) {
    signals.push({
      signal_type: "goal_underperformance",
      severity: goalAttainment < 90 ? "critical" : "warning",
      priority_score: goalAttainment < 90 ? 92 : 82,
      title: "Goal Underperformance",
      message: "목표 달성률이 기준보다 낮아 매출 운영 개입이 필요합니다.",
      scope: { level: "company", branch_keys: branchOptions },
      evidence: { metric: "goal_attainment_pct", current_value: goalAttainment, threshold: 95 },
      possible_explanations: ["목표 대비 실적 부족", "핵심 병원 집중도 저하 가능성"],
      decision_options: [{ option_code: "A" }, { option_code: "B" }, { option_code: "C" }]
    });
  }
  if (rtr > 0 && rtr < 70) {
    signals.push({
      signal_type: "rtr_weakness",
      severity: rtr < 60 ? "critical" : "warning",
      priority_score: rtr < 60 ? 88 : 76,
      title: "RTR Weakness",
      message: "관계 유지 지표가 기준 아래로 내려갔습니다.",
      scope: { level: branchOptions.length ? "branch" : "company", branch_keys: branchOptions.slice(0, 2) },
      evidence: { metric: "rtr", current_value: rtr, threshold: 70 },
      possible_explanations: ["후속 액션 품질 저하 가능성", "반복 접촉 관리 약화 가능성"],
      decision_options: [{ option_code: "A" }, { option_code: "B" }]
    });
  }
  if (hir > 0 && hir < 60) {
    signals.push({
      signal_type: "hir_weakness",
      severity: hir < 50 ? "critical" : "warning",
      priority_score: hir < 50 ? 83 : 67,
      title: "HIR Weakness",
      message: "핵심 타겟 접촉 강도가 약합니다.",
      scope: { level: "company", branch_keys: [] },
      evidence: { metric: "hir", current_value: hir, threshold: 60 },
      possible_explanations: ["방문 밀도 저하 가능성", "우선순위 계정 관리 약화 가능성"],
      decision_options: [{ option_code: "A" }, { option_code: "B" }]
    });
  }
  if (coverageRate > 0 && coverageRate < 0.6) {
    signals.push({
      signal_type: "territory_coverage_gap",
      severity: coverageRate < 0.4 ? "critical" : "warning",
      priority_score: coverageRate < 0.4 ? 79 : 63,
      title: "Territory Coverage Gap",
      message: "커버리지 연결률이 낮아 담당 구역 품질 검토가 필요합니다.",
      scope: { level: "company", branch_keys: branchOptions },
      evidence: { metric: "coverage_rate", current_value: Number((coverageRate * 100).toFixed(1)), threshold: 60 },
      possible_explanations: ["CRM/Sales/Target 조인 부족", "거래처 배정 누락 가능성"],
      decision_options: [{ option_code: "A" }, { option_code: "B" }]
    });
  }

  const status =
    signals.some((signal) => signal.severity === "critical")
      ? "critical"
      : signals.length > 0
        ? "warning"
        : "normal";
  const topSignal = [...signals].sort((left, right) => right.priority_score - left.priority_score)[0] ?? null;

  const trendLabels = monthlyKpi11.map((item) => {
    const month = cleanText(item.metric_month);
    return month.length === 6 ? `${month.slice(0, 4)}.${month.slice(4, 6)}` : month;
  });
  const trendChart = {
    labels: trendLabels,
    goal_attainment: trendLabels.map(() => goalAttainment),
    rtr: monthlyKpi11.map((item) => toNumber((item.metric_set as Record<string, unknown> | undefined)?.rtr)),
    hir: monthlyKpi11.map((item) => toNumber((item.metric_set as Record<string, unknown> | undefined)?.hir))
  };

  const confidenceBase = [goalAttainment > 0, rtr > 0, hir > 0, pv > 0, branchOptions.length > 0].filter(Boolean).length;
  const confidence = Number((confidenceBase / 5).toFixed(2));

  const asset = {
    schema_version: "radar_result_asset_v1",
    asset_type: "radar_result_asset",
    source_module: "radar",
    generated_at: new Date().toISOString(),
    overall_status: status,
    report_title: "RADAR Decision Brief",
    period_label: cleanText(sandboxCustom.reference_month) || trendLabels.at(-1) || "latest",
    top_issue: topSignal?.title || "No major signal",
    top_issue_desc: topSignal?.message || "현재 기준으로 우선 경고 신호가 확인되지 않았습니다.",
    decision_readiness: topSignal?.priority_score ?? Math.round(avg([goalAttainment, rtr, hir].filter((value) => value > 0))),
    validation_status: status === "critical" ? "REVIEW" : "APPROVED",
    signal_count: signals.length,
    branch_options: branchOptions,
    confidence,
    kpi_snapshot: {
      goal_attainment_pct: goalAttainment,
      pv_change_pct: pv > 0 ? Number((pv - 100).toFixed(1)) : 0,
      hir,
      rtr
    },
    signals,
    trend_chart: trendChart,
    kpi_summary: {
      crm_month_count: monthlyKpi11.length,
      sandbox_hospital_count: toNumber(sandboxSummary.total_hospitals),
      territory_branch_count: branchOptions.length,
      prescription_gap_count: toNumber(
        (input.prescriptionAsset?.validation_gap_summary as Record<string, unknown> | undefined)?.total_gaps
      )
    },
    scope_summaries: {
      branch_count: branchOptions.length,
      company_scope: true
    },
    validation_summary: {
      status: status === "critical" ? "needs_review" : "pass",
      signal_count: signals.length
    },
    sandbox_summary: {
      total_hospitals: toNumber(sandboxSummary.total_hospitals),
      avg_attainment_rate: toNumber(sandboxSummary.avg_attainment_rate)
    },
    planned_handoff_modules: ["builder"]
  };

  return { asset, rowCount: signals.length };
}
