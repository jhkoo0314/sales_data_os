import type { CrmActivityRecord, CrmMetricSet } from "@/lib/server/kpi/types";
import {
  avg,
  cleanText,
  clip01,
  normalizeHospitalNameKey,
  readLookupRows,
  readStandardizedPayload,
  toDateToken,
  toMonthToken,
  toNumber,
  toPct
} from "@/lib/server/kpi/shared";

export async function buildCrmResultAsset(
  companyKey: string
): Promise<{ asset: Record<string, unknown>; rowCount: number }> {
  const crmActivity = await readStandardizedPayload(companyKey, "crm", "standardized_crm_activity.json");
  const crmRepMaster = await readStandardizedPayload(companyKey, "crm", "standardized_crm_rep_master.json");
  if (!crmActivity || !crmActivity.rows.length) {
    throw new Error("CRM KPI 계산을 위한 standardized_crm_activity.json이 없습니다.");
  }

  const repMasterById = new Map(
    (crmRepMaster?.rows ?? []).map((row) => [
      cleanText(row.rep_id),
      {
        repName: cleanText(row.rep_name),
        branchId: cleanText(row.branch_id),
        branchName: cleanText(row.branch_name)
      }
    ])
  );
  const { byAccountName, byRepName } = await readLookupRows(companyKey);

  const activities: CrmActivityRecord[] = crmActivity.rows.map((row) => {
    const repName = cleanText(row.rep_name || row.rep || row["담당자명"]);
    const repId = cleanText(row.rep_id || row["영업사원코드"]) || byRepName.get(repName)?.repId || "";
    const repMeta = repMasterById.get(repId);
    const hospitalName = cleanText(row.account || row["병원명"]);
    const accountMeta = byAccountName.get(hospitalName) || byAccountName.get(normalizeHospitalNameKey(hospitalName));
    const activityDate = toDateToken(row.activity_date || row["실행일"]);
    return {
      metricMonth: toMonthToken(row.period || row.metric_month || activityDate),
      activityDate,
      repId,
      repName: repMeta?.repName || repName || byRepName.get(repName)?.repName || repId || "UNASSIGNED",
      branchId: repMeta?.branchId || accountMeta?.branchId || "",
      branchName: repMeta?.branchName || accountMeta?.branchName || "",
      hospitalId: cleanText(row.account_id || row["병원코드"]) || accountMeta?.accountId || hospitalName,
      hospitalName,
      visitCount: Math.max(1, toNumber(row.visit_count || row["방문횟수"], 1)),
      hasDetailCall: ["y", "yes", "1", "true"].includes(
        cleanText(row.has_detail_call || row["상세콜여부"]).toLowerCase()
      ),
      trustLevel: cleanText(row.trust_level || row["신뢰등급"]).toLowerCase(),
      sentimentScore: cleanText(row.sentiment_score || row["정서점수"])
        ? toNumber(row.sentiment_score || row["정서점수"])
        : null,
      qualityFactor: cleanText(row.quality_factor || row["품질계수"])
        ? toNumber(row.quality_factor || row["품질계수"])
        : null,
      impactFactor: cleanText(row.impact_factor || row["영향계수"])
        ? toNumber(row.impact_factor || row["영향계수"])
        : null,
      activityWeight: cleanText(row.activity_weight || row["행동가중치"])
        ? toNumber(row.activity_weight || row["행동가중치"])
        : null,
      weightedActivityScore: cleanText(row.weighted_activity_score || row["가중활동점수"])
        ? toNumber(row.weighted_activity_score || row["가중활동점수"])
        : null,
      nextActionText: cleanText(row.next_action_text || row["차기액션"]),
      activityType: cleanText(row.activity_type || row["액션유형"])
    };
  });

  const trustFactor = (raw: string): number => ({ verified: 1, assisted: 0.85, self_only: 0.7 }[raw] ?? 1);
  const behaviorKey = (raw: string): string => {
    const normalized = raw.toLowerCase().replace(/[\s\-_/()]+/g, "");
    const mapping: Record<string, string> = {
      제품설명: "PT",
      detail: "PT",
      detailing: "PT",
      pt: "PT",
      demo: "Demo",
      시연: "Demo",
      closing: "Closing",
      클로징: "Closing",
      needs: "Needs",
      니즈발굴: "Needs",
      니즈환기: "Needs",
      대면: "FaceToFace",
      방문: "FaceToFace",
      visit: "FaceToFace",
      컨택: "Contact",
      call: "Contact",
      email: "Contact",
      전화: "Contact",
      접근: "Access",
      access: "Access",
      feedback: "Feedback",
      피드백: "Feedback"
    };
    return mapping[normalized] ?? "FaceToFace";
  };

  const grouped = new Map<string, CrmActivityRecord[]>();
  for (const activity of activities) {
    const key = `${activity.repId}::${activity.metricMonth}`;
    grouped.set(key, [...(grouped.get(key) ?? []), activity]);
  }

  const repMonthlyKpi11: Array<Record<string, unknown>> = [];
  const monthlyCollect = new Map<string, CrmMetricSet[]>();
  for (const [key, rows] of [...grouped.entries()].sort()) {
    const [repId, metricMonth] = key.split("::");
    const totalVisits = rows.reduce((sum, row) => sum + row.visitCount, 0);
    const activeDays = new Set(rows.map((row) => row.activityDate).filter(Boolean)).size;
    const uniqueHospitals = new Set(rows.map((row) => row.hospitalId).filter(Boolean)).size;
    const totalActions = rows.length;
    const validNextActions = rows.filter((row) => row.nextActionText.length >= 5).length;
    const totalNextActions = rows.filter((row) => row.nextActionText.length > 0).length;
    const weightedRows = rows.map((row) => {
      const quality = clip01(row.qualityFactor ?? 1);
      const impact = clip01(row.impactFactor ?? 1);
      const weight = clip01(row.activityWeight ?? 1);
      return row.weightedActivityScore ?? clip01(weight * quality * impact * trustFactor(row.trustLevel));
    });
    const avgWeighted = avg(weightedRows);
    const hir = toPct(avgWeighted > 1 ? avgWeighted / 100 : avgWeighted);
    const rtr = rows.some((row) => row.sentimentScore !== null)
      ? toPct(avg(rows.filter((row) => row.sentimentScore !== null).map((row) => row.sentimentScore as number)))
      : 0;
    const bcr = toPct((0.4 * clip01(totalVisits / 20)) + (0.6 * clip01(activeDays / 16)));
    const phr = totalActions > 0 ? toPct(validNextActions / totalActions) : 0;
    const nar = totalNextActions > 0 ? toPct(validNextActions / totalNextActions) : 0;
    const ahs = toPct(
      (0.35 * clip01(activeDays / 20)) +
        (0.25 * clip01(rtr / 100)) +
        (0.2 * clip01(uniqueHospitals / 20)) +
        0.2
    );
    const pv = toPct((0.7 * clip01(hir / 100)) + (0.3 * clip01(nar / 100)));
    const pi = toPct((0.7 * clip01(hir / 100)) + (0.3 * clip01(bcr / 100)));
    const fgr = Number((((pi - 50) / 50) * 100).toFixed(1));
    const trg = Number((pi - 100).toFixed(1));
    const behaviorSet = new Set(rows.map((row) => behaviorKey(row.activityType)));
    const swr = toPct(behaviorSet.size / 8);
    const coachScore = Number((0.3 * hir + 0.2 * rtr + 0.15 * bcr + 0.15 * phr + 0.1 * nar + 0.1 * ahs).toFixed(1));
    const metricSet: CrmMetricSet = { hir, rtr, bcr, phr, nar, ahs, pv, fgr, pi, trg, swr, coach_score: coachScore };
    repMonthlyKpi11.push({
      rep_id: repId,
      metric_month: metricMonth,
      metric_set: metricSet,
      behavior_mix_8: Object.fromEntries(
        ["PT", "Demo", "Closing", "Needs", "FaceToFace", "Contact", "Access", "Feedback"].map((item) => [
          item,
          Number(
            (
              rows.filter((row) => behaviorKey(row.activityType) === item).length / Math.max(totalVisits, 1)
            ).toFixed(4)
          )
        ])
      ),
      unscored_reasons: rows.some((row) => row.sentimentScore !== null) ? [] : ["rtr_sentiment_missing"]
    });
    monthlyCollect.set(metricMonth, [...(monthlyCollect.get(metricMonth) ?? []), metricSet]);
  }

  const monthlyKpi11 = [...monthlyCollect.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([metricMonth, rows]) => ({
      metric_month: metricMonth,
      metric_set: {
        hir: avg(rows.map((row) => row.hir)),
        rtr: avg(rows.map((row) => row.rtr)),
        bcr: avg(rows.map((row) => row.bcr)),
        phr: avg(rows.map((row) => row.phr)),
        nar: avg(rows.map((row) => row.nar)),
        ahs: avg(rows.map((row) => row.ahs)),
        pv: avg(rows.map((row) => row.pv)),
        fgr: avg(rows.map((row) => row.fgr)),
        pi: avg(rows.map((row) => row.pi)),
        trg: avg(rows.map((row) => row.trg)),
        swr: avg(rows.map((row) => row.swr)),
        coach_score: avg(rows.map((row) => row.coach_score))
      },
      rep_count: rows.length,
      unscored_count: 0
    }));

  const asset = {
    schema_version: "crm_result_asset_v1",
    asset_type: "crm_result_asset",
    source_module: "crm",
    generated_at: new Date().toISOString(),
    metric_version: "crm_kpi_engine_v1",
    activity_context: {
      total_activity_records: activities.length,
      date_range_start: [...activities.map((row) => row.activityDate).filter(Boolean)].sort()[0] ?? null,
      date_range_end: [...activities.map((row) => row.activityDate).filter(Boolean)].sort().at(-1) ?? null,
      unique_reps: new Set(activities.map((row) => row.repId)).size,
      unique_hospitals: new Set(activities.map((row) => row.hospitalId)).size,
      unique_branches: new Set(activities.map((row) => row.branchId).filter(Boolean)).size,
      activity_types_found: [...new Set(activities.map((row) => row.activityType).filter(Boolean))].sort()
    },
    mapping_quality: {
      total_raw_records: activities.length,
      mapped_hospital_count: activities.filter((row) => row.hospitalId !== row.hospitalName).length,
      unmapped_hospital_count: activities.filter((row) => row.hospitalId === row.hospitalName).length,
      hospital_mapping_rate: Number(
        (
          activities.filter((row) => row.hospitalId !== row.hospitalName).length / Math.max(activities.length, 1)
        ).toFixed(3)
      ),
      rep_coverage_rate: Number(
        (
          activities.filter((row) => row.repId && repMasterById.has(row.repId)).length /
          Math.max(activities.length, 1)
        ).toFixed(3)
      )
    },
    behavior_profiles: [...new Set(activities.map((row) => row.repId))].map((repId) => {
      const rows = activities.filter((row) => row.repId === repId);
      return {
        rep_id: repId,
        rep_name: rows[0]?.repName ?? repId,
        branch_id: rows[0]?.branchId ?? "",
        branch_name: rows[0]?.branchName ?? "",
        total_visits: rows.reduce((sum, row) => sum + row.visitCount, 0),
        unique_hospitals: new Set(rows.map((row) => row.hospitalId)).size,
        avg_visits_per_hospital: Number(
          (
            rows.reduce((sum, row) => sum + row.visitCount, 0) /
            Math.max(new Set(rows.map((row) => row.hospitalId)).size, 1)
          ).toFixed(2)
        ),
        detail_call_rate: Number((rows.filter((row) => row.hasDetailCall).length / Math.max(rows.length, 1)).toFixed(3)),
        top_activity_types: [...new Set(rows.map((row) => row.activityType).filter(Boolean))].slice(0, 3),
        active_months: [...new Set(rows.map((row) => row.metricMonth))].sort()
      };
    }),
    monthly_kpi: monthlyKpi11.map((row) => ({
      metric_month: row.metric_month,
      total_visits: activities
        .filter((item) => item.metricMonth === row.metric_month)
        .reduce((sum, item) => sum + item.visitCount, 0),
      total_reps_active: new Set(
        activities.filter((item) => item.metricMonth === row.metric_month).map((item) => item.repId)
      ).size,
      total_hospitals_visited: new Set(
        activities.filter((item) => item.metricMonth === row.metric_month).map((item) => item.hospitalId)
      ).size,
      avg_visits_per_rep: Number(
        (
          activities
            .filter((item) => item.metricMonth === row.metric_month)
            .reduce((sum, item) => sum + item.visitCount, 0) /
          Math.max(
            new Set(activities.filter((item) => item.metricMonth === row.metric_month).map((item) => item.repId))
              .size,
            1
          )
        ).toFixed(2)
      ),
      detail_call_count: activities.filter((item) => item.metricMonth === row.metric_month && item.hasDetailCall)
        .length
    })),
    rep_monthly_kpi_11: repMonthlyKpi11,
    monthly_kpi_11: monthlyKpi11,
    planned_handoff_modules: ["sandbox", "validation"]
  };

  return { asset, rowCount: activities.length };
}
