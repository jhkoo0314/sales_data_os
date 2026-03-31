import { promises as fs } from "node:fs";
import path from "node:path";

import {
  listValidationRuns,
  readRunArtifactsIndex,
  readRunPipelineSummary,
  readRunReportContext,
  readLatestValidationModuleSummary,
  readLatestValidationSummary,
  runValidation
} from "@/lib/server/validation";

import { describe, expect, it } from "vitest";

describe("validation module flow", () => {
  it("creates module validation summaries and overall summary for company_000002", async () => {
    const result = await runValidation({ companyKey: "company_000002", executionMode: "integrated" });
    const latest = await readLatestValidationSummary("company_000002");
    const sandboxSummary = await readLatestValidationModuleSummary("company_000002", "sandbox");
    const runSummary = await readRunPipelineSummary("company_000002", result.run_id);
    const artifactsIndex = await readRunArtifactsIndex("company_000002", result.run_id);
    const reportContext = await readRunReportContext("company_000002", result.run_id);
    const runs = await listValidationRuns("company_000002");
    const pipelineSummaryPath = path.join(
      process.cwd(),
      "data",
      "validation",
      "company_000002",
      "_meta",
      "latest_pipeline_summary.json"
    );

    expect(["PASS", "WARN", "FAIL", "APPROVED"]).toContain(result.overall_status);
    expect(result.steps.some((step) => step.step === "crm")).toBe(true);
    expect(result.steps.some((step) => step.step === "sandbox")).toBe(true);
    expect(result.steps.some((step) => step.step === "territory")).toBe(true);
    expect(result.steps.some((step) => step.step === "prescription")).toBe(true);
    expect(result.steps.some((step) => step.step === "radar")).toBe(true);
    expect(latest?.company_key).toBe("company_000002");
    expect(latest?.summary_by_module.crm.quality_status).toBeDefined();
    expect(latest?.summary_by_module.crm.evidence.length).toBeGreaterThan(0);
    expect(Array.isArray(latest?.recommended_actions)).toBe(true);
    expect(sandboxSummary?.module).toBe("sandbox");
    expect(sandboxSummary?.evidence.length).toBeGreaterThan(0);
    expect(runSummary?.run_id).toBe(result.run_id);
    expect(Array.isArray(artifactsIndex?.artifacts)).toBe(true);
    expect(
      (artifactsIndex?.artifacts as Array<{ artifact_type: string }>).some((item) => item.artifact_type === "result_asset")
    ).toBe(true);
    expect(reportContext?.full.validation_summary).toBeDefined();
    const linkedArtifacts = reportContext?.full.linked_artifacts as { result_assets?: unknown[] } | undefined;
    expect(Array.isArray(linkedArtifacts?.result_assets)).toBe(true);
    expect(Array.isArray(reportContext?.prompt.top_findings)).toBe(true);
    expect(runs.some((item) => item.run_id === result.run_id)).toBe(true);
    await expect(fs.access(pipelineSummaryPath)).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "runs", result.run_id, "run_meta.json"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        path.join(process.cwd(), "data", "validation", "company_000002", "runs", result.run_id, "execution_analysis.md")
      )
    ).resolves.toBeUndefined();
  });
});
