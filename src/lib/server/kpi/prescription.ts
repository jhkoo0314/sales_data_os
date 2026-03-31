import { promises as fs } from "node:fs";
import path from "node:path";

import {
  avg,
  cleanText,
  normalizeHospitalNameKey,
  readLookupRows,
  readStandardizedPayload,
  toMonthToken,
  toNumber
} from "@/lib/server/kpi/shared";

const REGION_KEYS = new Set([
  "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
  "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주"
]);

type PrescriptionRow = Record<string, unknown>;
type FlowRow = Record<string, unknown>;

async function tryLoadMasterOpsChunkRows(
  companyKey: string,
  bucket: "claims" | "rep_kpis" | "hospital_traces"
): Promise<Array<Record<string, unknown>> | null> {
  const chunkPath = path.join(
    "C:\\sfe_master_ops",
    "data",
    "ops_validation",
    companyKey,
    "prescription",
    "prescription_builder_payload_assets",
    `${bucket}__all.js`
  );
  try {
    const script = await fs.readFile(chunkPath, "utf8");
    const match = script.match(/=\s*(\[[\s\S]*\])\s*;\s*$/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]) as unknown;
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : null;
  } catch {
    return null;
  }
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function looksLikeRegion(value: unknown): boolean {
  return REGION_KEYS.has(clean(value));
}

function looksBrokenNumeric(value: unknown): boolean {
  const text = clean(value);
  return Boolean(text) && /^[0-9.\"]+$/.test(text);
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

function inferProductName(row: PrescriptionRow): string {
  return meaningfulText(
    row["sku (SKU)"],
    row.sku,
    row["formulation (제형)"],
    row.formulation,
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
  const candidates = [
    row.quantity,
    row["qty (수량)"],
    row.qty,
    row["amount_ship (출고금액)"],
    row.amount_ship
  ]
    .map((value) => {
      const text = clean(value);
      if (!text || !/[0-9]/.test(text)) return 0;
      const digits = text.replace(/[^0-9.\-]/g, "");
      return toNumber(digits);
    })
    .filter((value) => value > 0 && value < 100000);
  return candidates.length ? Math.max(...candidates) : 0;
}

function inferAmount(row: PrescriptionRow): number {
  const candidates = [
    row.amount,
    row["공급가액"],
    row["amount_ship (출고금액)"],
    row.amount_ship,
    row["data_source (데이터소스)"],
    row.data_source
  ]
    .map((value) => toNumber(value))
    .filter((value) => value > 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

function inferTerritoryGroup(row: PrescriptionRow): string {
  return meaningfulText(
    looksLikeRegion(row["pharmacy_region_key (약국시도)"]) ? row["pharmacy_region_key (약국시도)"] : "",
    looksLikeRegion(row.pharmacy_region_key) ? row.pharmacy_region_key : "",
    looksLikeRegion(row.territory_group) ? row.territory_group : "",
    looksLikeRegion(row["wholesaler_region_key (도매시도)"]) ? row["wholesaler_region_key (도매시도)"] : "",
    looksLikeRegion(row.pharmacy) ? row.pharmacy : ""
  );
}

function inferTerritoryName(row: PrescriptionRow, territoryGroup: string): string {
  return meaningfulText(
    !looksBrokenNumeric(row["pharmacy_sub_region_key (약국시군구)"]) ? row["pharmacy_sub_region_key (약국시군구)"] : "",
    !looksBrokenNumeric(row.pharmacy_sub_region_key) ? row.pharmacy_sub_region_key : "",
    territoryGroup
  );
}

function inferPharmacyName(row: PrescriptionRow): string {
  return meaningfulText(
    !looksLikeRegion(row["pharmacy_name (약국명)"]) ? row["pharmacy_name (약국명)"] : "",
    !looksLikeRegion(row.pharmacy) ? row.pharmacy : "",
    row["pharmacy_sub_region_key (약국시군구)"],
    row.hospital_name,
    "미지정 약국"
  );
}

function inferCompanyName(row: PrescriptionRow): string {
  return meaningfulText(row["manufacturer_name (제약사)"], row.manufacturer_name, "");
}

function toQuarterToken(month: string): string {
  if (!/^\d{6}$/.test(month)) return "";
  return `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(4, 6)) - 1) / 3) + 1}`;
}

function toMonthLabel(month: string): string {
  if (!/^\d{6}$/.test(month)) return month;
  return `${month.slice(0, 4)}-${month.slice(4, 6)}`;
}

function estimateSettlementRatio(key: string): number {
  let hash = 0;
  for (const ch of key) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  }
  return 0.018 + ((hash % 15) / 1000);
}

function estimateVarianceRate(key: string): number {
  let hash = 7;
  for (const ch of key) {
    hash = (hash * 17 + ch.charCodeAt(0)) % 7919;
  }
  return 0.03 + ((hash % 16) / 100);
}

function verdictFromVariance(rate: number): "PASS" | "REVIEW" | "SUSPECT" {
  if (Math.abs(rate) <= 0.05) return "PASS";
  if (Math.abs(rate) <= 0.15) return "REVIEW";
  return "SUSPECT";
}

function severityFromVerdict(verdict: string): "low" | "med" | "high" {
  if (verdict === "SUSPECT") return "high";
  if (verdict === "REVIEW") return "med";
  return "low";
}

function stableIndexFromKey(key: string, size: number): number {
  if (size <= 0) return 0;
  let hash = 0;
  for (const ch of key) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash % size;
}

function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }
  return groups;
}

function pickPrimaryText(rows: Array<Record<string, unknown>>, key: string, fallback = ""): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = cleanText(row[key]);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let winner = fallback;
  let winnerCount = -1;
  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }
  return winner;
}

export async function buildPrescriptionResultAsset(
  companyKey: string
): Promise<{ asset: Record<string, unknown>; rowCount: number } | null> {
  const prescription = await readStandardizedPayload(
    companyKey,
    "prescription",
    "standardized_prescription_records.json"
  );
  if (!prescription || !prescription.rows.length) {
    return null;
  }

  const lookup = await readLookupRows(companyKey);
  const assignment = await readStandardizedPayload(
    companyKey,
    "crm",
    "standardized_crm_account_assignment.json"
  );
  const companyName = inferCompanyName((prescription.rows[0] ?? {}) as PrescriptionRow) || companyKey;
  const regionRepMap = new Map<string, { repId: string; repName: string; branchId: string; branchName: string }>();
  const regionOnlyRepMap = new Map<string, { repId: string; repName: string; branchId: string; branchName: string }>();
  const repAccountPool = new Map<string, Array<{ accountId: string; accountName: string }>>();
  for (const row of (assignment?.rows ?? []) as PrescriptionRow[]) {
    const regionKey = cleanText(row["광역시도"] || row.region || row.branch_region);
    const subRegionKey = cleanText(row["시군구"] || row.sub_region);
    const accountId = cleanText(row.account_id || row["거래처코드"]);
    const accountName = cleanText(row.account_name || row["거래처명"]);
    const repId = cleanText(row.rep_id || row["영업사원코드"]);
    const repName = cleanText(row.rep_name || row["영업사원명"]);
    const branchId = cleanText(row.branch_id || row["본부코드"]);
    const branchName = cleanText(row.branch_name || row["본부명"]);
    if (!repId || !repName) continue;
    const payload = { repId, repName, branchId, branchName };
    if (regionKey && subRegionKey && !regionRepMap.has(`${regionKey}::${subRegionKey}`)) {
      regionRepMap.set(`${regionKey}::${subRegionKey}`, payload);
    }
    if (regionKey && !regionOnlyRepMap.has(regionKey)) {
      regionOnlyRepMap.set(regionKey, payload);
    }
    if (accountId || accountName) {
      const pool = repAccountPool.get(repId) ?? [];
      pool.push({ accountId, accountName });
      repAccountPool.set(repId, pool);
    }
  }

  const flowSeriesMap = new Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>();
  const territorySeriesMap = new Map<string, Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>>();
  const flowRows: FlowRow[] = [];
  const gapRecords: Array<Record<string, unknown>> = [];
  const territorySet = new Set<string>();
  const pharmacySet = new Set<string>();
  const flowHospitalIds = new Set<string>();
  const connectedHospitalIds = new Set<string>();

  for (const row of prescription.rows as PrescriptionRow[]) {
    const month = toMonthToken(row.ship_date || row["출고일"]);
    const monthLabel = toMonthLabel(month);
    const yearQuarter = toQuarterToken(month);
    const year = month.slice(0, 4);
    const territoryGroup = inferTerritoryGroup(row);
    const territory = inferTerritoryName(row, territoryGroup);
    const pharmacyName = inferPharmacyName(row);
    const pharmacyId = cleanText(
      row.pharmacy_account_id || row.hospital_id || row["pharmacy_account_id (약국거래처ID)"]
    );
    const product = inferProductName(row);
    const quantity = inferQuantity(row);
    const amount = inferAmount(row);
    const normalizedPharmacyKey = normalizeHospitalNameKey(pharmacyName);
    const subRegionRaw = cleanText(row["pharmacy_sub_region_key (약국시군구)"] || row.pharmacy_sub_region_key);
    const territoryTrimmed = territory.replace(territoryGroup, "").trim();
    const subRegionTrimmed = subRegionRaw.replace(territoryGroup, "").trim();
    const regionFallback =
      regionRepMap.get(`${territoryGroup}::${territory}`) ||
      regionRepMap.get(`${territoryGroup}::${subRegionRaw}`) ||
      (territoryTrimmed ? regionRepMap.get(`${territoryGroup}::${territoryTrimmed}`) : undefined) ||
      (subRegionTrimmed ? regionRepMap.get(`${territoryGroup}::${subRegionTrimmed}`) : undefined) ||
      regionOnlyRepMap.get(territoryGroup);
    const fallbackAccount =
      regionFallback && repAccountPool.has(regionFallback.repId)
        ? (() => {
            const pool = repAccountPool.get(regionFallback.repId) ?? [];
            if (!pool.length) return null;
            const key = pharmacyId || normalizedPharmacyKey || pharmacyName || `${territoryGroup}:${territory}`;
            return pool[stableIndexFromKey(key, pool.length)] ?? null;
          })()
        : null;
    const mapped =
      lookup.byAccountId.get(pharmacyId) ||
      lookup.byAccountName.get(pharmacyName) ||
      lookup.byAccountName.get(normalizedPharmacyKey) ||
      (regionFallback
        ? {
            accountId: fallbackAccount?.accountId || pharmacyId || normalizedPharmacyKey,
            accountName: fallbackAccount?.accountName || pharmacyName,
            repId: regionFallback.repId,
            repName: regionFallback.repName,
            branchId: regionFallback.branchId,
            branchName: regionFallback.branchName
          }
        : undefined);
    const repId = mapped?.repId ?? "";
    const repName = mapped?.repName ?? "";
    const branchId = mapped?.branchId ?? "";
    const branchName = mapped?.branchName ?? territoryGroup;
    const hospitalId = mapped?.accountId || pharmacyId || normalizedPharmacyKey;
    const hospitalName = mapped?.accountName || pharmacyName;
    const isConnected = Boolean(hospitalId && repId && territoryGroup && quantity > 0 && amount > 0);

    pharmacySet.add(pharmacyId || pharmacyName || "UNKNOWN");
    if (territoryGroup) {
      territorySet.add(territoryGroup);
    }
    if (hospitalId) {
      flowHospitalIds.add(hospitalId);
    }
    if (isConnected && hospitalId) {
      connectedHospitalIds.add(hospitalId);
    }

    const flow = flowSeriesMap.get(month) ?? { totalAmount: 0, totalQuantity: 0, flowCount: 0 };
    flow.totalAmount += amount;
    flow.totalQuantity += quantity;
    flow.flowCount += 1;
    flowSeriesMap.set(month, flow);

    if (territoryGroup) {
      const territoryMap = territorySeriesMap.get(territoryGroup) ?? new Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>();
      const territoryFlow = territoryMap.get(month) ?? { totalAmount: 0, totalQuantity: 0, flowCount: 0 };
      territoryFlow.totalAmount += amount;
      territoryFlow.totalQuantity += quantity;
      territoryFlow.flowCount += 1;
      territoryMap.set(month, territoryFlow);
      territorySeriesMap.set(territoryGroup, territoryMap);
    }

    flowRows.push({
      metric_month: month,
      year,
      year_quarter: yearQuarter,
      month: monthLabel,
      source_record_type: "wholesaler_shipment",
      flow_status: isConnected ? "connected" : "unmapped",
      wholesaler_id: cleanText(row.wholesaler_name || row["wholesaler_name (도매상명)"] || row["wholesaler_raw_name (도매원본명)"]),
      pharmacy_id: pharmacyId,
      hospital_id: hospitalId,
      hospital_name: hospitalName,
      hospital_type: "pharmacy",
      pharmacy_name: pharmacyName,
      rep_id: repId,
      rep_name: repName,
      branch_id: branchId,
      branch_name: branchName,
      territory_group: territoryGroup || branchName,
      territory_name: territory || territoryGroup || branchName,
      product_name: product,
      total_amount: amount,
      total_quantity: quantity
    });

    if (!isConnected) {
      gapRecords.push({
        metric_month: month,
        year_quarter: yearQuarter,
        pharmacy_name: hospitalName,
        product_name: product,
        product_id: product,
        quantity,
        gap_reason: !pharmacyId
          ? "pharmacy_account_id_missing"
          : !repId
            ? "rep_assignment_missing"
          : !territoryGroup
            ? "territory_group_missing"
            : !quantity
              ? "quantity_missing"
              : "amount_missing"
      });
    }
  }

  const flowSeries = [...flowSeriesMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, item]) => ({
      month_key: month,
      total_amount: Math.round(item.totalAmount),
      total_quantity: Math.round(item.totalQuantity),
      flow_count: item.flowCount
    }));

  const flowSeriesByTerritory = Object.fromEntries(
    [...territorySeriesMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([territory, monthMap]) => [
        territory,
        [...monthMap.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([month, item]) => ({
            month_key: month,
            total_amount: Math.round(item.totalAmount),
            total_quantity: Math.round(item.totalQuantity),
            flow_count: item.flowCount
          }))
      ])
  );

  const connectedBaseRows = flowRows.filter((row) => row.flow_status === "connected");
  const claimFactorPattern = [0.99, 1.04, 1.11, 0.92, 1.18];
  const claimGroupKeys = [
    "rep_id",
    "rep_name",
    "branch_name",
    "territory_group",
    "territory_name",
    "hospital_id",
    "hospital_name",
    "hospital_type",
    "product_name"
  ];

  function buildClaimCandidates(periodType: "month" | "quarter" | "year", periodField: "month" | "year_quarter" | "year", topN: number) {
    const grouped = [...groupBy(
      connectedBaseRows,
      (row) =>
        [
          row[periodField],
          ...claimGroupKeys.map((key) => row[key])
        ].map((value) => String(value ?? "")).join("::")
    ).values()].map((rows) => {
      const base = rows[0];
      const periodValue = String(base[periodField] ?? "");
      return {
        period_type: periodType,
        period_value: periodValue,
        period_label: periodValue,
        year: periodType === "year" ? periodValue : String(base.year ?? periodValue.slice(0, 4)),
        year_quarter: periodType === "quarter" ? periodValue : "",
        year_month: periodType === "month" ? periodValue : "",
        rep_id: String(base.rep_id ?? ""),
        rep_name: String(base.rep_name ?? ""),
        branch_name: String(base.branch_name ?? ""),
        territory_group: String(base.territory_group ?? ""),
        territory_name: String(base.territory_name ?? ""),
        hospital_id: String(base.hospital_id ?? ""),
        hospital_name: String(base.hospital_name ?? ""),
        hospital_type: String(base.hospital_type ?? "pharmacy"),
        product_name: String(base.product_name ?? ""),
        tracked_amount: Number(rows.reduce((sum, row) => sum + toNumber(row.total_amount), 0).toFixed(2)),
        pharmacy_count: new Set(rows.map((row) => String(row.pharmacy_id ?? ""))).size,
        wholesaler_count: new Set(rows.map((row) => String(row.wholesaler_id ?? ""))).size,
        active_month_count: new Set(rows.map((row) => String(row.metric_month ?? ""))).size,
        flow_count: rows.length
      };
    });

    return [...groupBy(grouped, (row) => String(row.period_value ?? "")).values()]
      .flatMap((rows) =>
        rows
          .sort((left, right) => toNumber(right.tracked_amount) - toNumber(left.tracked_amount))
          .slice(0, topN)
      );
  }

  const claimRows = [
    ...buildClaimCandidates("month", "month", 10),
    ...buildClaimCandidates("quarter", "year_quarter", 30),
    ...buildClaimCandidates("year", "year", 60)
  ].map((row, idx) => {
    const trackedAmount = toNumber(row.tracked_amount);
    const factor = claimFactorPattern[idx % claimFactorPattern.length] ?? 1;
    const claimedAmount = Number((trackedAmount * factor).toFixed(2));
    const varianceAmount = Number((claimedAmount - trackedAmount).toFixed(2));
    const varianceRate = trackedAmount > 0 ? Number((varianceAmount / trackedAmount).toFixed(4)) : 0;
    const absRate = Math.abs(varianceRate);
    const verdict = absRate <= 0.05 ? "PASS" : absRate <= 0.15 ? "REVIEW" : "SUSPECT";
    return {
      claim_case_id: `PDF-CLAIM-${String(idx + 1).padStart(3, "0")}`,
      ...row,
      claimed_amount: claimedAmount,
      variance_amount: varianceAmount,
      variance_rate: varianceRate,
      verdict,
      severity: verdict === "PASS" ? "low" : verdict === "REVIEW" ? "med" : "high",
      trace_case: verdict === "PASS" ? "CLAIM_CONFIRMED" : verdict === "REVIEW" ? "CLAIM_REVIEW" : "CLAIM_VARIANCE"
    };
  });

  const repKpiBaseRows = [...groupBy(
    connectedBaseRows,
    (row) =>
      [
        row.year_quarter,
        row.rep_id,
        row.rep_name,
        row.branch_id,
        row.branch_name,
        row.product_name
      ].map((value) => String(value ?? "")).join("::")
  ).values()].map((rows) => {
    const base = rows[0];
    return {
      year_quarter: String(base.year_quarter ?? ""),
      rep_id: String(base.rep_id ?? ""),
      rep_name: String(base.rep_name ?? ""),
      branch_id: String(base.branch_id ?? ""),
      branch_name: String(base.branch_name ?? ""),
      product_name: String(base.product_name ?? ""),
      territory_group: pickPrimaryText(rows as Array<Record<string, unknown>>, "territory_group", ""),
      territory_name: pickPrimaryText(rows as Array<Record<string, unknown>>, "territory_name", ""),
      total_quantity: Number(rows.reduce((sum, row) => sum + toNumber(row.total_quantity), 0).toFixed(2)),
      total_amount: Number(rows.reduce((sum, row) => sum + toNumber(row.total_amount), 0).toFixed(2)),
      flow_count: rows.length,
      pharmacy_count: new Set(rows.map((row) => String(row.pharmacy_id ?? ""))).size,
      hospital_count: new Set(rows.map((row) => String(row.hospital_id ?? ""))).size,
      wholesaler_count: new Set(rows.map((row) => String(row.wholesaler_id ?? ""))).size
    };
  });

  const severityRank = new Map<string, number>([["PASS", 0], ["REVIEW", 1], ["SUSPECT", 2]]);
  const quarterClaimSummary = new Map<string, {
    preShareAmount: number;
    postShareAmount: number;
    territoryGroup: string;
    territoryName: string;
    maxSeverity: number;
  }>();
  const quarterClaims = claimRows.filter((row) => String(row.period_type) === "quarter");
  for (const rows of groupBy(
    quarterClaims,
    (row) => `${row.year_quarter}::${row.rep_id}::${row.product_name}`
  ).values()) {
    const base = rows[0];
    quarterClaimSummary.set(
      `${base.year_quarter}::${base.rep_id}::${base.product_name}`,
      {
        preShareAmount: Number(rows.reduce((sum, row) => sum + toNumber(row.claimed_amount), 0).toFixed(2)),
        postShareAmount: Number(rows.reduce((sum, row) => sum + toNumber(row.tracked_amount), 0).toFixed(2)),
        territoryGroup: pickPrimaryText(rows as Array<Record<string, unknown>>, "territory_group", ""),
        territoryName: pickPrimaryText(rows as Array<Record<string, unknown>>, "territory_name", ""),
        maxSeverity: Math.max(...rows.map((row) => severityRank.get(String(row.verdict ?? "PASS")) ?? 0))
      }
    );
  }

  const repKpiRows = repKpiBaseRows
    .map((row) => {
      const claim = quarterClaimSummary.get(`${row.year_quarter}::${row.rep_id}::${row.product_name}`);
      const preShareAmount = claim ? claim.preShareAmount : row.total_amount;
      const postShareAmount = claim ? claim.postShareAmount : row.total_amount;
      const settlementGapAmount = Number((postShareAmount - preShareAmount).toFixed(2));
      const settlementGapRate = preShareAmount > 0 ? Number((settlementGapAmount / preShareAmount).toFixed(4)) : 0;
      const status = !claim ? "No Rule" : claim.maxSeverity === 2 ? "Variance" : claim.maxSeverity === 1 ? "Settled" : "Confirmed";
      return {
        ...row,
        territory_group: claim?.territoryGroup || row.territory_group,
        territory_name: claim?.territoryName || row.territory_name,
        pre_share_amount: preShareAmount,
        post_share_amount: postShareAmount,
        settlement_gap_amount: settlementGapAmount,
        settlement_gap_rate: settlementGapRate,
        status,
        rule_version: claim ? "SIM-CLAIM-v1" : "-",
        rule_applied: Boolean(claim)
      };
    })
    .sort((left, right) =>
      left.year_quarter === right.year_quarter
        ? left.rep_name === right.rep_name
          ? toNumber(right.total_amount) - toNumber(left.total_amount)
          : left.rep_name.localeCompare(right.rep_name, "ko")
        : left.year_quarter.localeCompare(right.year_quarter)
    );

  function buildTraceSummary(periodType: "month" | "quarter" | "year", periodField: "month" | "year_quarter" | "year") {
    return [...groupBy(
      connectedBaseRows,
      (row) =>
        [
          row[periodField],
          row.rep_name,
          row.branch_name,
          row.territory_group,
          row.territory_name,
          row.hospital_id,
          row.hospital_name,
          row.product_name
        ].map((value) => String(value ?? "")).join("::")
    ).values()].map((rows) => {
      const base = rows[0];
      const periodValue = String(base[periodField] ?? "");
      return {
        period_type: periodType,
        period_value: periodValue,
        period_label: periodValue,
        year: periodType === "year" ? periodValue : periodValue.slice(0, 4),
        rep_name: String(base.rep_name ?? ""),
        branch_name: String(base.branch_name ?? ""),
        territory_group: String(base.territory_group ?? ""),
        territory_name: String(base.territory_name ?? ""),
        hospital_id: String(base.hospital_id ?? ""),
        hospital_name: String(base.hospital_name ?? ""),
        product_name: String(base.product_name ?? ""),
        total_amount: Number(rows.reduce((sum, row) => sum + toNumber(row.total_amount), 0).toFixed(2)),
        pharmacy_count: new Set(rows.map((row) => String(row.pharmacy_id ?? ""))).size,
        wholesaler_count: new Set(rows.map((row) => String(row.wholesaler_id ?? ""))).size
      };
    });
  }

  const hospitalTraceRows = [
    ...buildTraceSummary("month", "month"),
    ...buildTraceSummary("quarter", "year_quarter"),
    ...buildTraceSummary("year", "year")
  ];

  const [masterOpsClaims, masterOpsRepKpis, masterOpsHospitalTraces] = await Promise.all([
    tryLoadMasterOpsChunkRows(companyKey, "claims"),
    tryLoadMasterOpsChunkRows(companyKey, "rep_kpis"),
    tryLoadMasterOpsChunkRows(companyKey, "hospital_traces")
  ]);
  const finalClaimRows = masterOpsClaims?.length ? masterOpsClaims : claimRows;
  const finalRepKpiRows = masterOpsRepKpis?.length ? masterOpsRepKpis : repKpiRows;
  const finalHospitalTraceRows = masterOpsHospitalTraces?.length ? masterOpsHospitalTraces : hospitalTraceRows;

  const diagnostics = {
    rule_coverage: Number(
      (
        flowRows.filter((row) => row.flow_status === "connected").length / Math.max(flowRows.length, 1)
      ).toFixed(4)
    ),
    mapped_territory_count: territorySet.size,
    missing_gap_count: gapRecords.length,
    total_records: prescription.row_count,
    flow_complete_records: connectedBaseRows.length,
    flow_incomplete_records: flowRows.length - connectedBaseRows.length,
    flow_completion_rate: Number((connectedBaseRows.length / Math.max(flowRows.length, 1)).toFixed(4)),
    hospital_coverage_rate: Number((connectedHospitalIds.size / Math.max(flowHospitalIds.size, 1)).toFixed(4))
  };

  const asset = {
    schema_version: "prescription_result_asset_v1",
    asset_type: "prescription_result_asset",
    source_module: "prescription",
    generated_at: new Date().toISOString(),
    company_name: companyName,
    lineage_summary: {
      total_records: prescription.row_count,
      total_flow_records: flowRows.length,
      complete_flow_count: connectedBaseRows.length,
      incomplete_flow_count: flowRows.length - connectedBaseRows.length,
      flow_completion_rate: diagnostics.flow_completion_rate,
      unique_pharmacies: pharmacySet.size,
      unique_territories: territorySet.size,
      unique_hospitals_connected: connectedHospitalIds.size,
      active_months: flowSeries.map((item) => item.month_key)
    },
    reconciliation_summary: {
      wholesaler_shipment_qty: Math.round(flowSeries.reduce((sum, item) => sum + toNumber(item.total_quantity), 0)),
      pharmacy_purchase_qty: Math.round(repKpiRows.reduce((sum, item) => sum + toNumber(item.total_quantity), 0)),
      qty_match_rate: Number((
        Math.min(
          flowSeries.reduce((sum, item) => sum + toNumber(item.total_quantity), 0),
          finalRepKpiRows.reduce((sum, item) => sum + toNumber(item.total_quantity), 0)
        ) / Math.max(flowSeries.reduce((sum, item) => sum + toNumber(item.total_quantity), 0), 1)
      ).toFixed(4)),
      has_both_sources: finalRepKpiRows.length > 0,
      total_amount: Math.round(flowSeries.reduce((sum, item) => sum + toNumber(item.total_amount), 0)),
      total_quantity: Math.round(flowSeries.reduce((sum, item) => sum + toNumber(item.total_quantity), 0)),
      avg_flows_per_month: avg(flowSeries.map((item) => toNumber(item.flow_count)))
    },
    validation_gap_summary: {
      total_gaps: gapRecords.length,
      missing_pharmacy_account_id: gapRecords.filter((item) => item.gap_reason === "pharmacy_account_id_missing").length,
      missing_rep_assignment: gapRecords.filter((item) => item.gap_reason === "rep_assignment_missing").length,
      missing_territory_group: gapRecords.filter((item) => item.gap_reason === "territory_group_missing").length,
      missing_quantity: gapRecords.filter((item) => item.gap_reason === "quantity_missing").length,
      gap_by_reason: Object.fromEntries(
        [...groupBy(gapRecords, (row) => String(row.gap_reason ?? "")).entries()].map(([reason, rows]) => [reason, rows.length])
      )
    },
    mapping_quality: diagnostics,
    flow_series: flowSeries,
    flow_series_by_territory: flowSeriesByTerritory,
    pipeline_steps: [
      { step_key: "raw_to_standardized", status: "completed", count: prescription.row_count },
      { step_key: "territory_mapping", status: territorySet.size > 0 ? "completed_with_review" : "needs_review", count: territorySet.size },
      { step_key: "gap_capture", status: gapRecords.length > 0 ? "completed_with_review" : "completed", count: gapRecords.length }
    ],
    flow_rows: flowRows,
    claims: finalClaimRows,
    hospital_traces: finalHospitalTraceRows,
    rep_kpis: finalRepKpiRows,
    gaps: gapRecords,
    detail_asset_manifest: {
      available_buckets: ["claims", "hospital_traces", "rep_kpis", "gaps"],
      truncated: false
    },
    planned_handoff_modules: ["validation", "builder"]
  };

  return { asset, rowCount: prescription.rows.length };
}
