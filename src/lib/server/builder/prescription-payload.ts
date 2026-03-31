import { readStandardizedPayload, toNumber } from "@/lib/server/kpi/shared";
import type { ModuleValidationSummary } from "@/lib/server/validation/types";

type PeriodInfo = {
  months: string[];
  start_month: string | null;
  end_month: string | null;
  label: string;
};

type PrescriptionRow = Record<string, unknown>;
const REGION_KEYS = new Set([
  "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
  "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주"
]);

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function monthLabel(monthKey: string): string {
  if (/^\d{6}$/.test(monthKey)) {
    return `${monthKey.slice(0, 4)}-${monthKey.slice(4, 6)}`;
  }
  return monthKey;
}

function quarterFromMonth(monthKey: string): string {
  if (!/^\d{6}$/.test(monthKey)) return "";
  const year = monthKey.slice(0, 4);
  const quarter = Math.floor((Number(monthKey.slice(4, 6)) - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function meaningfulText(...values: unknown[]): string {
  for (const value of values) {
    const text = clean(value);
    if (!text) continue;
    if (/^[0-9.\-]+$/.test(text)) continue;
    return text;
  }
  return clean(values[0]);
}

function looksLikeRegion(value: unknown): boolean {
  const text = clean(value);
  return REGION_KEYS.has(text);
}

function looksBrokenNumeric(value: unknown): boolean {
  const text = clean(value);
  return Boolean(text) && /^[0-9.\"]+$/.test(text);
}

function inferProductName(row: PrescriptionRow): string {
  return meaningfulText(
    row["sku (SKU)"],
    row.sku,
    row["formulation (제형)"],
    row.formulation,
    row["data_source (데이터소스)"],
    row.data_source,
    row["product_name"],
    row.product_name,
    row["brand_name"],
    row.brand_name,
    row["brand (브랜드)"],
    row.brand,
    row.product,
    "미분류 품목"
  );
}

function inferQuantity(row: PrescriptionRow): number {
  const textCandidates = [row.quantity, row["qty (수량)"], row.qty, row["amount_ship (출고금액)"], row.amount_ship];
  const parsed = textCandidates
    .map((value) => {
      const text = clean(value);
      if (!text) return 0;
      if (!/[0-9]/.test(text)) return 0;
      const digits = text.replace(/[^0-9.\-]/g, "");
      return toNumber(digits);
    })
    .filter((value) => value > 0 && value < 100000);
  return parsed.length ? Math.max(...parsed) : 0;
}

function inferAmount(row: PrescriptionRow): number {
  const candidates = [
    toNumber(row.amount),
    toNumber(row["공급가액"]),
    toNumber(row["amount_ship (출고금액)"]),
    toNumber(row.amount_ship),
    toNumber(row["data_source (데이터소스)"]),
    toNumber(row.data_source)
  ].filter((value) => value > 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

function statusFromVariance(rate: number): "PASS" | "WARNING" | "SUSPECT" {
  if (Math.abs(rate) <= 0.05) return "PASS";
  if (Math.abs(rate) <= 0.15) return "WARNING";
  return "SUSPECT";
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string): Record<string, T[]> {
  return rows.reduce<Record<string, T[]>>((acc, row) => {
    const key = keyFn(row);
    if (!key) return acc;
    acc[key] ??= [];
    acc[key].push(row);
    return acc;
  }, {});
}

function pickConsoleStatus(rows: Array<Record<string, unknown>>): string {
  if (rows.some((row) => String(row.verdict ?? row.status ?? "").toUpperCase() === "SUSPECT")) {
    return "SUSPECT";
  }
  if (rows.some((row) => {
    const value = String(row.verdict ?? row.status ?? "").toUpperCase();
    return value === "REVIEW" || value === "WARNING";
  })) {
    return "WARNING";
  }
  return "PASS";
}

export async function buildPrescriptionTemplatePayloadData(input: {
  companyKey: string;
  asset: Record<string, unknown>;
  period: PeriodInfo;
  reportTitle: string;
  summary: ModuleValidationSummary;
}): Promise<Record<string, unknown>> {
  const { companyKey, asset, period, summary } = input;
  const standardized = await readStandardizedPayload(
    companyKey,
    "prescription",
    "standardized_prescription_records.json"
  );
  const rawRows = (standardized?.rows ?? []) as PrescriptionRow[];
  const assetClaims: Array<Record<string, unknown>> = (((asset.claims as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    rep_name: String(row.rep_name ?? "") || "미지정",
    rep_id: String(row.rep_id ?? ""),
    branch_name: String(row.branch_name ?? ""),
    territory_group: String(row.territory_group ?? ""),
    territory_name: String(row.territory_name ?? row.territory ?? ""),
    hospital_name: String(row.hospital_name ?? ""),
    product_name: String(row.product_name ?? ""),
    verdict: String(row.verdict ?? "PASS").toUpperCase(),
    status: String(row.verdict ?? "PASS").toUpperCase()
  }));
  const flowRows: Array<Record<string, unknown>> = (((asset.flow_rows as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    month: String(row.month ?? ""),
    year_quarter: String(row.year_quarter ?? ""),
    year: String(row.year ?? ""),
    rep_name: String(row.rep_name ?? "") || "미지정",
    rep_id: String(row.rep_id ?? ""),
    branch_name: String(row.branch_name ?? ""),
    territory_group: String(row.territory_group ?? ""),
    territory_name: String(row.territory_name ?? ""),
    hospital_id: String(row.hospital_id ?? ""),
    hospital_name: String(row.hospital_name ?? ""),
    product_name: String(row.product_name ?? ""),
    flow_status: String(row.flow_status ?? "")
  }));
  const assetHospitalTraces: Array<Record<string, unknown>> = (((asset.hospital_traces as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    rep_name: String(row.rep_name ?? "") || "미지정"
  }));
  const assetRepKpis: Array<Record<string, unknown>> = (((asset.rep_kpis as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    rep_name: String(row.rep_name ?? "") || "미지정",
    territory_group: String(row.territory_group ?? ""),
    territory_name: String(row.territory_name ?? ""),
    product_name: String(row.product_name ?? ""),
    rule_applied: Boolean(row.rule_applied)
  }));

  const sortedClaims = [...assetClaims].sort((left, right) =>
    toNumber(right.tracked_amount) - toNumber(left.tracked_amount)
  );
  const detailClaims = sortedClaims.slice(0, 300);
  const detailHospitalTraces = assetHospitalTraces;
  const repKpis = assetRepKpis;
  const traceLogs: Array<Record<string, unknown>> = [];

  const groupedByMonth = groupBy(
    flowRows.filter((row) => String(row.flow_status ?? "") === "connected"),
    (row) => String(row.month ?? "")
  );
  const groupedByQuarter = groupBy(
    detailClaims.filter((row) => String(row.period_type ?? "") === "quarter"),
    (row) => String(row.year_quarter ?? "")
  );
  const groupedByTerritory = groupBy(flowRows, (row) => String(row.territory_group ?? ""));

  const flowSeries = Object.entries(groupedByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, rows]) => {
      const monthClaimRows = assetClaims.filter(
        (row) => String(row.period_type ?? "") === "month" && String(row.year_month ?? "") === monthKey
      );
      const wholesaleAmount = rows.reduce((sum, row) => sum + toNumber(row.total_amount), 0);
      const masteredAmount = rows
        .filter((row) => String(row.flow_status ?? "") === "connected")
        .reduce((sum, row) => sum + toNumber(row.total_amount), 0);
      const preShareAmount = monthClaimRows.reduce((sum, row) => sum + toNumber(row.claimed_amount), 0);
      const postShareAmount = monthClaimRows.reduce((sum, row) => sum + toNumber(row.tracked_amount), 0);
      return {
        label: monthKey,
        wholesale_amount: wholesaleAmount,
        mastered_amount: masteredAmount,
        tracked_amount: postShareAmount,
        final_amount: preShareAmount
      };
    });

  const flowSeriesByTerritory = Object.fromEntries(
    Object.entries(groupedByTerritory)
      .sort(([a], [b]) => a.localeCompare(b, "ko"))
      .map(([territoryGroup, rows]) => [
        territoryGroup,
        Object.entries(groupBy(rows, (row) => String(row.month ?? row.year_month ?? "")))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([monthKey, monthRows]) => {
            const monthClaimRows = assetClaims.filter(
              (row) =>
                String(row.period_type ?? "") === "month" &&
                String(row.year_month ?? "") === monthKey &&
                String(row.territory_group ?? "") === territoryGroup
            );
            return {
              label: monthKey,
              wholesale_amount: monthRows.reduce((sum, row) => sum + toNumber(row.total_amount), 0),
              mastered_amount: monthRows
                .filter((row) => String(row.flow_status ?? "") === "connected")
                .reduce((sum, row) => sum + toNumber(row.total_amount), 0),
              tracked_amount: monthClaimRows.reduce((sum, row) => sum + toNumber(row.tracked_amount), 0),
              final_amount: monthClaimRows.reduce((sum, row) => sum + toNumber(row.claimed_amount), 0)
            };
          })
      ])
  );

  const gapRows = (((asset.gaps as unknown[]) ?? []) as Array<Record<string, unknown>>).map((row) => ({
    period_type: "quarter",
    period_value: String(row.year_quarter ?? ""),
    year_quarter: String(row.year_quarter ?? ""),
    year_month: "",
    pharmacy_name: String(row.pharmacy_name ?? ""),
    product_name: String(row.product_name ?? ""),
    quantity: toNumber(row.quantity),
    gap_reason: String(row.gap_reason ?? "")
  }));

  const passCount = detailClaims.filter((row) => row.verdict === "PASS").length;
  const warningCount = detailClaims.filter((row) => row.verdict === "REVIEW" || row.verdict === "WARNING").length;
  const suspectCount = detailClaims.filter((row) => row.verdict === "SUSPECT").length;
  const ruleAppliedCount = repKpis.filter((row) => Boolean(row.rule_applied)).length;
  const ruleCoverage = Number((ruleAppliedCount / Math.max(repKpis.length, 1)).toFixed(4));
  const masteringRatio = toNumber((asset.mapping_quality as Record<string, unknown> | undefined)?.flow_completion_rate, 0);
  const trackingCoverage = Number(
    (
      flowRows.filter((row) => String(row.flow_status ?? "") === "connected").length /
      Math.max(flowRows.length, 1)
    ).toFixed(4)
  );
  const qualityScore = toNumber(summary.quality_score, 0);

  const quarterOptions = Array.from(new Set(flowRows.map((row) => String(row.year_quarter ?? "")).filter(Boolean))).sort();
  const monthOptions = Array.from(
    new Set(
      flowRows
        .map((row) => String(row.month ?? row.year_month ?? ""))
        .filter((value) => /^\d{4}-\d{2}$/.test(value))
    )
  ).sort();
  const territoryOptions = Array.from(
    new Set(repKpis.map((row) => String(row.territory_group ?? "")).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const suspectClaims = [...detailClaims]
    .filter((row) => row.verdict === "SUSPECT" || row.verdict === "REVIEW" || row.verdict === "WARNING")
    .sort((left, right) => Math.abs(toNumber(right.variance_rate)) - Math.abs(toNumber(left.variance_rate)));
  for (const row of suspectClaims.slice(0, 18)) {
    traceLogs.push({
      time: String(row.period_value ?? row.year_quarter ?? row.year_month ?? ""),
      case: String(row.trace_case ?? "CLAIM_VARIANCE"),
      detail: `${row.rep_name || "미지정"} / ${row.product_name || "품목없음"} / ${row.hospital_name || "병원없음"} : 차이율 ${(Math.abs(toNumber(row.variance_rate)) * 100).toFixed(1)}%`,
      sev: row.verdict === "SUSPECT" ? "high" : "med"
    });
  }
  for (const row of gapRows.slice(0, 10)) {
    traceLogs.push({
      time: String(row.year_quarter ?? row.period_value ?? ""),
      case: "UNMAPPED_PHARMACY",
      detail: `${row.pharmacy_name || "약국없음"} / ${row.product_name || "품목없음"} : ${row.gap_reason || "미확인"}`,
      sev: "high"
    });
  }
  for (const row of repKpis.filter((item) => !Boolean(item.rule_applied)).slice(0, 10)) {
    traceLogs.push({
      time: String(row.year_quarter ?? ""),
      case: "NO_SETTLEMENT_RULE",
      detail: `${row.rep_name || "미지정"} / ${row.product_name || "품목없음"} : 규칙 미적용`,
      sev: "low"
    });
  }
  if (!traceLogs.length) {
    traceLogs.push({
      time: "SYSTEM",
      case: "QUALITY_GATE",
      detail: `Prescription 품질 상태 ${String(summary.quality_status ?? "warn").toUpperCase()} / 점수 ${qualityScore.toFixed(1)}`,
      sev: "low"
    });
  }

  const consoleRows = assetClaims
    .filter((row) => {
      const periodType = String(row.period_type ?? "");
      return periodType === "month" || periodType === "quarter";
    })
    .map((row) => {
      const verdict = String(row.verdict ?? "PASS").toUpperCase();
      return {
        period_type: String(row.period_type ?? ""),
        period_value:
          String(row.period_type ?? "") === "month"
            ? String(row.year_month ?? row.period_value ?? "")
            : String(row.year_quarter ?? row.period_value ?? ""),
        year_quarter: String(row.year_quarter ?? row.period_value ?? ""),
        year_month: String(row.year_month ?? row.period_value ?? ""),
        rep_name: String(row.rep_name ?? "미지정"),
        rep_id: String(row.rep_id ?? ""),
        territory: String(row.territory_name ?? row.territory_group ?? row.branch_name ?? "미지정"),
        territory_group: String(row.territory_group ?? row.branch_name ?? ""),
        branch_name: String(row.branch_name ?? ""),
        brand: String(row.product_name ?? "품목없음"),
        claimed_amount: toNumber(row.claimed_amount),
        tracked_amount: toNumber(row.tracked_amount),
        status: verdict === "REVIEW" ? "WARNING" : verdict,
        variance_amount: toNumber(row.variance_amount),
        variance_rate: toNumber(row.variance_rate)
      };
    });

  return {
    payload_version: "prescription_builder_payload_chunked_v1",
    builder_contract_version: "builder_contract_v1",
    source_asset_schema_version: String(asset.schema_version ?? "prescription_result_asset_v1"),
    company: String(asset.company_name ?? meaningfulText(rawRows[0]?.["manufacturer_name (제약사)"], companyKey)),
    overview: {
      standard_record_count: standardized?.row_count ?? rawRows.length,
      flow_record_count: flowRows.length,
      gap_record_count: gapRows.length,
      connected_hospital_count: toNumber((asset.lineage_summary as Record<string, unknown> | undefined)?.unique_hospitals_connected),
      flow_completion_rate: masteringRatio,
      quality_status: String(summary.quality_status ?? "warn").toLowerCase(),
      quality_score: qualityScore,
      claim_validation_summary: {
        total_cases: detailClaims.length,
        pass_count: passCount,
        review_count: warningCount,
        suspect_count: suspectCount
      }
    },
    claims: detailClaims,
    gaps: gapRows,
    hospital_traces: detailHospitalTraces,
    rep_kpis: repKpis,
    pipeline_steps: [
      {
        step: "STEP 01",
        title: "Ingest Merge",
        metric: `${(standardized?.row_count ?? rawRows.length).toLocaleString("ko-KR")} Rows`,
        status: "complete"
      },
      {
        step: "STEP 02",
        title: "Mastering",
        metric: `Mapping: ${(masteringRatio * 100).toFixed(1)}%`,
        status: "complete"
      },
      {
        step: "STEP 03",
        title: "Tracking Val.",
        metric: `Coverage: ${(trackingCoverage * 100).toFixed(1)}%`,
        status: "complete"
      },
      {
        step: "STEP 04",
        title: "Share Settlement",
        metric: `${ruleAppliedCount.toLocaleString("ko-KR")} Rules Applied`,
        status: "complete"
      },
      {
        step: "STEP 05",
        title: "KPI Publish",
        metric: `Ready (${qualityScore.toFixed(1)})`,
        status: "complete"
      },
      {
        step: "STEP 06",
        title: "Validation",
        metric: `Validated (${qualityScore.toFixed(1)})`,
        status: "complete"
      }
    ],
    flow_summary: {
      total_wholesale_amount: flowSeries.reduce((sum, row) => sum + toNumber(row.wholesale_amount), 0),
      mastered_amount: flowSeries.reduce((sum, row) => sum + toNumber(row.mastered_amount), 0),
      tracked_amount: flowSeries.reduce((sum, row) => sum + toNumber(row.tracked_amount), 0),
      pre_kpi_final_amount: flowSeries.reduce((sum, row) => sum + toNumber(row.final_amount), 0)
    },
    flow_series: flowSeries,
    flow_series_by_territory: flowSeriesByTerritory,
    diagnostics: {
      mastering_ratio: masteringRatio,
      tracking_coverage: trackingCoverage,
      rule_coverage: ruleCoverage,
      high_severity: suspectCount,
      warnings: warningCount,
      quality_status: String(summary.quality_status ?? "warn").toLowerCase(),
      quality_score: qualityScore,
      rule_applied_count: ruleAppliedCount
    },
    filters: {
      quarters: quarterOptions,
      months: monthOptions,
      territories: territoryOptions,
      default_quarter: quarterOptions[quarterOptions.length - 1] ?? "",
      default_month: monthLabel(period.end_month ?? ""),
      default_territory: ""
    },
    console_rows: consoleRows,
    trace_logs: traceLogs.slice(0, 200),
    logic_reference: {
      settlement_basis: "도매 출고 흐름을 먼저 연결하고, 연결된 병원/담당자 기준으로 claim 금액과 tracked 금액을 나눠 계산합니다.",
      rule_version_note: "처방 원본 열 흔들림과 거래처명 차이는 KPI 단계에서 보정했고, share 규칙은 prescription_share_v1 기준으로 요약했습니다."
    },
    data_mode: "chunked_prescription_detail_assets_v1",
    asset_base: "",
    detail_asset_manifest: {},
    detail_asset_counts: {}
  };
}
