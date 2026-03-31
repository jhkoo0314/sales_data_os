import { readLatestKpiModuleResult } from "@/lib/server/kpi";
import { cleanText, readStandardizedPayload, toMonthToken, toNumber } from "@/lib/server/kpi/shared";

type MonthSeries = number[];

type ActivityCounts = Record<string, number>;

type ProductSummary = {
  achieve?: number;
  monthly_actual: MonthSeries;
  monthly_target: MonthSeries;
  layer1: Record<string, unknown>;
  analysis: Record<string, unknown>;
  activity_counts: ActivityCounts;
  avg?: Record<string, number>;
};

type MemberSummary = {
  성명: string;
  rep_id: string;
  branch_name: string;
  지점순위?: number;
  monthly_actual: MonthSeries;
  monthly_target: MonthSeries;
  layer1: Record<string, unknown>;
  analysis: Record<string, unknown>;
  activity_counts: ActivityCounts;
  prod_analysis: Record<string, ProductSummary>;
  prod_matrix: Array<Record<string, unknown>>;
  HIR: number;
  RTR: number;
  BCR: number;
  PHR: number;
  PI: number;
  FGR: number;
  efficiency: number;
  sustainability: number;
  gini: number;
  coach_scenario: string;
  coach_action: string;
};

type BranchSummary = {
  branch_key: string;
  branch_name: string;
  monthly_actual: MonthSeries;
  monthly_target: MonthSeries;
  layer1: Record<string, unknown>;
  analysis: Record<string, unknown>;
  avg: Record<string, number>;
  activity_counts: ActivityCounts;
  prod_analysis: Record<string, ProductSummary>;
  members: MemberSummary[];
};

type RepWorking = {
  rep_id: string;
  rep_name: string;
  branch_name: string;
  monthly_actual: MonthSeries;
  monthly_target: MonthSeries;
  products: Record<string, { monthly_actual: MonthSeries; monthly_target: MonthSeries }>;
  activity_counts: ActivityCounts;
};

const BEHAVIOR_KEYS = ["PT", "Demo", "Closing", "Needs", "FaceToFace", "Contact", "Access", "Feedback"];

function createSeries(): MonthSeries {
  return Array.from({ length: 12 }, () => 0);
}

function createActivityCounts(): ActivityCounts {
  return Object.fromEntries(BEHAVIOR_KEYS.map((key) => [key, 0]));
}

function normalizeBehaviorKey(raw: unknown): string {
  const token = cleanText(raw).toLowerCase();
  if (token === "pt" || token === "제품설명") return "PT";
  if (token === "demo" || token === "시연" || token === "행사" || token === "디지털") return "Demo";
  if (token === "closing" || token === "클로징") return "Closing";
  if (token === "needs" || token === "니즈환기") return "Needs";
  if (token === "contact" || token === "컨택" || token === "전화" || token === "이메일" || token === "화상") {
    return "Contact";
  }
  if (token === "access" || token === "접근") return "Access";
  if (token === "feedback" || token === "피드백") return "Feedback";
  return "FaceToFace";
}

function latestActiveIndex(series: MonthSeries): number {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (Number(series[index] || 0) > 0) return index;
  }
  return Math.max(0, series.length - 1);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function growthRate(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function seriesLayerPoint(actual: number, target: number, previousActual: number): Record<string, unknown> {
  const attainment = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;
  const gapAmount = Number((actual - target).toFixed(0));
  return {
    actual: Number(actual.toFixed(0)),
    target: Number(target.toFixed(0)),
    attainment_rate: attainment,
    gap_amount: gapAmount,
    gap_million: Number((gapAmount / 1_000_000).toFixed(1)),
    pi: Number(attainment.toFixed(1)),
    fgr: growthRate(actual, previousActual),
    scale: 25
  };
}

function buildLayer1(monthlyActual: MonthSeries, monthlyTarget: MonthSeries): Record<string, unknown> {
  const monthly = monthlyActual.map((actual, index) =>
    seriesLayerPoint(actual, monthlyTarget[index] ?? 0, index > 0 ? monthlyActual[index - 1] ?? 0 : 0)
  );
  const quarterly = [0, 1, 2, 3].map((quarterIndex) => {
    const start = quarterIndex * 3;
    const actual = monthlyActual.slice(start, start + 3).reduce((sum, value) => sum + value, 0);
    const target = monthlyTarget.slice(start, start + 3).reduce((sum, value) => sum + value, 0);
    const previousActual =
      quarterIndex > 0 ? monthlyActual.slice(start - 3, start).reduce((sum, value) => sum + value, 0) : 0;
    return seriesLayerPoint(actual, target, previousActual);
  });
  const yearlyActual = monthlyActual.reduce((sum, value) => sum + value, 0);
  const yearlyTarget = monthlyTarget.reduce((sum, value) => sum + value, 0);
  return {
    monthly,
    quarterly,
    yearly: [seriesLayerPoint(yearlyActual, yearlyTarget, 0)]
  };
}

function withFixedScale(layer1: Record<string, unknown>, scale: number): Record<string, unknown> {
  const rewriteSeries = (rows: unknown): unknown =>
    Array.isArray(rows)
      ? rows.map((row) =>
          row && typeof row === "object"
            ? {
                ...(row as Record<string, unknown>),
                scale
              }
            : row
        )
      : rows;

  return {
    ...layer1,
    monthly: rewriteSeries(layer1.monthly),
    quarterly: rewriteSeries(layer1.quarterly),
    yearly: rewriteSeries(layer1.yearly)
  };
}

function buildImportance(activityCounts: ActivityCounts): Record<string, number> {
  const total = Object.values(activityCounts).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return Object.fromEntries(BEHAVIOR_KEYS.map((key) => [key, 0]));
  }
  return Object.fromEntries(
    Object.entries(activityCounts).map(([key, value]) => [key, Number((value / total).toFixed(2))])
  );
}

function calcCorrelation(rows: Array<Record<string, number>>, left: string, right: string): number {
  if (rows.length < 2) return left === right ? 1 : 0;
  const xs = rows.map((row) => Number(row[left] ?? 0));
  const ys = rows.map((row) => Number(row[right] ?? 0));
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const numerator = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0);
  const denomX = Math.sqrt(xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0));
  const denomY = Math.sqrt(ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0));
  if (!denomX || !denomY) return left === right ? 1 : 0;
  return Number(Math.max(-1, Math.min(1, numerator / (denomX * denomY))).toFixed(2));
}

function buildCorrelationMatrix(rows: Array<Record<string, number>>): Record<string, Record<string, number>> {
  const keys = ["HIR", "RTR", "BCR", "PHR", "PI", "FGR"];
  return Object.fromEntries(
    keys.map((left) => [
      left,
      Object.fromEntries(keys.map((right) => [right, calcCorrelation(rows, left, right)]))
    ])
  );
}

function averageMetric(members: MemberSummary[], key: keyof MemberSummary): number {
  if (!members.length) return 0;
  const total = members.reduce((sum, member) => sum + Number(member[key] ?? 0), 0);
  return Number((total / members.length).toFixed(1));
}

function buildAverageMetricsFromRow(metricRow: Record<string, number>): Record<string, number> {
  return {
    HIR: Number((metricRow.HIR ?? 0).toFixed(1)),
    RTR: Number((metricRow.RTR ?? 0).toFixed(1)),
    BCR: Number((metricRow.BCR ?? 0).toFixed(1)),
    PHR: Number((metricRow.PHR ?? 0).toFixed(1)),
    PI: Number((metricRow.PI ?? 0).toFixed(1)),
    FGR: Number((metricRow.FGR ?? 0).toFixed(1))
  };
}

function buildProductAnalysis(
  products: RepWorking["products"],
  activityCounts: ActivityCounts,
  options?: {
    avg?: Record<string, number>;
    metricRows?: Array<Record<string, number>>;
    layerScale?: number;
  }
): Record<string, ProductSummary> {
  const avgMetrics = options?.avg ?? {};
  const metricRows = options?.metricRows ?? [];
  const layerScale = options?.layerScale ?? 25;
  const analysis = {
    importance: buildImportance(activityCounts),
    correlation: buildCorrelationMatrix(metricRows),
    adj_correlation: buildCorrelationMatrix(metricRows),
    ccf: []
  };

  return Object.fromEntries(
    Object.entries(products).map(([productName, product]) => [
      productName,
      {
        achieve:
          product.monthly_target.reduce((sum, value) => sum + Number(value ?? 0), 0) > 0
            ? Number(
                (
                  (product.monthly_actual.reduce((sum, value) => sum + Number(value ?? 0), 0) /
                    product.monthly_target.reduce((sum, value) => sum + Number(value ?? 0), 0)) *
                  100
                ).toFixed(1)
              )
            : 0,
        monthly_actual: product.monthly_actual,
        monthly_target: product.monthly_target,
        layer1: withFixedScale(buildLayer1(product.monthly_actual, product.monthly_target), layerScale),
        analysis,
        activity_counts: { ...activityCounts },
        avg: avgMetrics
      }
    ])
  );
}

function buildProdMatrix(products: RepWorking["products"]): Array<Record<string, unknown>> {
  const totalSales = Object.values(products).reduce(
    (sum, product) => sum + product.monthly_actual.reduce((inner, value) => inner + value, 0),
    0
  );
  return Object.entries(products)
    .map(([name, product]) => {
      const totalProductSales = product.monthly_actual.reduce((sum, value) => sum + value, 0);
      const lastIndex = latestActiveIndex(product.monthly_actual);
      const previousIndex = Math.max(0, lastIndex - 1);
      return {
        name,
        ms: totalSales > 0 ? Number(((totalProductSales / totalSales) * 100).toFixed(1)) : 0,
        growth: growthRate(product.monthly_actual[lastIndex] ?? 0, product.monthly_actual[previousIndex] ?? 0)
      };
    })
    .sort((left, right) => Number(right.ms) - Number(left.ms));
}

function buildMemberSummary(
  rep: RepWorking,
  crmMetricMap: Map<string, Record<string, unknown>>,
  months: string[]
): MemberSummary {
  const latestMonth = months[latestActiveIndex(rep.monthly_actual)] ?? months[months.length - 1] ?? "";
  const metricSet = (crmMetricMap.get(`${rep.rep_id}::${latestMonth}`) ?? {}) as Record<string, unknown>;
  const latestIndex = latestActiveIndex(rep.monthly_actual);
  const previousIndex = Math.max(0, latestIndex - 1);
  const yearlySales = rep.monthly_actual.reduce((sum, value) => sum + value, 0);
  const yearlyTarget = rep.monthly_target.reduce((sum, value) => sum + value, 0);
  const monthlyLatestSales = rep.monthly_actual[latestIndex] ?? 0;
  const monthlyPrevSales = rep.monthly_actual[previousIndex] ?? 0;
  const activityCounts = { ...rep.activity_counts };
  const hir = clampPercent(toNumber(metricSet.hir) * 25);
  const rtr = clampPercent(toNumber(metricSet.rtr));
  const bcr = clampPercent(toNumber(metricSet.bcr));
  const phrRaw = toNumber(metricSet.phr);
  const phr = clampPercent(phrRaw > 1 ? phrRaw : phrRaw * 100);
  const pi = yearlyTarget > 0 ? Number(((yearlySales / yearlyTarget) * 100).toFixed(1)) : 0;
  const fgr = growthRate(monthlyLatestSales, monthlyPrevSales);
  const efficiency = clampPercent(pi * 0.6 + Math.min(40, Object.values(activityCounts).reduce((sum, value) => sum + value, 0) / 20));
  const sustainability = Number(((hir + rtr + bcr + phr) / 4).toFixed(1));
  const prodMatrix = buildProdMatrix(rep.products);
  const gini = Number(
    (
      prodMatrix.reduce((sum, item) => {
        const share = Number(item.ms ?? 0) / 100;
        return sum + share * share;
      }, 0)
    ).toFixed(2)
  );
  const metricRow = { HIR: hir, RTR: rtr, BCR: bcr, PHR: phr, PI: pi, FGR: fgr };
  const avgMetrics = buildAverageMetricsFromRow(metricRow);
  const productAnalysis = buildProductAnalysis(rep.products, activityCounts, {
    avg: avgMetrics,
    metricRows: [metricRow],
    layerScale: 1
  });

  return {
    성명: rep.rep_name,
    rep_id: rep.rep_id,
    branch_name: rep.branch_name,
    monthly_actual: rep.monthly_actual,
    monthly_target: rep.monthly_target,
    layer1: withFixedScale(buildLayer1(rep.monthly_actual, rep.monthly_target), 1),
    analysis: {
      importance: buildImportance(activityCounts),
      correlation: buildCorrelationMatrix([{ HIR: hir, RTR: rtr, BCR: bcr, PHR: phr, PI: pi, FGR: fgr }]),
      adj_correlation: buildCorrelationMatrix([{ HIR: hir, RTR: rtr, BCR: bcr, PHR: phr, PI: pi, FGR: fgr }]),
      ccf: []
    },
    activity_counts: activityCounts,
    prod_analysis: productAnalysis,
    prod_matrix: prodMatrix,
    HIR: hir,
    RTR: rtr,
    BCR: bcr,
    PHR: phr,
    PI: pi,
    FGR: fgr,
    efficiency,
    sustainability,
    gini,
    coach_scenario: pi >= 100 ? "현 수준 유지와 상위 품목 집중이 적절합니다." : "목표 미달 품목 보강 액션이 필요합니다.",
    coach_action: gini > 0.35 ? "주력 품목 쏠림을 줄이고 보조 품목 접점을 늘리세요." : "현재 포트폴리오 분산을 유지하세요."
  };
}

function aggregateBranchMembers(branchName: string, members: MemberSummary[]): BranchSummary {
  const monthlyActual = createSeries();
  const monthlyTarget = createSeries();
  const productRows: RepWorking["products"] = {};
  const branchActivityCounts = createActivityCounts();
  for (const member of members) {
    member.monthly_actual.forEach((value, index) => {
      monthlyActual[index] += value;
      monthlyTarget[index] += member.monthly_target[index] ?? 0;
    });
    for (const [activityKey, activityValue] of Object.entries(member.activity_counts)) {
      branchActivityCounts[activityKey] = (branchActivityCounts[activityKey] ?? 0) + Number(activityValue ?? 0);
    }
    for (const [productName, product] of Object.entries(member.prod_analysis)) {
      productRows[productName] ??= { monthly_actual: createSeries(), monthly_target: createSeries() };
      product.monthly_actual.forEach((value, index) => {
        productRows[productName].monthly_actual[index] += Number(value ?? 0);
        productRows[productName].monthly_target[index] += Number(product.monthly_target[index] ?? 0);
      });
    }
  }

  const avg = {
    HIR: averageMetric(members, "HIR"),
    RTR: averageMetric(members, "RTR"),
    BCR: averageMetric(members, "BCR"),
    PHR: averageMetric(members, "PHR"),
    PI: averageMetric(members, "PI"),
    FGR: averageMetric(members, "FGR"),
    efficiency: averageMetric(members, "efficiency"),
    sustainability: averageMetric(members, "sustainability"),
    gini: Number((members.reduce((sum, member) => sum + member.gini, 0) / Math.max(members.length, 1)).toFixed(2))
  };
  const metricRows = members.map((member) => ({
    HIR: member.HIR,
    RTR: member.RTR,
    BCR: member.BCR,
    PHR: member.PHR,
    PI: member.PI,
    FGR: member.FGR
  }));

  const rankedMembers = [...members]
    .sort((left, right) => {
      if (right.PI !== left.PI) {
        return right.PI - left.PI;
      }
      const rightSales = right.monthly_actual.reduce((sum, value) => sum + Number(value ?? 0), 0);
      const leftSales = left.monthly_actual.reduce((sum, value) => sum + Number(value ?? 0), 0);
      return rightSales - leftSales;
    })
    .map((member, index) => ({
      ...member,
      지점순위: index + 1
    }));

  return {
    branch_key: branchName,
    branch_name: branchName,
    monthly_actual: monthlyActual,
    monthly_target: monthlyTarget,
    layer1: buildLayer1(monthlyActual, monthlyTarget),
    analysis: {
      importance: buildImportance(branchActivityCounts),
      correlation: buildCorrelationMatrix(metricRows),
      adj_correlation: buildCorrelationMatrix(metricRows),
      ccf: []
    },
    avg,
    activity_counts: branchActivityCounts,
    prod_analysis: buildProductAnalysis(productRows, branchActivityCounts, {
      avg,
      metricRows
    }),
    members: rankedMembers.sort((left, right) => left.성명.localeCompare(right.성명, "ko"))
  };
}

export async function buildSandboxTemplatePayloadData(input: {
  companyKey: string;
  asset: Record<string, unknown>;
  period: { months: string[]; start_month: string | null; end_month: string | null; label: string };
  reportTitle: string;
}): Promise<Record<string, unknown>> {
  const { companyKey, asset, period, reportTitle } = input;
  const sales = await readStandardizedPayload(companyKey, "sandbox", "standardized_sales_records.json");
  const target = await readStandardizedPayload(companyKey, "sandbox", "standardized_target_records.json");
  const crmActivity = await readStandardizedPayload(companyKey, "crm", "standardized_crm_activity.json");
  const crmAsset = (await readLatestKpiModuleResult(companyKey, "crm")) ?? {};
  const months = period.months.length ? period.months : (((asset.metric_months as unknown[]) ?? []) as string[]);
  const monthIndex = new Map(months.map((month, index) => [month, index]));

  const behaviorProfiles = (((crmAsset.behavior_profiles as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    rep_id: cleanText(row.rep_id),
    rep_name: cleanText(row.rep_name),
    branch_name: cleanText(row.branch_name) || cleanText(row.branch_id) || "미지정지점"
  }));
  const profileByRepId = new Map(behaviorProfiles.map((row) => [row.rep_id, row]));
  const crmMetricMap = new Map<string, Record<string, unknown>>();
  for (const row of (((crmAsset.rep_monthly_kpi_11 as unknown[]) ?? []) as Array<Record<string, unknown>>)) {
    crmMetricMap.set(`${cleanText(row.rep_id)}::${toMonthToken(row.metric_month)}`, (row.metric_set ?? {}) as Record<string, unknown>);
  }

  const reps = new Map<string, RepWorking>();
  const getRep = (repId: string, repName: string, branchName: string): RepWorking => {
    if (!reps.has(repId)) {
      reps.set(repId, {
        rep_id: repId,
        rep_name: repName || repId || "미지정 담당자",
        branch_name: branchName || "미지정지점",
        monthly_actual: createSeries(),
        monthly_target: createSeries(),
        products: {},
        activity_counts: createActivityCounts()
      });
    }
    return reps.get(repId) as RepWorking;
  };

  for (const row of sales?.rows ?? []) {
    const repId = cleanText(row["영업사원코드"]) || cleanText((profileByRepId.get(cleanText(row["영업사원코드"])) ?? {}).rep_id);
    const profile = (profileByRepId.get(repId) ?? {}) as Record<string, unknown>;
    const repName = cleanText(row["영업사원명"]) || cleanText(profile.rep_name) || repId;
    const branchName = cleanText(row["본부명"]) || cleanText(profile.branch_name) || "미지정지점";
    const month = toMonthToken(row.period || row["기준년월"]);
    const index = monthIndex.get(month);
    if (index === undefined) continue;
    const rep = getRep(repId, repName, branchName);
    const amount = toNumber(row.amount || row["매출금액"]);
    rep.monthly_actual[index] += amount;
    const productName = cleanText(row["브랜드명"]) || cleanText(row.product) || "미분류 품목";
    rep.products[productName] ??= { monthly_actual: createSeries(), monthly_target: createSeries() };
    rep.products[productName].monthly_actual[index] += amount;
  }

  for (const row of target?.rows ?? []) {
    const repId = cleanText(row["영업사원코드"]) || cleanText((profileByRepId.get(cleanText(row["영업사원코드"])) ?? {}).rep_id);
    const profile = (profileByRepId.get(repId) ?? {}) as Record<string, unknown>;
    const repName = cleanText(row["영업사원명"]) || cleanText(profile.rep_name) || repId;
    const branchName = cleanText(row["본부명"]) || cleanText(profile.branch_name) || "미지정지점";
    const month = toMonthToken(row.period || row["기준년월"]);
    const index = monthIndex.get(month);
    if (index === undefined) continue;
    const rep = getRep(repId, repName, branchName);
    const amount = toNumber(row.target_value || row["계획금액"]);
    rep.monthly_target[index] += amount;
    const productName = cleanText(row["브랜드명"]) || cleanText(row.product) || "미분류 품목";
    rep.products[productName] ??= { monthly_actual: createSeries(), monthly_target: createSeries() };
    rep.products[productName].monthly_target[index] += amount;
  }

  for (const row of crmActivity?.rows ?? []) {
    const repId = cleanText(row["영업사원코드"]);
    const rep = reps.get(repId);
    if (!rep) continue;
    const behavior = normalizeBehaviorKey(row.activity_type || row["액션유형"]);
    rep.activity_counts[behavior] = (rep.activity_counts[behavior] ?? 0) + 1;
  }

  const members = Array.from(reps.values())
    .filter((rep) => rep.rep_id)
    .map((rep) => buildMemberSummary(rep, crmMetricMap, months));

  const branches = Object.fromEntries(
    Array.from(
      members.reduce((map, member) => {
        const rows = map.get(member.branch_name) ?? [];
        rows.push(member);
        map.set(member.branch_name, rows);
        return map;
      }, new Map<string, MemberSummary[]>()).entries()
    )
      .sort(([left], [right]) => left.localeCompare(right, "ko"))
      .map(([branchName, branchMembers]) => [branchName, aggregateBranchMembers(branchName, branchMembers)])
  ) as Record<string, BranchSummary>;

  const total = aggregateBranchMembers("TOTAL", members);
  const analysisSummary = ((asset.analysis_summary as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const domainQuality = ((asset.domain_quality as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const joinQuality = ((asset.join_quality as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const customMetrics = ((analysisSummary.custom_metrics as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const integrityScore = clampPercent(
    toNumber(
      customMetrics.sandbox_proxy_integrity_score,
      Number(
        Math.min(
          100,
          toNumber(joinQuality.crm_sales_join_rate) * 50 +
            toNumber(joinQuality.full_join_rate) * 40 +
            (toNumber(domainQuality.target_record_count) > 0 ? 10 : 0)
        ).toFixed(1)
      )
    )
  );

  return {
    overview: {
      report_title: reportTitle,
      period_label: period.label
    },
    official_kpi_6: (analysisSummary.custom_metrics ?? {}) as Record<string, unknown>,
    total: {
      ...total,
      achieve: Number((((analysisSummary.total_sales_amount as number) ?? 0) / Math.max(toNumber(analysisSummary.total_target_amount), 1) * 100).toFixed(1))
    },
    total_prod_analysis: total.prod_analysis,
    products: Object.keys(total.prod_analysis),
    branches,
    data_health: {
      integrity_score: integrityScore,
      domain_quality: domainQuality,
      join_quality: joinQuality
    },
    missing_data: [
      { metric: "orphan_sales_hospitals", value: toNumber(joinQuality.orphan_sales_hospitals) },
      { metric: "orphan_crm_hospitals", value: toNumber(joinQuality.orphan_crm_hospitals) }
    ],
    executive_insight: {
      messages: [
        `${period.label} 기준 목표 달성률은 ${toNumber((analysisSummary.custom_metrics as Record<string, unknown> | undefined)?.annual_attainment_rate).toFixed(1)}%입니다.`,
        `지점 수 ${Object.keys(branches).length}개, 담당자 수 ${members.length}명 범위로 샌드박스 리포트를 구성했습니다.`,
        integrityScore >= 80 ? "지점/담당자 연결 상태가 안정적입니다." : "지점/담당자 연결 상태를 추가 점검해야 합니다."
      ]
    }
  };
}
