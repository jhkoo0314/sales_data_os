import { promises as fs } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readLatestBuilderRenderResult, runBuilderRender } from "@/lib/server/builder";

describe.sequential("builder render for daon_pharma", () => {
  it("renders preview outputs with injected data for daon_pharma", { timeout: 120000 }, async () => {
    const result = await runBuilderRender({ companyKey: "daon_pharma", executionMode: "integrated" });
    const latest = await readLatestBuilderRenderResult("daon_pharma");

    expect(result.company_key).toBe("daon_pharma");
    expect(result.reports).toHaveLength(5);
    expect(latest?.run_id).toBe(result.run_id);

    const builderRoot = path.join(process.cwd(), "data", "validation", "daon_pharma", "builder");
    const sandboxHtml = await fs.readFile(path.join(builderRoot, "sandbox_report_preview.html"), "utf8");
    const radarHtml = await fs.readFile(path.join(builderRoot, "radar_report_preview.html"), "utf8");
    const crmHtml = await fs.readFile(path.join(builderRoot, "crm_analysis_preview.html"), "utf8");
    const territoryHtml = await fs.readFile(path.join(builderRoot, "territory_map_preview.html"), "utf8");
    const crmPayload = JSON.parse(
      await fs.readFile(path.join(builderRoot, "crm_analysis_preview_payload_standard.json"), "utf8")
    ) as { template_payload?: Record<string, unknown> };
    const territoryPayload = JSON.parse(
      await fs.readFile(path.join(builderRoot, "territory_map_preview_payload_standard.json"), "utf8")
    ) as { template_payload?: Record<string, unknown> };
    const crmAssetDir = path.join(builderRoot, "crm_analysis_preview_assets");
    const territoryAssetDir = path.join(builderRoot, "territory_map_preview_assets");
    const crmAssetFiles = await fs.readdir(crmAssetDir);
    const territoryAssetFiles = await fs.readdir(territoryAssetDir);

    expect(sandboxHtml).toContain('"official_kpi_6"');
    expect(sandboxHtml).not.toContain("/*DATA_JSON_PLACEHOLDER*/");
    expect(radarHtml).toContain('window.__RADAR_DATA__ = {');
    expect(radarHtml).toContain('"signal_count"');
    expect(crmHtml).toContain('window.__CRM_DATA__ = {');
    expect(crmHtml).toContain('"overview"');
    expect(crmHtml).toContain('"scope_asset_manifest"');
    expect(crmHtml).toContain('"asset_base": "crm_analysis_preview_assets"');
    expect(crmHtml).not.toContain('"ALL|ALL": {');
    expect((crmPayload.template_payload?.data_mode as string | undefined)).toBe("chunked_crm_scope_assets_v1");
    expect((crmPayload.template_payload?.asset_base as string | undefined)).toBe("crm_analysis_preview_assets");
    expect(Object.keys((crmPayload.template_payload?.scope_asset_manifest as Record<string, unknown> | undefined) ?? {})).not.toHaveLength(0);
    expect(crmAssetFiles.some((name) => name.toLowerCase().endsWith(".js"))).toBe(true);
    expect((territoryPayload.template_payload?.data_mode as string | undefined)).toBe("chunked_rep_month_payloads_v1");
    expect((territoryPayload.template_payload?.asset_base as string | undefined)).toBe("territory_map_preview_assets");
    expect(territoryHtml).toContain('"asset_base": "territory_map_preview_assets"');
    expect(territoryHtml).toContain('"rep_asset"');
    expect(territoryAssetFiles.some((name) => name.toLowerCase().endsWith(".js"))).toBe(true);
  });
});
