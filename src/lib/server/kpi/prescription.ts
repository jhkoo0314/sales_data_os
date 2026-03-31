import { avg, cleanText, readStandardizedPayload, toMonthToken, toNumber } from "@/lib/server/kpi/shared";

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

  const flowSeriesMap = new Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>();
  const territorySeriesMap = new Map<string, Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>>();
  const hospitalTraceMap = new Map<string, Record<string, unknown>>();
  const gapRecords: Array<Record<string, unknown>> = [];
  const territorySet = new Set<string>();
  const pharmacySet = new Set<string>();
  const claimRows: Array<Record<string, unknown>> = [];

  for (const row of prescription.rows) {
    const month = toMonthToken(row.ship_date || row["출고일"]);
    const pharmacyName = cleanText(row.pharmacy || row["약국명"]);
    const pharmacyId = cleanText(
      row.pharmacy_account_id || row.hospital_id || row["pharmacy_account_id (약국거래처ID)"]
    );
    const territory = cleanText(row.pharmacy_region_key || row.territory_group || row["pharmacy_region_key (약국시도)"]);
    const product = cleanText(row.sku || row.product || row.brand || row["제품명"]);
    const quantity = toNumber(row.quantity || row["출고수량"]);
    const amount = toNumber(row.amount || row["공급가액"]);
    const claimKey = `${month}::${pharmacyId || pharmacyName}::${product}`;

    pharmacySet.add(pharmacyId || pharmacyName || "UNKNOWN");
    if (territory) {
      territorySet.add(territory);
    }

    const flow = flowSeriesMap.get(month) ?? { totalAmount: 0, totalQuantity: 0, flowCount: 0 };
    flow.totalAmount += amount;
    flow.totalQuantity += quantity;
    flow.flowCount += 1;
    flowSeriesMap.set(month, flow);

    if (territory) {
      const territoryMap = territorySeriesMap.get(territory) ?? new Map<string, { totalAmount: number; totalQuantity: number; flowCount: number }>();
      const territoryFlow = territoryMap.get(month) ?? { totalAmount: 0, totalQuantity: 0, flowCount: 0 };
      territoryFlow.totalAmount += amount;
      territoryFlow.totalQuantity += quantity;
      territoryFlow.flowCount += 1;
      territoryMap.set(month, territoryFlow);
      territorySeriesMap.set(territory, territoryMap);
    }

    const trace = hospitalTraceMap.get(claimKey) ?? {
      year_quarter: month ? `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(4, 6)) - 1) / 3) + 1}` : "",
      rep_name: "",
      hospital_name: pharmacyName,
      territory_group: territory,
      product_name: product,
      total_amount: 0,
      flow_count: 0
    };
    trace.total_amount = toNumber(trace.total_amount) + amount;
    trace.flow_count = toNumber(trace.flow_count) + 1;
    hospitalTraceMap.set(claimKey, trace);

    claimRows.push({
      year_quarter: month ? `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(4, 6)) - 1) / 3) + 1}` : "",
      rep_name: "",
      territory: territory,
      territory_group: territory,
      hospital_name: pharmacyName,
      product_name: product,
      claimed_amount: amount,
      tracked_amount: amount,
      verdict: pharmacyId && territory ? "tracked" : "needs_review"
    });

    if (!pharmacyId || !territory || !quantity) {
      gapRecords.push({
        year_quarter: month ? `${month.slice(0, 4)}-Q${Math.floor((Number(month.slice(4, 6)) - 1) / 3) + 1}` : "",
        pharmacy_name: pharmacyName,
        product_name: product,
        quantity,
        gap_reason: !pharmacyId
          ? "pharmacy_account_id_missing"
          : !territory
            ? "territory_group_missing"
            : "quantity_missing"
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

  const diagnostics = {
    rule_coverage: Number(
      (
        prescription.rows.filter(
          (row) =>
            Boolean(
              cleanText(
                row.pharmacy_account_id || row.hospital_id || row["pharmacy_account_id (약국거래처ID)"]
              )
            ) && Boolean(cleanText(row.pharmacy_region_key || row.territory_group || row["pharmacy_region_key (약국시도)"]))
        ).length / Math.max(prescription.rows.length, 1)
      ).toFixed(4)
    ),
    mapped_territory_count: territorySet.size,
    missing_gap_count: gapRecords.length
  };

  const asset = {
    schema_version: "prescription_result_asset_v1",
    asset_type: "prescription_result_asset",
    source_module: "prescription",
    generated_at: new Date().toISOString(),
    lineage_summary: {
      total_records: prescription.row_count,
      unique_pharmacies: pharmacySet.size,
      unique_territories: territorySet.size,
      active_months: flowSeries.map((item) => item.month_key)
    },
    reconciliation_summary: {
      total_amount: Math.round(flowSeries.reduce((sum, item) => sum + toNumber(item.total_amount), 0)),
      total_quantity: Math.round(flowSeries.reduce((sum, item) => sum + toNumber(item.total_quantity), 0)),
      avg_flows_per_month: avg(flowSeries.map((item) => toNumber(item.flow_count)))
    },
    validation_gap_summary: {
      total_gaps: gapRecords.length,
      missing_pharmacy_account_id: gapRecords.filter((item) => item.gap_reason === "pharmacy_account_id_missing").length,
      missing_territory_group: gapRecords.filter((item) => item.gap_reason === "territory_group_missing").length,
      missing_quantity: gapRecords.filter((item) => item.gap_reason === "quantity_missing").length
    },
    mapping_quality: diagnostics,
    flow_series: flowSeries,
    flow_series_by_territory: flowSeriesByTerritory,
    pipeline_steps: [
      { step_key: "raw_to_standardized", status: "completed", count: prescription.row_count },
      { step_key: "territory_mapping", status: territorySet.size > 0 ? "completed_with_review" : "needs_review", count: territorySet.size },
      { step_key: "gap_capture", status: gapRecords.length > 0 ? "completed_with_review" : "completed", count: gapRecords.length }
    ],
    claims: claimRows.slice(0, 300),
    hospital_traces: [...hospitalTraceMap.values()].slice(0, 300),
    rep_kpis: [],
    gaps: gapRecords.slice(0, 300),
    detail_asset_manifest: {
      available_buckets: ["claims", "hospital_traces", "rep_kpis", "gaps"],
      truncated: claimRows.length > 300 || hospitalTraceMap.size > 300 || gapRecords.length > 300
    },
    planned_handoff_modules: ["validation", "builder"]
  };

  return { asset, rowCount: prescription.rows.length };
}
