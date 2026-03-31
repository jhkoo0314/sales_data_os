import { cleanText, readLookupRows, readStandardizedPayload, toNumber } from "@/lib/server/kpi/shared";

export async function buildTerritoryResultAsset(
  companyKey: string,
  sandboxAsset: Record<string, unknown>
): Promise<{ asset: Record<string, unknown>; rowCount: number } | null> {
  const assignment = await readStandardizedPayload(
    companyKey,
    "crm",
    "standardized_crm_account_assignment.json"
  );
  const sales = await readStandardizedPayload(companyKey, "sandbox", "standardized_sales_records.json");
  const target = await readStandardizedPayload(companyKey, "sandbox", "standardized_target_records.json");
  const hospitalRecords = ((sandboxAsset.hospital_records as Array<Record<string, unknown>> | undefined) ?? []).filter(
    (row) => Boolean(cleanText(row.hospital_id))
  );
  if (!hospitalRecords.length) {
    return null;
  }

  const { byAccountName } = await readLookupRows(companyKey);
  const assignmentById = new Map(
    (assignment?.rows ?? []).map((row) => [
      cleanText(row.account_id),
      {
        account_name: cleanText(row.account_name),
        branch_id: cleanText(row.branch_id),
        branch_name: cleanText(row.branch_name),
        rep_id: cleanText(row.rep_id),
        rep_name: cleanText(row.rep_name)
      }
    ])
  );

  const hospitalCatalog: Record<string, Record<string, unknown>> = {};
  const repPortfolio = new Map<string, { repName: string; branchName: string; hospitalCount: number; sales: number; target: number }>();
  const regionMap = new Map<string, { hospitalCount: number; sales: number; target: number }>();
  const gaps: Array<Record<string, unknown>> = [];

  for (const row of hospitalRecords) {
    const hospitalId = cleanText(row.hospital_id);
    const hospitalName = cleanText(row.hospital_name);
    const assignedMeta = assignmentById.get(hospitalId);
    const lookupMeta = byAccountName.get(hospitalName);
    const repId = assignedMeta?.rep_id || lookupMeta?.repId || "UNASSIGNED";
    const repName = assignedMeta?.rep_name || lookupMeta?.repName || "미배정";
    const branchName = assignedMeta?.branch_name || lookupMeta?.branchName || "미지정";
    const totalSales = toNumber(row.total_sales);
    const totalTarget = toNumber(row.total_target);
    const attainmentRate = totalTarget > 0 ? Number(((totalSales / totalTarget) * 100).toFixed(1)) : 0;

    hospitalCatalog[hospitalId] = {
      hospital: hospitalName || hospitalId,
      rep_id: repId,
      rep_name: repName,
      region: branchName,
      sales: Math.round(totalSales),
      target: Math.round(totalTarget),
      attainment_rate: attainmentRate
    };

    const repSummary = repPortfolio.get(repId) ?? {
      repName,
      branchName,
      hospitalCount: 0,
      sales: 0,
      target: 0
    };
    repSummary.hospitalCount += 1;
    repSummary.sales += totalSales;
    repSummary.target += totalTarget;
    repPortfolio.set(repId, repSummary);

    const regionSummary = regionMap.get(branchName) ?? { hospitalCount: 0, sales: 0, target: 0 };
    regionSummary.hospitalCount += 1;
    regionSummary.sales += totalSales;
    regionSummary.target += totalTarget;
    regionMap.set(branchName, regionSummary);

    if (!row.has_crm || !row.has_sales || !row.has_target) {
      gaps.push({
        hospital_id: hospitalId,
        hospital_name: hospitalName,
        rep_id: repId,
        rep_name: repName,
        gap_reason: !row.has_crm ? "crm_missing" : !row.has_sales ? "sales_missing" : "target_missing"
      });
    }
  }

  const repIndex = Object.fromEntries(
    [...repPortfolio.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([repId, summary]) => [
        repId,
        {
          rep_id: repId,
          rep_name: summary.repName,
          region: summary.branchName,
          hospital_count: summary.hospitalCount,
          sales: Math.round(summary.sales),
          target: Math.round(summary.target),
          coverage_score:
            summary.hospitalCount > 0 ? Number((Math.min(summary.sales / Math.max(summary.target, 1), 1)).toFixed(4)) : 0
        }
      ])
  );

  const repOptions = Object.values(repIndex).map((row) => ({
    value: String(row.rep_id),
    label: String(row.rep_name)
  }));
  const firstRep = repOptions[0]?.value ?? "";

  const asset = {
    schema_version: "territory_result_asset_v1",
    asset_type: "territory_result_asset",
    source_module: "territory",
    generated_at: new Date().toISOString(),
    overview: {
      hospital_count: hospitalRecords.length,
      rep_count: Object.keys(repIndex).length,
      coverage_rate: Number((hospitalRecords.filter((row) => Boolean(row.is_fully_joined)).length / Math.max(hospitalRecords.length, 1)).toFixed(4)),
      route_selection_count: 0
    },
    coverage_summary: {
      fully_joined_hospitals: hospitalRecords.filter((row) => Boolean(row.is_fully_joined)).length,
      crm_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_crm)).length,
      sales_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_sales)).length,
      target_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_target)).length
    },
    optimization_summary: {
      selected_hospital_count: 0,
      recommended_route_groups: 0,
      reason: "Phase 6 최소 버전에서는 지도/동선 최적화 대신 커버리지 자산만 생성합니다."
    },
    region_zones: [...regionMap.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([region, summary]) => ({
        region,
        hospital_count: summary.hospitalCount,
        sales: Math.round(summary.sales),
        target: Math.round(summary.target)
      })),
    gaps: gaps.slice(0, 300),
    hospital_catalog: hospitalCatalog,
    rep_index: repIndex,
    filters: {
      rep_options: repOptions
    },
    default_selection: {
      rep_id: firstRep,
      month_key: "",
      scope: {
        date_label: "latest sandbox scope"
      },
      route_groups: []
    },
    markers: [],
    routes: [],
    route_groups: [],
    planned_handoff_modules: ["validation", "builder"],
    diagnostics: {
      sandbox_hospital_record_count: hospitalRecords.length,
      assignment_record_count: assignment?.row_count ?? 0,
      sales_record_count: sales?.row_count ?? 0,
      target_record_count: target?.row_count ?? 0
    }
  };

  return { asset, rowCount: hospitalRecords.length };
}
