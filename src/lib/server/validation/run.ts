import { promises as fs } from "node:fs";

import { isKpiModuleKey, readLatestKpiModuleResult } from "@/lib/server/kpi";
import { readLatestKpiResult, runKpi } from "@/lib/server/kpi";
import {
  ensureDir,
  moduleRoot,
  readJsonFile,
  toNumber,
  toPosixRelativePath,
  validationMetaRoot,
  validationCompanyRoot,
  writeJsonFile,
  fileExists
} from "@/lib/server/kpi/shared";
import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";
import type {
  ModuleValidationSummary,
  ValidationEvidenceItem,
  ValidationModuleKey,
  ValidationRunSummary,
  ValidationStatus
} from "@/lib/server/validation/types";

function validationHistoryPath(companyKey: string, evaluatedAt: string): string {
  const stamp = evaluatedAt.replace(/[-:T]/g, "").slice(0, 15);
  return `${validationMetaRoot(companyKey)}\\validation_summary_${stamp}.json`;
}

function latestValidationPath(companyKey: string): string {
  return `${validationMetaRoot(companyKey)}\\latest_validation_summary.json`;
}

function latestPipelineSummaryPath(companyKey: string): string {
  return `${validationMetaRoot(companyKey)}\\latest_pipeline_summary.json`;
}

function createRunId(evaluatedAt: string): string {
  const stamp = evaluatedAt.replace(/[-:TZ.]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${stamp}_${rand}`;
}

function runRoot(companyKey: string, runId: string): string {
  return `${validationCompanyRoot(companyKey)}\\runs\\${runId}`;
}

function runsRoot(companyKey: string): string {
  return `${validationCompanyRoot(companyKey)}\\runs`;
}

function runMetaPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\run_meta.json`;
}

function runPipelineSummaryPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\pipeline_summary.json`;
}

function runArtifactsIndexPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\artifacts.index.json`;
}

function runReportContextFullPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\report_context.full.json`;
}

function runReportContextPromptPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\report_context.prompt.json`;
}

function runExecutionAnalysisPath(companyKey: string, runId: string): string {
  return `${runRoot(companyKey, runId)}\\execution_analysis.md`;
}

function runModuleSummaryPath(companyKey: string, runId: string, moduleKey: ValidationModuleKey): string {
  return `${runRoot(companyKey, runId)}\\${moduleKey}_validation_summary.json`;
}

function moduleValidationPath(companyKey: string, moduleKey: ValidationModuleKey): string {
  return `${moduleRoot(companyKey, moduleKey)}\\${moduleKey}_validation_summary.json`;
}

function makeSummary(
  companyKey: string,
  module: ValidationModuleKey,
  status: ValidationStatus,
  score: number,
  reasoning: string,
  interpretedReason: string,
  nextModules: string[],
  gateDetails: Record<string, unknown>,
  evidence: ValidationEvidenceItem[]
): ModuleValidationSummary {
  const summaryPath = moduleValidationPath(companyKey, module);
  return {
    module,
    quality_status: status,
    quality_score: Number(score.toFixed(1)),
    reasoning_note: reasoning,
    interpreted_reason: interpretedReason,
    next_modules: nextModules,
    gate_details: gateDetails,
    evidence,
    evaluated_at: new Date().toISOString(),
    summary_path: toPosixRelativePath(summaryPath)
  };
}

function evaluateCrm(companyKey: string, asset: Record<string, unknown> | null): ModuleValidationSummary {
  if (!asset) {
    return makeSummary(
      companyKey,
      "crm",
      "FAIL",
      0,
      "CRM result asset가 없어 다음 단계 전달 판단을 할 수 없습니다.",
      "CRM 결과 상자가 없어서 매핑 상태를 확인할 수 없습니다.",
      [],
      { asset_missing: true },
      [{ key: "asset_missing", value: 1, note: "crm_result_asset.json 없음" }]
    );
  }
  const mapping = (asset.mapping_quality as Record<string, unknown> | undefined) ?? {};
  const hospitalRate = toNumber(mapping.hospital_mapping_rate);
  const repRate = toNumber(mapping.rep_coverage_rate);
  const score = ((hospitalRate + repRate) / 2) * 100;
  const evidence = [
    { key: "hospital_mapping_rate", value: hospitalRate },
    { key: "rep_coverage_rate", value: repRate }
  ];
  if (hospitalRate >= 0.7 && repRate >= 0.7) {
    return makeSummary(
      companyKey,
      "crm",
      "PASS",
      score,
      "CRM 매핑률과 담당자 커버리지가 안정적이어서 다음 단계로 전달 가능합니다.",
      "거래처와 담당자 연결 품질이 안정적입니다.",
      ["sandbox", "prescription"],
      { hospital_mapping_rate: hospitalRate, rep_coverage_rate: repRate },
      evidence
    );
  }
  if (hospitalRate >= 0.5 && repRate >= 0.5) {
    return makeSummary(
      companyKey,
      "crm",
      "WARN",
      score,
      "CRM 매핑률이 낮지는 않지만 운영 점검이 필요합니다.",
      "실행은 가능하지만 일부 매핑 품질이 권장치보다 낮습니다.",
      ["sandbox", "prescription"],
      { hospital_mapping_rate: hospitalRate, rep_coverage_rate: repRate },
      evidence
    );
  }
  return makeSummary(
    companyKey,
    "crm",
    "FAIL",
    score,
    "CRM 매핑률 또는 담당자 커버리지가 부족해 다음 단계 전달이 위험합니다.",
    "거래처 또는 담당자 연결 품질이 낮아 후속 모듈 신뢰도가 떨어집니다.",
    [],
    { hospital_mapping_rate: hospitalRate, rep_coverage_rate: repRate },
    evidence
  );
}

function evaluateSandbox(companyKey: string, asset: Record<string, unknown> | null): ModuleValidationSummary {
  if (!asset) {
    return makeSummary(
      companyKey,
      "sandbox",
      "FAIL",
      0,
      "Sandbox result asset가 없어 전달 판단을 할 수 없습니다.",
      "Sandbox 통합 결과가 없어 조인 품질을 평가할 수 없습니다.",
      [],
      { asset_missing: true },
      [{ key: "asset_missing", value: 1, note: "sandbox_result_asset.json 없음" }]
    );
  }
  const join = (asset.join_quality as Record<string, unknown> | undefined) ?? {};
  const summary = (asset.analysis_summary as Record<string, unknown> | undefined) ?? {};
  const joinRate = toNumber(join.crm_sales_join_rate);
  const fullJoinRate = toNumber(join.full_join_rate);
  const hospitalCount = toNumber(summary.total_hospitals);
  const monthCount = toNumber(summary.total_months);
  const score = ((joinRate * 0.5) + (fullJoinRate * 0.3) + (Math.min(hospitalCount / 10, 1) * 0.2)) * 100;
  const evidence = [
    { key: "crm_sales_join_rate", value: joinRate },
    { key: "full_join_rate", value: fullJoinRate },
    { key: "total_hospitals", value: hospitalCount },
    { key: "total_months", value: monthCount }
  ];
  if (joinRate >= 0.6 && hospitalCount >= 10 && monthCount >= 1) {
    return makeSummary(
      companyKey,
      "sandbox",
      "PASS",
      score,
      "Sandbox 조인율과 병원 수가 기준을 넘어 다음 단계 전달이 가능합니다.",
      "매출, 목표, CRM 연결이 안정적이어서 다음 단계 활용이 가능합니다.",
      ["territory", "builder"],
      { crm_sales_join_rate: joinRate, full_join_rate: fullJoinRate, total_hospitals: hospitalCount, total_months: monthCount },
      evidence
    );
  }
  if (joinRate >= 0.4 && hospitalCount >= 5 && monthCount >= 1) {
    return makeSummary(
      companyKey,
      "sandbox",
      "WARN",
      score,
      "Sandbox 조인율 또는 병원 수가 권장치보다 낮아 운영 검토가 필요합니다.",
      "통합 분석은 가능하지만 연결 품질 또는 범위가 권장치보다 낮습니다.",
      ["territory", "builder"],
      { crm_sales_join_rate: joinRate, full_join_rate: fullJoinRate, total_hospitals: hospitalCount, total_months: monthCount },
      evidence
    );
  }
  return makeSummary(
    companyKey,
    "sandbox",
    "FAIL",
    score,
    "Sandbox 조인 품질이 부족해 다음 단계 전달을 보류하는 것이 안전합니다.",
    "핵심 source 연결 품질이 낮아 후속 판단의 신뢰도가 부족합니다.",
    [],
    { crm_sales_join_rate: joinRate, full_join_rate: fullJoinRate, total_hospitals: hospitalCount, total_months: monthCount },
    evidence
  );
}

function evaluatePrescription(companyKey: string, asset: Record<string, unknown> | null): ModuleValidationSummary {
  if (!asset) {
    return makeSummary(
      companyKey,
      "prescription",
      "SKIP",
      0,
      "Prescription result asset가 없어 이번 실행에서는 건너뜁니다.",
      "Prescription 입력이 없어 이번 실행에서는 보조 모듈로 건너뜁니다.",
      ["sandbox"],
      { asset_missing: true },
      [{ key: "asset_missing", value: 1, note: "prescription_result_asset.json 없음" }]
    );
  }
  const mapping = (asset.mapping_quality as Record<string, unknown> | undefined) ?? {};
  const gapSummary = (asset.validation_gap_summary as Record<string, unknown> | undefined) ?? {};
  const ruleCoverage = toNumber(mapping.rule_coverage);
  const totalGaps = toNumber(gapSummary.total_gaps);
  const score = Math.max(0, (ruleCoverage * 100) - Math.min(totalGaps / 10, 40));
  const evidence = [
    { key: "rule_coverage", value: ruleCoverage },
    { key: "total_gaps", value: totalGaps }
  ];
  if (ruleCoverage >= 0.7) {
    return makeSummary(
      companyKey,
      "prescription",
      "PASS",
      score,
      "Prescription 흐름 커버리지가 기준 이상이라 통합 진단에 활용할 수 있습니다.",
      "처방 흐름 연결 품질이 양호해 참고 분석에 활용할 수 있습니다.",
      ["sandbox"],
      { rule_coverage: ruleCoverage, total_gaps: totalGaps },
      evidence
    );
  }
  if (ruleCoverage >= 0.4) {
    return makeSummary(
      companyKey,
      "prescription",
      "WARN",
      score,
      "Prescription 흐름은 읽을 수 있지만 누락이 많아 보완 안내가 필요합니다.",
      "원본은 읽히지만 누락이 많아 보조 참고 수준으로 보는 것이 안전합니다.",
      ["sandbox"],
      { rule_coverage: ruleCoverage, total_gaps: totalGaps },
      evidence
    );
  }
  return makeSummary(
    companyKey,
    "prescription",
    "FAIL",
    score,
    "Prescription 흐름 커버리지가 낮아 독립 판단 기준으로는 부족합니다. 다만 통합 진단용 기록은 유지합니다.",
    "처방 흐름 품질이 낮아 단독 판단 기준으로 쓰기 어렵습니다.",
    ["sandbox"],
    { rule_coverage: ruleCoverage, total_gaps: totalGaps },
    evidence
  );
}

function evaluateTerritory(companyKey: string, asset: Record<string, unknown> | null): ModuleValidationSummary {
  if (!asset) {
    return makeSummary(
      companyKey,
      "territory",
      "SKIP",
      0,
      "Territory result asset가 없어 이번 실행에서는 건너뜁니다.",
      "Territory 입력이 아직 준비되지 않아 이번 실행에서는 건너뜁니다.",
      ["builder"],
      { asset_missing: true },
      [{ key: "asset_missing", value: 1, note: "territory_result_asset.json 없음" }]
    );
  }
  const overview = (asset.overview as Record<string, unknown> | undefined) ?? {};
  const coverage = toNumber(overview.coverage_rate);
  const repCount = toNumber(overview.rep_count);
  const hospitalCount = toNumber(overview.hospital_count);
  const score = ((coverage * 0.7) + (Math.min(repCount / 5, 1) * 0.1) + (Math.min(hospitalCount / 20, 1) * 0.2)) * 100;
  const evidence = [
    { key: "coverage_rate", value: coverage },
    { key: "rep_count", value: repCount },
    { key: "hospital_count", value: hospitalCount }
  ];
  if (coverage >= 0.7) {
    return makeSummary(
      companyKey,
      "territory",
      "PASS",
      score,
      "Territory 커버리지가 안정적이어서 Builder 전달이 가능합니다.",
      "담당 구역 커버리지 품질이 안정적입니다.",
      ["builder"],
      { coverage_rate: coverage, rep_count: repCount, hospital_count: hospitalCount },
      evidence
    );
  }
  if (coverage >= 0.4) {
    return makeSummary(
      companyKey,
      "territory",
      "WARN",
      score,
      "Territory 커버리지는 읽을 수 있지만 담당 구역 품질 점검이 필요합니다.",
      "실행은 가능하지만 배치 품질과 커버리지 점검이 필요합니다.",
      ["builder"],
      { coverage_rate: coverage, rep_count: repCount, hospital_count: hospitalCount },
      evidence
    );
  }
  return makeSummary(
    companyKey,
    "territory",
    "FAIL",
    score,
    "Territory 커버리지가 낮아 지도/동선 결과를 그대로 전달하기 어렵습니다.",
    "담당 구역 커버리지가 낮아 실행 문맥 신뢰도가 부족합니다.",
    [],
    { coverage_rate: coverage, rep_count: repCount, hospital_count: hospitalCount },
    evidence
  );
}

function evaluateRadar(companyKey: string, asset: Record<string, unknown> | null): ModuleValidationSummary {
  if (!asset) {
    return makeSummary(
      companyKey,
      "radar",
      "SKIP",
      0,
      "RADAR result asset가 없어 이번 실행에서는 건너뜁니다.",
      "RADAR 신호가 없어 의사결정 지원 단계를 건너뜁니다.",
      ["builder"],
      { asset_missing: true },
      [{ key: "asset_missing", value: 1, note: "radar_result_asset.json 없음" }]
    );
  }
  const confidence = toNumber(asset.confidence);
  const signalCount = toNumber(asset.signal_count);
  const readiness = toNumber(asset.decision_readiness);
  const score = Math.max(readiness, confidence * 100);
  const evidence = [
    { key: "confidence", value: confidence },
    { key: "signal_count", value: signalCount },
    { key: "decision_readiness", value: readiness }
  ];
  if (confidence >= 0.6 && signalCount >= 1) {
    return makeSummary(
      companyKey,
      "radar",
      "APPROVED",
      score,
      "RADAR 신호와 신뢰도가 확보되어 의사결정 지원 단계까지 전달 가능합니다.",
      "우선 신호와 신뢰도가 확보되어 인텔리전스 단계 활용이 가능합니다.",
      ["builder"],
      { confidence, signal_count: signalCount, decision_readiness: readiness },
      evidence
    );
  }
  return makeSummary(
    companyKey,
    "radar",
    "WARN",
    score,
    "RADAR 신호는 생성됐지만 아직 의사결정 승인 단계로 보기에는 근거가 약합니다.",
    "신호는 있으나 우선순위 근거가 더 필요합니다.",
    ["builder"],
    { confidence, signal_count: signalCount, decision_readiness: readiness },
    evidence
  );
}

function overallFromModules(summaries: ModuleValidationSummary[]): ValidationStatus {
  const byModule = Object.fromEntries(summaries.map((item) => [item.module, item]));
  if (byModule.crm?.quality_status === "FAIL" || byModule.sandbox?.quality_status === "FAIL") {
    return "FAIL";
  }
  if (summaries.some((item) => item.quality_status === "WARN" || item.quality_status === "FAIL")) {
    return "WARN";
  }
  if (byModule.radar?.quality_status === "APPROVED") {
    return "APPROVED";
  }
  return "PASS";
}

function recommendedActions(summaries: ModuleValidationSummary[]): string[] {
  return summaries
    .filter((item) => item.quality_status === "WARN" || item.quality_status === "FAIL")
    .map((item) => `${item.module.toUpperCase()}: ${item.reasoning_note}`);
}

function overallScore(summaries: ModuleValidationSummary[]): number {
  if (!summaries.length) {
    return 0;
  }
  return Number((summaries.reduce((sum, item) => sum + item.quality_score, 0) / summaries.length).toFixed(1));
}

function pipelineSummaryPayload(payload: ValidationRunSummary) {
  return {
    run_id: payload.run_id,
    overall_status: payload.overall_status,
    overall_score: payload.overall_score,
    steps: payload.steps,
    summary_by_module: payload.summary_by_module,
    recommended_actions: payload.recommended_actions,
    evaluated_at: payload.evaluated_at
  };
}

function artifactsIndexPayload(
  payload: ValidationRunSummary,
  resultAssetPaths: Array<{ module: ValidationModuleKey | "kpi"; path: string; status: string }>
) {
  return {
    company_key: payload.company_key,
    run_id: payload.run_id,
    generated_at: payload.evaluated_at,
    artifacts: [
      ...resultAssetPaths.map((item) => ({
        artifact_type: "result_asset",
        module: item.module,
        path: item.path,
        status: item.status
      })),
      ...Object.values(payload.summary_by_module).map((summary) => ({
        artifact_type: "validation_summary",
        module: summary.module,
        path: summary.summary_path,
        status: summary.quality_status
      })),
      {
        artifact_type: "pipeline_summary",
        module: "pipeline",
        path: payload.pipeline_summary_path,
        status: payload.overall_status
      },
      {
        artifact_type: "report_context",
        module: "pipeline",
        path: toPosixRelativePath(runReportContextFullPath(payload.company_key, payload.run_id)),
        status: payload.overall_status
      },
      {
        artifact_type: "report_context_prompt",
        module: "pipeline",
        path: toPosixRelativePath(runReportContextPromptPath(payload.company_key, payload.run_id)),
        status: payload.overall_status
      },
      {
        artifact_type: "execution_analysis",
        module: "pipeline",
        path: toPosixRelativePath(runExecutionAnalysisPath(payload.company_key, payload.run_id)),
        status: payload.overall_status
      }
    ]
  };
}

function buildReportContextFull(
  payload: ValidationRunSummary,
  resultAssetPaths: Array<{ module: ValidationModuleKey | "kpi"; path: string; status: string }>
) {
  const summaries = Object.values(payload.summary_by_module);
  const keyFindings = summaries
    .filter((item) => item.quality_status === "WARN" || item.quality_status === "FAIL" || item.quality_status === "APPROVED")
    .map((item) => ({
      module: item.module,
      status: item.quality_status,
      finding: item.reasoning_note
    }));
  const priorityIssues = summaries
    .filter((item) => item.quality_status === "FAIL" || item.quality_status === "WARN")
    .map((item) => ({
      module: item.module,
      interpreted_reason: item.interpreted_reason ?? item.reasoning_note,
      evidence: item.evidence
    }));
  const evidenceIndex = Object.fromEntries(
    summaries.map((item) => [item.module, item.evidence])
  );
  const stepStatusMap = Object.fromEntries(
    payload.steps.map((step) => [step.step, step.status])
  );

  return {
    company_key: payload.company_key,
    run_id: payload.run_id,
    validation_summary: {
      overall_status: payload.overall_status,
      overall_score: payload.overall_score
    },
    executive_summary:
      payload.overall_status === "PASS" || payload.overall_status === "APPROVED"
        ? "핵심 모듈 결과가 다음 단계 전달 가능 상태입니다."
        : "일부 모듈은 실행 가능하지만 운영 점검 또는 보완이 필요한 상태입니다.",
    key_findings: keyFindings,
    priority_issues: priorityIssues,
    evidence_index: evidenceIndex,
    linked_artifacts: {
      pipeline_summary: payload.pipeline_summary_path,
      validation_summaries: summaries.map((item) => item.summary_path),
      result_assets: resultAssetPaths
    },
    step_status_map: stepStatusMap
  };
}

function buildReportContextPrompt(payload: ValidationRunSummary) {
  const summaries = Object.values(payload.summary_by_module);
  return {
    company_key: payload.company_key,
    run_id: payload.run_id,
    overall_status: payload.overall_status,
    overall_score: payload.overall_score,
    top_findings: summaries
      .filter((item) => item.quality_status !== "PASS")
      .slice(0, 5)
      .map((item) => ({
        module: item.module,
        status: item.quality_status,
        reasoning_note: item.reasoning_note
      })),
    answer_scope: "final_report_only",
    forbidden_actions: ["recalculate_kpi", "raw_rejoin"]
  };
}

function buildExecutionAnalysisMarkdown(payload: ValidationRunSummary): string {
  const lines = [
    "# Execution Analysis",
    "",
    `- company_key: ${payload.company_key}`,
    `- run_id: ${payload.run_id}`,
    `- overall_status: ${payload.overall_status}`,
    `- overall_score: ${payload.overall_score}`,
    "",
    "## Steps"
  ];

  for (const step of payload.steps) {
    const summary = payload.summary_by_module[step.step];
    lines.push(`### ${step.step.toUpperCase()}`);
    lines.push(`- status: ${step.status}`);
    lines.push(`- reasoning_note: ${step.reasoning_note}`);
    if (summary?.interpreted_reason) {
      lines.push(`- interpreted_reason: ${summary.interpreted_reason}`);
    }
    if (summary?.next_modules?.length) {
      lines.push(`- next_modules: ${summary.next_modules.join(", ")}`);
    }
    if (summary?.evidence?.length) {
      lines.push(`- evidence:`);
      for (const item of summary.evidence) {
        lines.push(`  - ${item.key}=${item.value}${item.note ? ` (${item.note})` : ""}`);
      }
    }
    lines.push("");
  }

  if (payload.recommended_actions.length) {
    lines.push("## Recommended Actions");
    for (const item of payload.recommended_actions) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export async function runValidation(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<ValidationRunSummary> {
  const companyKey = input.companyKey;
  assertValidCompanyKey(companyKey);
  let kpi = await readLatestKpiResult(companyKey);
  if (!kpi) {
    kpi = await runKpi({ companyKey, executionMode: input.executionMode ?? null });
  }

  const [crm, sandbox, prescription, territory, radar] = await Promise.all([
    readLatestKpiModuleResult(companyKey, "crm"),
    readLatestKpiModuleResult(companyKey, "sandbox"),
    readLatestKpiModuleResult(companyKey, "prescription"),
    readLatestKpiModuleResult(companyKey, "territory"),
    readLatestKpiModuleResult(companyKey, "radar")
  ]);

  const summaries = [
    evaluateCrm(companyKey, crm),
    evaluateSandbox(companyKey, sandbox),
    evaluatePrescription(companyKey, prescription),
    evaluateTerritory(companyKey, territory),
    evaluateRadar(companyKey, radar)
  ];

  for (const summary of summaries) {
    await writeJsonFile(moduleValidationPath(companyKey, summary.module), summary);
  }

  const evaluatedAt = new Date().toISOString();
  const runId = createRunId(evaluatedAt);
  const currentRunRoot = runRoot(companyKey, runId);
  await ensureDir(currentRunRoot);
  const payload: ValidationRunSummary = {
    company_key: companyKey,
    run_id: runId,
    overall_status: overallFromModules(summaries),
    overall_score: overallScore(summaries),
    evaluated_at: evaluatedAt,
    steps: summaries.map((item) => ({
      step: item.module,
      status: item.quality_status,
      reasoning_note: item.reasoning_note,
      summary_path: item.summary_path
    })),
    summary_by_module: Object.fromEntries(summaries.map((item) => [item.module, item])),
    recommended_actions: recommendedActions(summaries),
    pipeline_summary_path: toPosixRelativePath(runPipelineSummaryPath(companyKey, runId)),
    run_root: toPosixRelativePath(currentRunRoot)
  };

  const resultAssetPaths = (
    await Promise.all(
      ["crm", "sandbox", "prescription", "territory", "radar"].map(async (moduleKey) => {
        if (!isKpiModuleKey(moduleKey)) {
          return null;
        }
        const moduleAsset = await readLatestKpiModuleResult(companyKey, moduleKey);
        if (!moduleAsset) {
          return null;
        }
        const summary = payload.summary_by_module[moduleKey];
        return {
          module: moduleKey,
          path: toPosixRelativePath(moduleRoot(companyKey, moduleKey) + `\\${moduleKey}_result_asset.json`),
          status: summary?.quality_status ?? "PASS"
        };
      })
    )
  ).filter(Boolean) as Array<{ module: ValidationModuleKey | "kpi"; path: string; status: string }>;

  await writeJsonFile(latestValidationPath(companyKey), payload);
  await writeJsonFile(validationHistoryPath(companyKey, evaluatedAt), payload);
  await writeJsonFile(latestPipelineSummaryPath(companyKey), pipelineSummaryPayload(payload));
  await writeJsonFile(runMetaPath(companyKey, runId), {
    run_id: runId,
    company_key: companyKey,
    stage: "validation",
    evaluated_at: evaluatedAt,
    overall_status: payload.overall_status
  });
  await writeJsonFile(runPipelineSummaryPath(companyKey, runId), pipelineSummaryPayload(payload));
  await writeJsonFile(runArtifactsIndexPath(companyKey, runId), artifactsIndexPayload(payload, resultAssetPaths));
  await writeJsonFile(runReportContextFullPath(companyKey, runId), buildReportContextFull(payload, resultAssetPaths));
  await writeJsonFile(runReportContextPromptPath(companyKey, runId), buildReportContextPrompt(payload));
  for (const summary of summaries) {
    await writeJsonFile(runModuleSummaryPath(companyKey, runId, summary.module), summary);
  }
  await ensureDir(runRoot(companyKey, runId));
  await fs.writeFile(runExecutionAnalysisPath(companyKey, runId), buildExecutionAnalysisMarkdown(payload), "utf8");
  return payload;
}

export async function readLatestValidationSummary(companyKey: string): Promise<ValidationRunSummary | null> {
  assertValidCompanyKey(companyKey);
  const filePath = latestValidationPath(companyKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<ValidationRunSummary>(filePath);
}

export async function readLatestValidationModuleSummary(
  companyKey: string,
  moduleKey: ValidationModuleKey
): Promise<ModuleValidationSummary | null> {
  assertValidCompanyKey(companyKey);
  const filePath = moduleValidationPath(companyKey, moduleKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<ModuleValidationSummary>(filePath);
}

export async function readRunPipelineSummary(
  companyKey: string,
  runId: string
): Promise<Record<string, unknown> | null> {
  assertValidCompanyKey(companyKey);
  const filePath = runPipelineSummaryPath(companyKey, runId);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<Record<string, unknown>>(filePath);
}

export async function readRunArtifactsIndex(
  companyKey: string,
  runId: string
): Promise<Record<string, unknown> | null> {
  assertValidCompanyKey(companyKey);
  const filePath = runArtifactsIndexPath(companyKey, runId);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<Record<string, unknown>>(filePath);
}

export async function readRunReportContext(
  companyKey: string,
  runId: string
): Promise<{ full: Record<string, unknown>; prompt: Record<string, unknown> } | null> {
  assertValidCompanyKey(companyKey);
  const fullPath = runReportContextFullPath(companyKey, runId);
  const promptPath = runReportContextPromptPath(companyKey, runId);
  if (!(await fileExists(fullPath)) || !(await fileExists(promptPath))) {
    return null;
  }
  return {
    full: await readJsonFile<Record<string, unknown>>(fullPath),
    prompt: await readJsonFile<Record<string, unknown>>(promptPath)
  };
}

export async function listValidationRuns(companyKey: string): Promise<
  Array<{
    run_id: string;
    overall_status: string;
    evaluated_at: string;
    overall_score: number;
    run_root: string;
  }>
> {
  assertValidCompanyKey(companyKey);
  const targetRoot = runsRoot(companyKey);
  if (!(await fileExists(targetRoot))) {
    return [];
  }

  const entries = await fs.readdir(targetRoot, { withFileTypes: true });
  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const metaPath = `${targetRoot}\\${entry.name}\\run_meta.json`;
        const pipelinePath = `${targetRoot}\\${entry.name}\\pipeline_summary.json`;
        if (!(await fileExists(metaPath)) || !(await fileExists(pipelinePath))) {
          return null;
        }
        const meta = await readJsonFile<Record<string, unknown>>(metaPath);
        const pipeline = await readJsonFile<Record<string, unknown>>(pipelinePath);
        return {
          run_id: String(meta.run_id ?? entry.name),
          overall_status: String(pipeline.overall_status ?? meta.overall_status ?? "UNKNOWN"),
          evaluated_at: String(meta.evaluated_at ?? ""),
          overall_score: toNumber(pipeline.overall_score),
          run_root: toPosixRelativePath(`${targetRoot}\\${entry.name}`)
        };
      })
  );

  return runs
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => right.evaluated_at.localeCompare(left.evaluated_at));
}
