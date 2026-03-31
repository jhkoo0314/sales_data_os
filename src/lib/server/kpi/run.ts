import { analyzeIntake, readLatestIntakeResult } from "@/lib/server/intake/analyze";
import { buildCrmResultAsset } from "@/lib/server/kpi/crm";
import { buildPrescriptionResultAsset } from "@/lib/server/kpi/prescription";
import { buildRadarResultAsset } from "@/lib/server/kpi/radar";
import { buildSandboxResultAsset } from "@/lib/server/kpi/sandbox";
import {
  fileExists,
  kpiHistoryPath,
  latestKpiPath,
  moduleResultAssetPath,
  readJsonFile,
  toPosixRelativePath,
  validationCompanyRoot,
  writeJsonFile
} from "@/lib/server/kpi/shared";
import { buildTerritoryResultAsset } from "@/lib/server/kpi/territory";
import type { KpiRunResult } from "@/lib/server/kpi/types";
import { readLatestNormalizationResult, runNormalization } from "@/lib/server/normalization/run";
import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";

export async function runKpi(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<KpiRunResult> {
  const companyKey = input.companyKey;
  assertValidCompanyKey(companyKey);
  let intake = await readLatestIntakeResult(companyKey);
  if (!intake) {
    intake = await analyzeIntake({
      companyKey,
      executionMode: input.executionMode ?? "integrated"
    });
  }
  if (!intake.ready_for_adapter) {
    throw new Error("KPI 계산 전에 intake가 다음 단계 전달 가능 상태여야 합니다.");
  }

  let normalization = await readLatestNormalizationResult(companyKey);
  if (!normalization) {
    normalization = await runNormalization({ companyKey, executionMode: input.executionMode ?? null });
  }
  if (!normalization || normalization.status === "blocked") {
    throw new Error("KPI 계산 전에 normalization 결과가 필요합니다.");
  }

  const generatedAt = new Date().toISOString();
  const moduleResults: KpiRunResult["module_results"] = [];

  const { asset: crmAsset, rowCount: crmRows } = await buildCrmResultAsset(companyKey);
  const crmPath = moduleResultAssetPath(companyKey, "crm");
  await writeJsonFile(crmPath, crmAsset);
  moduleResults.push({
    module: "crm",
    status: "created",
    result_asset_path: toPosixRelativePath(crmPath),
    row_count: crmRows,
    summary: `CRM 활동 ${crmRows.toLocaleString("ko-KR")}건 기준 KPI 자산을 생성했습니다.`
  });

  const { asset: sandboxAsset, rowCount: sandboxRows } = await buildSandboxResultAsset(companyKey, crmAsset);
  const sandboxPath = moduleResultAssetPath(companyKey, "sandbox");
  await writeJsonFile(sandboxPath, sandboxAsset);
  moduleResults.push({
    module: "sandbox",
    status: "created",
    result_asset_path: toPosixRelativePath(sandboxPath),
    row_count: sandboxRows,
    summary: `Sandbox 병원-월 분석 ${sandboxRows.toLocaleString("ko-KR")}건 기준 result asset를 생성했습니다.`
  });

  const territoryResult = await buildTerritoryResultAsset(companyKey, sandboxAsset);
  if (territoryResult) {
    const territoryPath = moduleResultAssetPath(companyKey, "territory");
    await writeJsonFile(territoryPath, territoryResult.asset);
    moduleResults.push({
      module: "territory",
      status: "created",
      result_asset_path: toPosixRelativePath(territoryPath),
      row_count: territoryResult.rowCount,
      summary: `Territory 커버리지 자산 ${territoryResult.rowCount.toLocaleString("ko-KR")}건을 생성했습니다.`
    });
  } else {
    moduleResults.push({
      module: "territory",
      status: "skipped",
      result_asset_path: null,
      row_count: 0,
      summary: "Territory result asset 생성에 필요한 Sandbox 병원 데이터가 부족해 건너뛰었습니다."
    });
  }

  const prescriptionResult = await buildPrescriptionResultAsset(companyKey);
  if (prescriptionResult) {
    const prescriptionPath = moduleResultAssetPath(companyKey, "prescription");
    await writeJsonFile(prescriptionPath, prescriptionResult.asset);
    moduleResults.push({
      module: "prescription",
      status: "created",
      result_asset_path: toPosixRelativePath(prescriptionPath),
      row_count: prescriptionResult.rowCount,
      summary: `Prescription 흐름 자산 ${prescriptionResult.rowCount.toLocaleString("ko-KR")}건을 생성했습니다.`
    });
  } else {
    moduleResults.push({
      module: "prescription",
      status: "skipped",
      result_asset_path: null,
      row_count: 0,
      summary: "Prescription result asset 생성에 필요한 표준화 데이터가 없어 건너뛰었습니다."
    });
  }

  const radarResult = await buildRadarResultAsset({
    companyKey,
    crmAsset,
    sandboxAsset,
    territoryAsset: territoryResult?.asset ?? null,
    prescriptionAsset: prescriptionResult?.asset ?? null
  });
  const radarPath = moduleResultAssetPath(companyKey, "radar");
  await writeJsonFile(radarPath, radarResult.asset);
  moduleResults.push({
    module: "radar",
    status: "created",
    result_asset_path: toPosixRelativePath(radarPath),
    row_count: radarResult.rowCount,
    summary: `RADAR 신호 ${radarResult.rowCount.toLocaleString("ko-KR")}건 기준 result asset를 생성했습니다.`
  });

  const payload: KpiRunResult = {
    company_key: companyKey,
    status: normalization.status === "completed" ? "completed" : "completed_with_review",
    normalization_status: normalization.status,
    validation_root: toPosixRelativePath(validationCompanyRoot(companyKey)),
    module_results: moduleResults,
    generated_at: generatedAt,
    summary_message: "CRM, Sandbox, Territory, Prescription, RADAR result asset 생성이 완료되었습니다."
  };

  await writeJsonFile(latestKpiPath(companyKey), payload);
  await writeJsonFile(kpiHistoryPath(companyKey, generatedAt), payload);
  return payload;
}

export async function readLatestKpiResult(companyKey: string): Promise<KpiRunResult | null> {
  assertValidCompanyKey(companyKey);
  const filePath = latestKpiPath(companyKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<KpiRunResult>(filePath);
}
