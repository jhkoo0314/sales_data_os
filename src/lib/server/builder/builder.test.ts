import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  listBuilderReports,
  readBuilderArtifacts,
  readBuilderReport,
  readLatestBuilderModulePayload,
  readLatestBuilderPayloadResult,
  readLatestBuilderRenderResult,
  runBuilderPayload,
  runBuilderRender
} from "@/lib/server/builder";
import { readRunArtifactsIndex, readRunReportContext } from "@/lib/server/validation";

describe.sequential("builder payload flow", () => {
  it("creates builder payloads and input standards for company_000002", async () => {
    const result = await runBuilderPayload({ companyKey: "company_000002", executionMode: "integrated" });
    const latest = await readLatestBuilderPayloadResult("company_000002");
    const crmPayload = await readLatestBuilderModulePayload("company_000002", "crm");
    const artifactsIndex = await readRunArtifactsIndex("company_000002", result.run_id);
    const reportContext = await readRunReportContext("company_000002", result.run_id);

    expect(result.company_key).toBe("company_000002");
    expect(result.module_payloads).toHaveLength(5);
    expect(latest?.run_id).toBe(result.run_id);
    expect(crmPayload?.payload_type).toBe("builder_payload_standard");
    expect(crmPayload?.template_key).toBe("crm_analysis");
    expect((crmPayload?.template_payload.overview as Record<string, unknown> | undefined)?.quality_status).toBeDefined();

    const artifacts = (artifactsIndex?.artifacts as Array<{ artifact_type: string }> | undefined) ?? [];
    expect(artifacts.some((item) => item.artifact_type === "builder_payload")).toBe(true);
    expect(artifacts.some((item) => item.artifact_type === "builder_input_standard")).toBe(true);
    expect(artifacts.some((item) => item.artifact_type === "payload_index")).toBe(true);

    const linkedArtifacts = reportContext?.full.linked_artifacts as
      | { builder_payloads?: unknown[]; builder_inputs?: unknown[] }
      | undefined;
    expect(Array.isArray(linkedArtifacts?.builder_payloads)).toBe(true);
    expect(Array.isArray(linkedArtifacts?.builder_inputs)).toBe(true);
    expect(Array.isArray((reportContext?.prompt.payload_ready_modules as unknown[]) ?? [])).toBe(true);

    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "builder", "crm_builder_input_standard.json"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "crm", "crm_builder_payload.json"))
    ).resolves.toBeUndefined();
  });

  it("renders preview html and builder standard files for company_000002", async () => {
    const result = await runBuilderRender({ companyKey: "company_000002", executionMode: "integrated" });
    const latest = await readLatestBuilderRenderResult("company_000002");
    const reports = await listBuilderReports("company_000002");
    const crmReport = await readBuilderReport("company_000002", "crm_analysis");
    const artifacts = await readBuilderArtifacts("company_000002");
    const runArtifactsIndex = await readRunArtifactsIndex("company_000002", result.run_id);
    const reportContext = await readRunReportContext("company_000002", result.run_id);

    expect(result.reports).toHaveLength(5);
    expect(latest?.run_id).toBe(result.run_id);
    expect(reports).toHaveLength(5);
    expect(crmReport?.report_type).toBe("crm_analysis");
    expect((artifacts.reports as unknown[] | undefined)?.length).toBe(5);

    const linkedArtifacts = reportContext?.full.linked_artifacts as { builder_reports?: unknown[] } | undefined;
    expect(Array.isArray(linkedArtifacts?.builder_reports)).toBe(true);
    expect(Array.isArray((reportContext?.prompt.report_ready_modules as unknown[]) ?? [])).toBe(true);

    const artifactRows = (runArtifactsIndex?.artifacts as Array<{ artifact_type: string }> | undefined) ?? [];
    expect(artifactRows.some((item) => item.artifact_type === "builder_html")).toBe(true);
    expect(artifactRows.some((item) => item.artifact_type === "builder_preview_result_asset")).toBe(true);

    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "builder", "crm_analysis_preview.html"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "builder", "crm_analysis_preview_assets"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "builder", "territory_map_preview_assets"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        path.join(process.cwd(), "data", "validation", "company_000002", "builder", "crm_analysis_preview_payload_standard.json")
      )
    ).resolves.toBeUndefined();
    await expect(
      fs.access(
        path.join(process.cwd(), "data", "validation", "company_000002", "builder", "crm_analysis_preview_result_asset.json")
      )
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(process.cwd(), "data", "validation", "company_000002", "builder", "total_valid_preview.html"))
    ).resolves.toBeUndefined();
  });
});
