import {
  cleanText,
  readLookupRows,
  readStandardizedPayload,
  toDateToken,
  toMonthToken,
  toNumber
} from "@/lib/server/kpi/shared";

const ALL_DATES_KEY = "__ALL__";

type HospitalMeta = {
  hospital_id: string;
  hospital: string;
  lat: number | null;
  lon: number | null;
  sales: number;
  target: number;
  attainment_rate: number;
  visits: number;
  rep_id: string;
  rep_name: string;
  region: string;
  sub_region: string;
  insight: string;
};

type RoutePoint = {
  seq: number;
  hospital_id: string;
  hospital: string;
  lat: number;
  lon: number;
  visit_count: number;
};

type SelectionPayload = {
  scope: Record<string, unknown>;
  summary: Record<string, unknown>;
  route_groups: Array<Record<string, unknown>>;
  points: RoutePoint[];
  insight_text: string;
  status_line: string;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function mean(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSelectionPayload(args: {
  repId: string;
  repName: string;
  monthKey: string;
  monthLabel: string;
  dateKey: string;
  dateLabel: string;
  points: RoutePoint[];
  markerMeta: Record<string, HospitalMeta>;
  hospitalCount: number;
  coverageScore: number;
}): SelectionPayload {
  const { repId, repName, monthKey, monthLabel, dateKey, dateLabel, points, markerMeta, hospitalCount, coverageScore } = args;
  const enrichedPoints = points
    .map((point) => ({
      ...point,
      meta: markerMeta[point.hospital_id]
    }))
    .filter((point) => Boolean(point.meta));

  const uniqueHospitalIds = Array.from(new Set(enrichedPoints.map((point) => point.hospital_id)));
  const salesTotal = enrichedPoints.reduce((sum, point) => sum + Number(point.meta?.sales ?? 0), 0);
  const targetTotal = enrichedPoints.reduce((sum, point) => sum + Number(point.meta?.target ?? 0), 0);
  const visitCount = enrichedPoints.reduce((sum, point) => sum + Number(point.visit_count ?? 0), 0);
  const latitudes = enrichedPoints.map((point) => Number(point.lat)).filter(Number.isFinite);
  const longitudes = enrichedPoints.map((point) => Number(point.lon)).filter(Number.isFinite);
  const centerLat = mean(latitudes);
  const centerLon = mean(longitudes);

  let distanceKm = 0;
  for (let index = 1; index < enrichedPoints.length; index += 1) {
    const previous = enrichedPoints[index - 1];
    const current = enrichedPoints[index];
    distanceKm += haversineKm(previous.lat, previous.lon, current.lat, current.lon);
  }

  const radiusKm = enrichedPoints.length
    ? Math.max(
        ...enrichedPoints.map((point) =>
          haversineKm(centerLat, centerLon, Number(point.lat), Number(point.lon))
        )
      )
    : 0;
  const attainmentRate = targetTotal > 0 ? salesTotal / targetTotal : 0;

  return {
    scope: {
      rep_id: repId,
      rep_name: repName,
      month_key: monthKey,
      month_label: monthLabel,
      date_key: dateKey,
      date_label: dateLabel,
      label: `${repName} / ${dateLabel}`,
      is_month_aggregate: dateKey === ALL_DATES_KEY
    },
    summary: {
      km_per_visit: visitCount > 0 ? round1(distanceKm / visitCount) : 0,
      radius_km: round1(radiusKm),
      distance_km: round1(distanceKm),
      visit_count: visitCount,
      sales_total: Math.round(salesTotal),
      attainment_rate: Number(attainmentRate.toFixed(4)),
      selected_hospital_count: uniqueHospitalIds.length,
      stop_count: uniqueHospitalIds.length
    },
    route_groups: [
      {
        date_key: dateKey,
        label: dateLabel,
        points: enrichedPoints.map((point) => ({
          seq: point.seq,
          hospital_id: point.hospital_id,
          hospital: point.hospital,
          lat: point.lat,
          lon: point.lon,
          visit_count: point.visit_count
        }))
      }
    ],
    points: enrichedPoints.map((point) => ({
      seq: point.seq,
      hospital_id: point.hospital_id,
      hospital: point.hospital,
      lat: point.lat,
      lon: point.lon,
      visit_count: point.visit_count
    })),
    insight_text:
      `${repName} 담당자는 ${dateLabel} 기준 ${uniqueHospitalIds.length}개 병원을 커버했고 ` +
      `누적 매출은 ${Math.round(salesTotal).toLocaleString("ko-KR")}원입니다.`,
    status_line:
      `${repName} | 포트폴리오 ${hospitalCount}곳 | 선택 방문처 ${uniqueHospitalIds.length}곳 | ` +
      `커버리지 ${(coverageScore * 100).toFixed(1)}%`
  };
}

export async function buildTerritoryResultAsset(
  companyKey: string,
  sandboxAsset: Record<string, unknown>
): Promise<{ asset: Record<string, unknown>; rowCount: number } | null> {
  const assignment = await readStandardizedPayload(
    companyKey,
    "crm",
    "standardized_crm_account_assignment.json"
  );
  const crmActivity = await readStandardizedPayload(companyKey, "crm", "standardized_crm_activity.json");
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
  const assignmentByName = new Map<string, string>(
    (assignment?.rows ?? [])
      .map((row) => [cleanText(row.account_name), cleanText(row.account_id)] as [string, string])
      .filter(([accountName, accountId]) => Boolean(accountName) && Boolean(accountId))
  );
  const hospitalNameToId = new Map<string, string>(
    hospitalRecords
      .map((row) => [cleanText(row.hospital_name), cleanText(row.hospital_id)] as [string, string])
      .filter(([hospitalName, hospitalId]) => Boolean(hospitalName) && Boolean(hospitalId))
  );

  const activityMetaByHospitalId = new Map<
    string,
    { lat: number | null; lon: number | null; latestDate: string; visitCount: number }
  >();
  const repPointsByDate = new Map<string, RoutePoint[]>();
  const repNames = new Map<string, string>();
  const metricMonths = new Set<string>();
  const routeReadyHospitalIds = new Set<string>();
  const routeReadyHospitalIdsByRep = new Map<string, Set<string>>();

  for (const row of crmActivity?.rows ?? []) {
    const repId = cleanText(row.rep_id || row["영업사원코드"]);
    const repName = cleanText(row.rep_name || row.rep || row["영업사원명"]) || repId;
    const hospitalName = cleanText(row.account_name || row.account || row["방문기관"]);
    const hospitalId =
      cleanText(row.account_id) ||
      assignmentByName.get(hospitalName) ||
      byAccountName.get(hospitalName)?.accountId ||
      hospitalNameToId.get(hospitalName) ||
      "";
    const activityDate = toDateToken(row.activity_date || row["실행일"]);
    const monthKey = toMonthToken(activityDate);
    const lat = Number.parseFloat(cleanText(row.lat || row["기관위도"]));
    const lon = Number.parseFloat(cleanText(row.lon || row["기관경도"]));
    const visitCount = Math.max(1, Math.round(toNumber(row.visit_count || row["방문횟수"], 1)));

    if (!repId || !hospitalId || !activityDate || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }

    repNames.set(repId, repName);
    metricMonths.add(monthKey);

    const previousMeta = activityMetaByHospitalId.get(hospitalId);
    if (!previousMeta || previousMeta.latestDate < activityDate) {
      activityMetaByHospitalId.set(hospitalId, {
        lat,
        lon,
        latestDate: activityDate,
        visitCount
      });
    }

    const routeKey = `${repId}|${monthKey}|${activityDate}`;
    const points = repPointsByDate.get(routeKey) ?? [];
    if (!points.some((point) => point.hospital_id === hospitalId)) {
      points.push({
        seq: points.length + 1,
        hospital_id: hospitalId,
        hospital: hospitalName || hospitalId,
        lat,
        lon,
        visit_count: visitCount
      });
      repPointsByDate.set(routeKey, points);
    }
    routeReadyHospitalIds.add(hospitalId);
    const readySet = routeReadyHospitalIdsByRep.get(repId) ?? new Set<string>();
    readySet.add(hospitalId);
    routeReadyHospitalIdsByRep.set(repId, readySet);
  }

  const hospitalCatalog: Record<string, HospitalMeta> = {};
  const repPortfolio = new Map<string, { repName: string; branchName: string; hospitalCount: number; sales: number; target: number }>();
  const regionMap = new Map<string, { hospitalCount: number; sales: number; target: number }>();
  const gaps: Array<Record<string, unknown>> = [];

  for (const row of hospitalRecords) {
    const hospitalId = cleanText(row.hospital_id);
    const assignedMeta = assignmentById.get(hospitalId);
    const hospitalName = cleanText(row.hospital_name) || assignedMeta?.account_name || "";
    const lookupMeta = byAccountName.get(hospitalName);
    const activityMeta = activityMetaByHospitalId.get(hospitalId);
    const repId = assignedMeta?.rep_id || lookupMeta?.repId || "UNASSIGNED";
    const repName = assignedMeta?.rep_name || lookupMeta?.repName || repNames.get(repId) || "미배정";
    const branchName = assignedMeta?.branch_name || lookupMeta?.branchName || "미지정";
    const totalSales = toNumber(row.total_sales);
    const totalTarget = toNumber(row.total_target);
    const attainmentRate = totalTarget > 0 ? Number(((totalSales / totalTarget) * 100).toFixed(1)) : 0;
    const lat = activityMeta?.lat ?? null;
    const lon = activityMeta?.lon ?? null;

    hospitalCatalog[hospitalId] = {
      hospital_id: hospitalId,
      hospital: hospitalName || hospitalId,
      lat,
      lon,
      sales: Math.round(totalSales),
      target: Math.round(totalTarget),
      attainment_rate: totalTarget > 0 ? Number((totalSales / totalTarget).toFixed(4)) : 0,
      visits: activityMeta?.visitCount ?? 0,
      rep_id: repId,
      rep_name: repName,
      region: branchName,
      sub_region: "",
      insight:
        `${branchName} 권역 | 병원 ${hospitalName || hospitalId} | ` +
        `누적 매출 ${Math.round(totalSales).toLocaleString("ko-KR")}원`
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

  const repPayloads: Record<string, Record<string, unknown>> = {};
  const sortedRepIds = [...repPortfolio.keys()].sort((left, right) => left.localeCompare(right));
  for (const repId of sortedRepIds) {
    const repSummary = repPortfolio.get(repId)!;
    const routeReadyCount = routeReadyHospitalIdsByRep.get(repId)?.size ?? 0;
    const coverageScore = repSummary.hospitalCount > 0 ? routeReadyCount / repSummary.hospitalCount : 0;
    const routesForRep = [...repPointsByDate.entries()]
      .filter(([routeKey]) => routeKey.startsWith(`${repId}|`))
      .map(([routeKey, points]) => {
        const [, monthKey, dateKey] = routeKey.split("|");
        return { monthKey, dateKey, points };
      })
      .sort((left, right) => right.dateKey.localeCompare(left.dateKey));

    const datesByMonth: Record<string, Array<Record<string, unknown>>> = {};
    const views: Record<string, unknown> = {};
    const monthSet = new Set<string>();

    for (const route of routesForRep) {
      monthSet.add(route.monthKey);
      const selection = buildSelectionPayload({
        repId,
        repName: repSummary.repName,
        monthKey: route.monthKey,
        monthLabel: route.monthKey,
        dateKey: route.dateKey,
        dateLabel: route.dateKey,
        points: route.points,
        markerMeta: hospitalCatalog,
        hospitalCount: repSummary.hospitalCount,
        coverageScore
      });
      views[`${route.monthKey}|${route.dateKey}`] = selection;
      datesByMonth[route.monthKey] ??= [];
      datesByMonth[route.monthKey].push({
        value: route.dateKey,
        label: route.dateKey,
        stop_count: Number((selection.summary as Record<string, unknown>).selected_hospital_count ?? 0)
      });
    }

    const months = [...monthSet].sort((left, right) => right.localeCompare(left));
    for (const monthKey of months) {
      const monthDailySelections = Object.entries(views)
        .filter(([viewKey]) => viewKey.startsWith(`${monthKey}|`) && !viewKey.endsWith(`|${ALL_DATES_KEY}`))
        .map(([, value]) => value as SelectionPayload)
        .sort((left, right) =>
          String((right.scope as Record<string, unknown>).date_key ?? "").localeCompare(
            String((left.scope as Record<string, unknown>).date_key ?? "")
          )
        );

      const combinedPointMap = new Map<string, RoutePoint>();
      for (const dailySelection of monthDailySelections) {
        for (const point of dailySelection.points) {
          if (!combinedPointMap.has(point.hospital_id)) {
            combinedPointMap.set(point.hospital_id, point);
          }
        }
      }

      const monthSelection = buildSelectionPayload({
        repId,
        repName: repSummary.repName,
        monthKey,
        monthLabel: monthKey,
        dateKey: ALL_DATES_KEY,
        dateLabel: "전체",
        points: [...combinedPointMap.values()].sort((left, right) => left.seq - right.seq),
        markerMeta: hospitalCatalog,
        hospitalCount: repSummary.hospitalCount,
        coverageScore
      });

      views[`${monthKey}|${ALL_DATES_KEY}`] = monthSelection;
      datesByMonth[monthKey] = [
        {
          value: ALL_DATES_KEY,
          label: "전체",
          day_count: monthDailySelections.length,
          stop_count: Number((monthSelection.summary as Record<string, unknown>).selected_hospital_count ?? 0)
        },
        ...(datesByMonth[monthKey] ?? []).sort((left, right) =>
          String(right.value ?? "").localeCompare(String(left.value ?? ""))
        )
      ];
    }

    repPayloads[repId] = {
      rep_id: repId,
      rep_name: repSummary.repName,
      portfolio_summary: {
        hospital_count: repSummary.hospitalCount,
        coverage_score: Number(coverageScore.toFixed(4)),
        sales: Math.round(repSummary.sales),
        target: Math.round(repSummary.target),
        gap_count: gaps.filter((item) => String(item.rep_id ?? "") === repId).length,
        route_ready_hospital_count: routeReadyCount
      },
      months: months.map((monthKey) => ({
        value: monthKey,
        label: monthKey,
        day_count: Math.max(0, (datesByMonth[monthKey]?.length ?? 1) - 1)
      })),
      dates_by_month: datesByMonth,
      views
    };
  }

  const repIndex = Object.fromEntries(
    sortedRepIds.map((repId) => {
      const repPayload = repPayloads[repId] ?? {};
      const portfolio = ((repPayload.portfolio_summary as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
      return [
        repId,
        {
          rep_id: repId,
          rep_name: repPortfolio.get(repId)?.repName ?? repId,
          region: repPortfolio.get(repId)?.branchName ?? "미지정",
          hospital_count: Number(portfolio.hospital_count ?? 0),
          sales: Number(portfolio.sales ?? 0),
          target: Number(portfolio.target ?? 0),
          coverage_score: Number(portfolio.coverage_score ?? 0)
        }
      ];
    })
  );

  const repOptions = sortedRepIds.map((repId) => ({
    value: repId,
    label: repPortfolio.get(repId)?.repName ?? repId
  }));
  const firstRep = repOptions[0]?.value ?? "";
  const firstRepPayload = ((repPayloads[firstRep] as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const firstMonths = ((firstRepPayload.months as unknown[]) ?? []) as Array<Record<string, unknown>>;
  const defaultMonthKey = String(firstMonths[0]?.value ?? "");

  const metricMonthRows = [...metricMonths].filter(Boolean).sort();
  const periodLabel =
    metricMonthRows.length > 1
      ? `${metricMonthRows[0]}~${metricMonthRows[metricMonthRows.length - 1]}`
      : metricMonthRows[0] ?? "period_unknown";

  const asset = {
    schema_version: "territory_result_asset_v2",
    asset_type: "territory_result_asset",
    source_module: "territory",
    generated_at: new Date().toISOString(),
    period_label: periodLabel,
    metric_months: metricMonthRows,
    overview: {
      hospital_count: hospitalRecords.length,
      rep_count: Object.keys(repIndex).length,
      coverage_rate: Number((routeReadyHospitalIds.size / Math.max(hospitalRecords.length, 1)).toFixed(4)),
      route_selection_count: Object.values(repPayloads).reduce((sum, repPayload) => {
        const views = ((repPayload.views as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
        return sum + Object.keys(views).length;
      }, 0)
    },
    coverage_summary: {
      fully_joined_hospitals: hospitalRecords.filter((row) => Boolean(row.is_fully_joined)).length,
      crm_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_crm)).length,
      sales_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_sales)).length,
      target_linked_hospitals: hospitalRecords.filter((row) => Boolean(row.has_target)).length
    },
    optimization_summary: {
      selected_hospital_count: routeReadyHospitalIds.size,
      recommended_route_groups: [...repPointsByDate.keys()].length,
      total_reps: Object.keys(repIndex).length,
      reason: "CRM 활동기록 기준으로 담당자/월/일 동선 후보를 다시 구성했습니다."
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
    rep_payloads: repPayloads,
    filters: {
      rep_options: repOptions
    },
    default_selection: {
      rep_id: firstRep,
      month_key: defaultMonthKey,
      date_key: ALL_DATES_KEY,
      scope: {
        date_label: defaultMonthKey ? `${defaultMonthKey} 전체` : "선택 대기",
        date_key: ALL_DATES_KEY
      }
    },
    markers: Object.values(hospitalCatalog),
    routes: sortedRepIds.map((repId) => ({
      rep_id: repId,
      rep_name: repPortfolio.get(repId)?.repName ?? repId,
      coverage_score: Number(
        Number(((repIndex[repId] as Record<string, unknown> | undefined)?.coverage_score ?? 0)).toFixed(4)
      )
    })),
    route_groups: [...repPointsByDate.entries()].map(([routeKey, points]) => {
      const [repId, monthKey, dateKey] = routeKey.split("|");
      return {
        rep_id: repId,
        rep_name: repPortfolio.get(repId)?.repName ?? repId,
        month_key: monthKey,
        date_key: dateKey,
        points
      };
    }),
    planned_handoff_modules: ["validation", "builder"],
    diagnostics: {
      sandbox_hospital_record_count: hospitalRecords.length,
      assignment_record_count: assignment?.row_count ?? 0,
      sales_record_count: sales?.row_count ?? 0,
      target_record_count: target?.row_count ?? 0,
      crm_activity_record_count: crmActivity?.row_count ?? 0,
      territory_route_group_count: [...repPointsByDate.keys()].length
    }
  };

  return { asset, rowCount: hospitalRecords.length };
}
