import {
  avg,
  cleanText,
  normalizeHospitalNameKey,
  readLookupRows,
  readStandardizedPayload,
  toMonthToken,
  toNumber
} from "@/lib/server/kpi/shared";

export async function buildSandboxResultAsset(
  companyKey: string,
  crmAsset: Record<string, unknown>
): Promise<{ asset: Record<string, unknown>; rowCount: number }> {
  const sales = await readStandardizedPayload(companyKey, "sandbox", "standardized_sales_records.json");
  const target = await readStandardizedPayload(companyKey, "sandbox", "standardized_target_records.json");
  if (!sales || !sales.rows.length) {
    throw new Error("Sandbox KPI 계산을 위한 standardized_sales_records.json이 없습니다.");
  }

  const crmActivity = await readStandardizedPayload(companyKey, "crm", "standardized_crm_activity.json");
  const prescription = await readStandardizedPayload(
    companyKey,
    "prescription",
    "standardized_prescription_records.json"
  );
  const { byAccountName } = await readLookupRows(companyKey);
  const crmByHospitalMonth = new Map<string, { totalVisits: number; detailCallCount: number }>();
  for (const row of crmActivity?.rows ?? []) {
    const hospitalName = cleanText(row.account || row["병원명"]);
    const hospitalLookup =
      byAccountName.get(hospitalName) || byAccountName.get(normalizeHospitalNameKey(hospitalName));
    const hospitalId = cleanText(row["병원코드"]) || hospitalLookup?.accountId || hospitalName;
    const metricMonth = toMonthToken(row.metric_month || row.activity_date || row["실행일"]);
    const key = `${hospitalId}::${metricMonth}`;
    const prev = crmByHospitalMonth.get(key) ?? { totalVisits: 0, detailCallCount: 0 };
    prev.totalVisits += Math.max(1, toNumber(row.visit_count || row["방문횟수"], 1));
    prev.detailCallCount += ["y", "yes", "1", "true"].includes(cleanText(row["상세콜여부"]).toLowerCase()) ? 1 : 0;
    crmByHospitalMonth.set(key, prev);
  }

  const bucket = new Map<string, Record<string, unknown>>();
  const getOrCreate = (hospitalId: string, metricMonth: string, hospitalName = "") => {
    const key = `${hospitalId}::${metricMonth}`;
    if (!bucket.has(key)) {
      bucket.set(key, {
        hospital_id: hospitalId,
        hospital_name: hospitalName,
        metric_month: metricMonth,
        total_sales: 0,
        total_target: 0,
        total_quantity: 0,
        total_visits: 0,
        detail_call_count: 0,
        rx_amount: 0,
        rx_complete_flows: 0,
        has_sales: false,
        has_target: false,
        has_crm: false,
        has_rx: false
      });
    }
    return bucket.get(key) as Record<string, unknown>;
  };

  for (const row of sales.rows) {
    const hospitalName = cleanText(row["병원명"]);
    const hospitalLookup =
      byAccountName.get(hospitalName) || byAccountName.get(normalizeHospitalNameKey(hospitalName));
    const hospitalId =
      cleanText(row.account || row["병원코드"]) || hospitalLookup?.accountId || hospitalName;
    const metricMonth = toMonthToken(row.period || row["매출월"]);
    const record = getOrCreate(hospitalId, metricMonth, hospitalName);
    record.total_sales = toNumber(record.total_sales) + toNumber(row.amount || row["매출금액"]);
    record.total_quantity = toNumber(record.total_quantity) + toNumber(row["매출수량"]);
    record.has_sales = true;
  }
  for (const row of target?.rows ?? []) {
    const hospitalName = cleanText(row["병원명"] || row["거래처명"]);
    const hospitalLookup =
      byAccountName.get(hospitalName) || byAccountName.get(normalizeHospitalNameKey(hospitalName));
    const hospitalId =
      cleanText(row.account || row["병원코드"] || row["거래처코드"]) ||
      hospitalLookup?.accountId ||
      hospitalName;
    const metricMonth = toMonthToken(row.period || row["목표월"]);
    const record = getOrCreate(hospitalId, metricMonth, hospitalName);
    record.total_target = toNumber(record.total_target) + toNumber(row.target_value || row["목표금액"]);
    record.has_target = true;
  }
  for (const [key, value] of crmByHospitalMonth.entries()) {
    const [hospitalId, metricMonth] = key.split("::");
    const record = getOrCreate(hospitalId, metricMonth);
    record.total_visits = value.totalVisits;
    record.detail_call_count = value.detailCallCount;
    record.has_crm = true;
  }
  for (const row of prescription?.rows ?? []) {
    const metricMonth = toMonthToken(row.ship_date || row["출고일"]);
    const hospitalId = cleanText(
      row.hospital_id || row.pharmacy_account_id || row["pharmacy_account_id (약국거래처ID)"]
    );
    if (!hospitalId || !metricMonth) {
      continue;
    }
    const record = getOrCreate(hospitalId, metricMonth, cleanText(row.pharmacy || row["약국명"]));
    record.rx_amount = toNumber(record.rx_amount) + toNumber(row.amount || row["공급가액"]);
    record.rx_complete_flows = toNumber(record.rx_complete_flows) + 1;
    record.has_rx = true;
  }

  const hospitalRecords: Array<Record<string, unknown>> = [...bucket.values()].map((row) => {
    const totalSales = toNumber(row.total_sales);
    const totalTarget = toNumber(row.total_target);
    return {
      ...row,
      attainment_rate: totalTarget > 0 ? Number((totalSales / totalTarget).toFixed(4)) : null,
      is_fully_joined: Boolean(row.has_sales && row.has_target && row.has_crm)
    };
  });

  const months = [...new Set(hospitalRecords.map((row) => cleanText(row.metric_month)).filter(Boolean))].sort();
  const salesByMonth = new Map<string, number>();
  const targetByMonth = new Map<string, number>();
  for (const row of hospitalRecords) {
    const month = cleanText(row.metric_month);
    salesByMonth.set(month, (salesByMonth.get(month) ?? 0) + toNumber(row.total_sales));
    targetByMonth.set(month, (targetByMonth.get(month) ?? 0) + toNumber(row.total_target));
  }

  const referenceMonth = months.at(-1) ?? "";
  const referenceYear = referenceMonth.slice(0, 4);
  const referenceQuarter = referenceMonth
    ? `${referenceYear}-Q${Math.floor((Number(referenceMonth.slice(4, 6)) - 1) / 3) + 1}`
    : "";
  const quarterMonths = months.filter(
    (month) =>
      month.startsWith(referenceYear) &&
      `${referenceYear}-Q${Math.floor((Number(month.slice(4, 6)) - 1) / 3) + 1}` === referenceQuarter
  );
  const officialKpi6 = {
    monthly_sales: Math.round(salesByMonth.get(referenceMonth) ?? 0),
    monthly_target: Math.round(targetByMonth.get(referenceMonth) ?? 0),
    monthly_attainment_rate: Number(
      (((salesByMonth.get(referenceMonth) ?? 0) / Math.max(targetByMonth.get(referenceMonth) ?? 0, 1)) * 100).toFixed(1)
    ),
    quarterly_sales: Math.round(quarterMonths.reduce((sum, month) => sum + (salesByMonth.get(month) ?? 0), 0)),
    quarterly_target: Math.round(quarterMonths.reduce((sum, month) => sum + (targetByMonth.get(month) ?? 0), 0)),
    annual_attainment_rate: Number(
      (
        (months.reduce((sum, month) => sum + (salesByMonth.get(month) ?? 0), 0) /
          Math.max(months.reduce((sum, month) => sum + (targetByMonth.get(month) ?? 0), 0), 1)) *
        100
      ).toFixed(1)
    ),
    reference_month: referenceMonth,
    reference_quarter: referenceQuarter,
    reference_year: referenceYear,
    metric_version: "sandbox_kpi_engine_v1"
  };

  const crmRepMonthly = ((crmAsset.rep_monthly_kpi_11 as Array<Record<string, unknown>> | undefined) ?? []).length;
  const crmHospitals = new Set(
    hospitalRecords.filter((row) => Boolean(row.has_crm)).map((row) => cleanText(row.hospital_id))
  );
  const salesHospitals = new Set(
    hospitalRecords.filter((row) => Boolean(row.has_sales)).map((row) => cleanText(row.hospital_id))
  );
  const targetHospitals = new Set(
    hospitalRecords.filter((row) => Boolean(row.has_target)).map((row) => cleanText(row.hospital_id))
  );
  const crmSalesJoined = [...crmHospitals].filter((hospitalId) => salesHospitals.has(hospitalId));
  const fullyJoinedHospitals = [...crmHospitals].filter(
    (hospitalId) => salesHospitals.has(hospitalId) && targetHospitals.has(hospitalId)
  );
  const crmRxJoined = [...crmHospitals].filter((hospitalId) =>
    hospitalRecords.some((row) => cleanText(row.hospital_id) === hospitalId && Boolean(row.has_rx))
  );
  const crmSalesJoinRate = Number((crmSalesJoined.length / Math.max(crmHospitals.size, 1)).toFixed(4));
  const fullJoinRate = Number((fullyJoinedHospitals.length / Math.max(crmHospitals.size, 1)).toFixed(4));
  const proxyMetrics = {
    sandbox_proxy_integrity_score: Number(
      Math.min(100, crmSalesJoinRate * 50 + fullJoinRate * 40 + ((target?.row_count ?? 0) > 0 ? 10 : 0)).toFixed(1)
    ),
    sandbox_proxy_orphan_sales_hospitals: [...salesHospitals].filter((hospitalId) => !crmHospitals.has(hospitalId)).length,
    sandbox_proxy_orphan_crm_hospitals: [...crmHospitals].filter((hospitalId) => !salesHospitals.has(hospitalId)).length
  };

  const asset = {
    schema_version: "sandbox_result_asset_v1",
    asset_type: "sandbox_result_asset",
    source_module: "sandbox",
    generated_at: new Date().toISOString(),
    scenario: "integrated",
    metric_months: months,
    analysis_summary: {
      total_hospitals: new Set(hospitalRecords.map((row) => cleanText(row.hospital_id))).size,
      total_months: months.length,
      total_sales_amount: Math.round(hospitalRecords.reduce((sum, row) => sum + toNumber(row.total_sales), 0)),
      total_target_amount: Math.round(hospitalRecords.reduce((sum, row) => sum + toNumber(row.total_target), 0)),
      avg_attainment_rate: avg(
        hospitalRecords.map((row) => toNumber(row.attainment_rate)).filter((value) => value > 0)
      ),
      total_visits: hospitalRecords.reduce((sum, row) => sum + toNumber(row.total_visits), 0),
      fully_joined_hospitals: fullyJoinedHospitals.length,
      rx_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_rx)).length,
      metric_months: months,
      custom_metrics: {
        ...officialKpi6,
        ...proxyMetrics
      }
    },
    domain_quality: {
      crm_record_count: crmRepMonthly,
      sales_record_count: sales.row_count,
      target_record_count: target?.row_count ?? 0,
      rx_record_count: prescription?.row_count ?? 0,
      crm_unique_hospitals: crmHospitals.size,
      sales_unique_hospitals: salesHospitals.size,
      target_unique_reps: new Set(
        (target?.rows ?? []).map((row) => cleanText(row["영업사원코드"])).filter(Boolean)
      ).size,
      rx_unique_hospitals: new Set(
        (prescription?.rows ?? [])
          .map((row) => cleanText(row.pharmacy_account_id || row["pharmacy_account_id (약국거래처ID)"]))
          .filter(Boolean)
      ).size,
      crm_months: months.filter((month) =>
        hospitalRecords.some((row) => cleanText(row.metric_month) === month && Boolean(row.has_crm))
      ),
      sales_months: months.filter((month) =>
        hospitalRecords.some((row) => cleanText(row.metric_month) === month && Boolean(row.has_sales))
      )
    },
    join_quality: {
      hospitals_with_crm_and_sales: crmSalesJoined.length,
      hospitals_with_all_three: fullyJoinedHospitals.length,
      hospitals_with_rx_added: crmRxJoined.length,
      crm_sales_join_rate: crmSalesJoinRate,
      full_join_rate: fullJoinRate,
      orphan_sales_hospitals: proxyMetrics.sandbox_proxy_orphan_sales_hospitals,
      orphan_crm_hospitals: proxyMetrics.sandbox_proxy_orphan_crm_hospitals
    },
    hospital_records: hospitalRecords,
    handoff_candidates: [
      {
        module: "territory",
        condition: "CRM×Sales 조인율 ≥ 60% AND 병원 수 ≥ 10",
        is_eligible: crmSalesJoined.length / Math.max(crmHospitals.size, 1) >= 0.6 && crmHospitals.size >= 10
      },
      {
        module: "builder",
        condition: "1개 월 이상 분석",
        is_eligible: months.length >= 1
      }
    ],
    planned_handoff_modules: ["validation", "builder"]
  };

  return { asset, rowCount: hospitalRecords.length };
}
