import { promises as fs } from "node:fs";
import path from "node:path";

import {
  readLatestBuilderModulePayload,
  readLatestBuilderPayloadResult,
  runBuilderPayload
} from "@/lib/server/builder/run";
import type {
  BuilderInputStandard,
  BuilderModuleKey,
  BuilderPayloadRunResult,
  BuilderPayloadStandard,
  BuilderPreviewResultAsset,
  BuilderRenderRunResult,
  BuilderTemplateKey
} from "@/lib/server/builder/types";
import {
  ensureDir,
  fileExists,
  readJsonFile,
  toPosixRelativePath,
  validationCompanyRoot,
  writeJsonFile
} from "@/lib/server/kpi/shared";
import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";
import { readRunArtifactsIndex, readRunReportContext } from "@/lib/server/validation";

const REPORT_OUTPUTS: Record<BuilderModuleKey, { fileName: string; title: string; templatePath: string; varName?: string }> = {
  crm: {
    fileName: "crm_analysis_preview",
    title: "Behavior CRM - System Intelligence Report",
    templatePath: path.join(process.cwd(), "workers", "templates", "reports", "crm_analysis_template.html"),
    varName: "__CRM_DATA__"
  },
  sandbox: {
    fileName: "sandbox_report_preview",
    title: "Sales Strategic Intel - Clinical Precision",
    templatePath: path.join(process.cwd(), "workers", "templates", "reports", "sandbox_report_template.html")
  },
  territory: {
    fileName: "territory_map_preview",
    title: "Territory Optimizer",
    templatePath: path.join(process.cwd(), "workers", "templates", "reports", "territory_optimizer_template.html"),
    varName: "__TERRITORY_DATA__"
  },
  prescription: {
    fileName: "prescription_flow_preview",
    title: "Prescription Flow Intelligence Report",
    templatePath: path.join(process.cwd(), "workers", "templates", "reports", "prescription_flow_template.html"),
    varName: "__PRESCRIPTION_DATA__"
  },
  radar: {
    fileName: "radar_report_preview",
    title: "RADAR Decision Brief",
    templatePath: path.join(process.cwd(), "workers", "templates", "reports", "radar_report_template.html"),
    varName: "__RADAR_DATA__"
  }
};

function builderRoot(companyKey: string): string {
  return path.join(validationCompanyRoot(companyKey), "builder");
}

function latestBuilderRenderPath(companyKey: string): string {
  return path.join(builderRoot(companyKey), "latest_builder_result.json");
}

function builderRenderHistoryPath(companyKey: string, generatedAt: string): string {
  const stamp = generatedAt.replace(/[-:TZ.]/g, "").slice(0, 14);
  return path.join(builderRoot(companyKey), `builder_result_${stamp}.json`);
}

function totalValidPreviewPath(companyKey: string): string {
  return path.join(builderRoot(companyKey), "total_valid_preview.html");
}

function reportHtmlPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${REPORT_OUTPUTS[moduleKey].fileName}.html`);
}

function reportInputStandardPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${REPORT_OUTPUTS[moduleKey].fileName}_input_standard.json`);
}

function reportPayloadStandardPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${REPORT_OUTPUTS[moduleKey].fileName}_payload_standard.json`);
}

function reportResultAssetPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${REPORT_OUTPUTS[moduleKey].fileName}_result_asset.json`);
}

function moduleBuilderValidationSummaryPath(companyKey: string, moduleKey: BuilderModuleKey): string {
  return path.join(builderRoot(companyKey), `${moduleKey}_builder_validation_summary.json`);
}

function builderValidationSummaryPath(companyKey: string): string {
  return path.join(builderRoot(companyKey), "builder_validation_summary.json");
}

function runBuilderIndexPath(companyKey: string, runId: string): string {
  return path.join(validationCompanyRoot(companyKey), "runs", runId, "builder_reports_index.json");
}

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
}

function sanitizeCrmScopeToken(value: string): string {
  const safe = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_");
  return safe || "scope";
}

function buildCrmScopeChunkName(scopeKey: string): string {
  return `${sanitizeCrmScopeToken(scopeKey)}.js`;
}

function buildTerritoryRepChunkName(repId: string): string {
  return `${sanitizeCrmScopeToken(repId)}__catalog.js`;
}

function buildTerritoryMonthChunkName(repId: string, monthKey: string): string {
  return `${sanitizeCrmScopeToken(repId)}__${sanitizeCrmScopeToken(monthKey)}.js`;
}

function injectWindowData(html: string, varName: string, payload: unknown): string {
  const injection = `window.${varName} = ${escapeScriptJson(payload)};`;
  const pattern = new RegExp(`window\\.${varName}\\s*=\\s*\\{\\};`);
  if (pattern.test(html)) {
    return html.replace(pattern, injection);
  }
  return html.replace("</body>", `<script>${injection}</script>\n</body>`);
}

function injectSandboxData(html: string, payload: unknown): string {
  return html.replace(
    /const db = \/\*DATA_JSON_PLACEHOLDER\*\/ \{[\s\S]*?\};/,
    `const db = ${escapeScriptJson(payload)};`
  );
}

function injectPrescriptionDetails(html: string, detailPayload: Record<string, unknown>): string {
  const injection = `window.__PRESCRIPTION_DETAIL_DATA__ = ${escapeScriptJson(detailPayload)};`;
  const pattern = /window\.__PRESCRIPTION_DETAIL_DATA__\s*=\s*window\.__PRESCRIPTION_DETAIL_DATA__\s*\|\|\s*\{\};/;
  return html.replace(pattern, injection);
}

function injectTerritoryDetails(
  html: string,
  detailPayload: { repData: Record<string, unknown>; monthData: Record<string, unknown> }
): string {
  let output = html.replace(
    /window\.__TERRITORY_REP_DATA__\s*=\s*window\.__TERRITORY_REP_DATA__\s*\|\|\s*\{\};/,
    `window.__TERRITORY_REP_DATA__ = ${escapeScriptJson(detailPayload.repData)};`
  );
  output = output.replace(
    /window\.__TERRITORY_MONTH_DATA__\s*=\s*window\.__TERRITORY_MONTH_DATA__\s*\|\|\s*\{\};/,
    `window.__TERRITORY_MONTH_DATA__ = ${escapeScriptJson(detailPayload.monthData)};`
  );
  output = output.replace(
    'href="territory_map_preview_assets/leaflet/leaflet.css"',
    'href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"'
  );
  output = output.replace(
    '<script src="territory_map_preview_assets/leaflet/leaflet.js"></script>',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
  );
  return output;
}

function replaceTerritoryLeafletAssets(html: string): string {
  let output = html.replace(
    'href="territory_map_preview_assets/leaflet/leaflet.css"',
    'href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"'
  );
  output = output.replace(
    '<script src="territory_map_preview_assets/leaflet/leaflet.js"></script>',
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
  );
  return output;
}

function injectRadarData(html: string, payload: unknown): string {
  const injection = `window.__RADAR_DATA__ = ${escapeScriptJson(payload)};\n    const radarData = (window.__RADAR_DATA__ && typeof window.__RADAR_DATA__ === "object")\n      ? window.__RADAR_DATA__\n      : defaultRadarData;`;
  return html.replace(
    /const radarData = \(window\.__RADAR_DATA__ && typeof window\.__RADAR_DATA__ === "object"\)\s*\? window\.__RADAR_DATA__\s*:\s*defaultRadarData;/,
    injection
  );
}

function buildPrescriptionDetailData(payload: BuilderPayloadStandard): Record<string, unknown> {
  const templatePayload = payload.template_payload as Record<string, unknown>;
  return {
    claims: {
      all: (templatePayload.claims as unknown[]) ?? []
    },
    gaps: {
      all: ((templatePayload.gaps as Record<string, unknown> | undefined)?.rows as unknown[]) ?? []
    },
    hospital_traces: {
      all: (templatePayload.hospital_traces as unknown[]) ?? []
    },
    rep_kpis: {
      all: (templatePayload.rep_kpis as unknown[]) ?? []
    }
  };
}

async function prepareCrmChunkAssets(
  companyKey: string,
  payload: BuilderPayloadStandard
): Promise<BuilderPayloadStandard> {
  const templatePayload = { ...(payload.template_payload as Record<string, unknown>) };
  const scopeData = ((templatePayload.scope_data as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const filters = ((templatePayload.filters as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const defaultScopeKeyCandidate = `${String(filters.default_period ?? "ALL")}|${String(filters.default_team ?? "ALL")}`;
  const defaultScopeKey = scopeData[defaultScopeKeyCandidate]
    ? defaultScopeKeyCandidate
    : (Object.keys(scopeData)[0] ?? defaultScopeKeyCandidate);

  const assetDirName = `${REPORT_OUTPUTS.crm.fileName}_assets`;
  const assetDir = path.join(builderRoot(companyKey), assetDirName);
  await ensureDir(assetDir);

  const existingNames = await fs.readdir(assetDir);
  await Promise.all(
    existingNames
      .filter((name) => name.toLowerCase().endsWith(".js"))
      .map((name) => fs.unlink(path.join(assetDir, name)))
  );

  const scopeAssetManifest: Record<string, string> = {};
  let repScopeCount = 0;
  for (const [scopeKey, scopePayload] of Object.entries(scopeData)) {
    const chunkName = buildCrmScopeChunkName(scopeKey);
    scopeAssetManifest[scopeKey] = chunkName;
    repScopeCount += Object.keys(((scopePayload as Record<string, unknown> | undefined)?.rep_scope_data as Record<string, unknown> | undefined) ?? {})
      .length;
    const chunkScript =
      "window.__CRM_SCOPE_DATA__ = window.__CRM_SCOPE_DATA__ || {};\n" +
      `window.__CRM_SCOPE_DATA__[${JSON.stringify(scopeKey)}] = ${escapeScriptJson(scopePayload)};\n`;
    await fs.writeFile(path.join(assetDir, chunkName), chunkScript, "utf8");
  }

  const manifestPayload: Record<string, unknown> = {
    ...templatePayload,
    data_mode: "chunked_crm_scope_assets_v1",
    asset_base: assetDirName,
    scope_data: {},
    scope_asset_manifest: scopeAssetManifest,
    default_scope_key: String(templatePayload.default_scope_key ?? defaultScopeKey),
    scope_asset_counts: {
      scope_count: Object.keys(scopeAssetManifest).length,
      rep_scope_count: repScopeCount
    }
  };

  return {
    ...payload,
    template_payload: manifestPayload,
    asset_manifest: [
      ...payload.asset_manifest.filter((item) => item.asset_type !== "crm_scope_assets"),
      {
        asset_type: "crm_scope_assets",
        path: toPosixRelativePath(assetDir),
        note: "CRM 상세 범위 데이터를 lazy load용 js 조각으로 분리"
      }
    ]
  };
}

async function prepareTerritoryChunkAssets(
  companyKey: string,
  payload: BuilderPayloadStandard
): Promise<BuilderPayloadStandard> {
  const topLevel = buildTerritoryTopLevelPayload(payload);
  const repPayloads = ((topLevel.rep_payloads as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const repIndex = ((topLevel.rep_index as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const hospitalCatalog = ((topLevel.hospital_catalog as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const sharedHospitalCatalog = Object.fromEntries(
    Object.entries(hospitalCatalog).filter(([, hospitalUnknown]) => {
      const hospital = ((hospitalUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
      return Number.isFinite(Number(hospital.lat)) && Number.isFinite(Number(hospital.lon));
    })
  );

  const assetDirName = `${REPORT_OUTPUTS.territory.fileName}_assets`;
  const assetDir = path.join(builderRoot(companyKey), assetDirName);
  await ensureDir(assetDir);

  const existingNames = await fs.readdir(assetDir);
  await Promise.all(
    existingNames
      .filter((name) => name.toLowerCase().endsWith(".js"))
      .map((name) => fs.unlink(path.join(assetDir, name)))
  );

  const manifestRepIndex: Record<string, unknown> = {};

  for (const [repId, repMetaUnknown] of Object.entries(repIndex)) {
    const repMeta = ((repMetaUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const repDetail = ((repPayloads[repId] as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const repAsset = buildTerritoryRepChunkName(repId);
    const monthAssets: Record<string, string> = {};
    const months = ((repDetail.months as unknown[]) ?? []) as Array<Record<string, unknown>>;
    const datesByMonth = ((repDetail.dates_by_month as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
    const repViews = ((repDetail.views as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;

    const repHospitalCatalog = Object.fromEntries(
      Object.values(repViews)
        .flatMap((selectionUnknown) => {
          const selection = ((selectionUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
          const routeGroups = ((selection.route_groups as unknown[]) ?? []) as Array<Record<string, unknown>>;
          return routeGroups.flatMap((group) => (((group.points as unknown[]) ?? []) as Array<Record<string, unknown>>));
        })
        .map((point) => {
          const hospitalId = String(point.hospital_id ?? "").trim();
          return [hospitalId, hospitalCatalog[hospitalId] ?? point];
        })
        .filter(([hospitalId]) => Boolean(hospitalId))
    );

    await fs.writeFile(
      path.join(assetDir, repAsset),
      "window.__TERRITORY_REP_DATA__ = window.__TERRITORY_REP_DATA__ || {};\n" +
        `window.__TERRITORY_REP_DATA__[${JSON.stringify(repId)}] = ${escapeScriptJson({
          rep_id: repId,
          hospital_catalog: repHospitalCatalog
        })};\n`,
      "utf8"
    );

    for (const monthRow of months) {
      const monthKey = String(monthRow.value ?? "").trim();
      if (!monthKey) {
        continue;
      }
      const monthChunk = buildTerritoryMonthChunkName(repId, monthKey);
      monthAssets[monthKey] = monthChunk;
      const monthViews = Object.fromEntries(
        Object.entries(repViews).filter(([viewKey]) => viewKey.startsWith(`${monthKey}|`))
      );
      await fs.writeFile(
        path.join(assetDir, monthChunk),
        "window.__TERRITORY_MONTH_DATA__ = window.__TERRITORY_MONTH_DATA__ || {};\n" +
          `window.__TERRITORY_MONTH_DATA__[${JSON.stringify(`${repId}|${monthKey}`)}] = ${escapeScriptJson({
            rep_id: repId,
            month_key: monthKey,
            views: monthViews
          })};\n`,
        "utf8"
      );
    }

    manifestRepIndex[repId] = {
      ...repMeta,
      rep_id: repId,
      rep_name: String(repMeta.rep_name ?? repId),
      portfolio_summary: ((repDetail.portfolio_summary as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>,
      months,
      dates_by_month: datesByMonth,
      rep_asset: repAsset,
      month_assets: monthAssets
    };
  }

  const defaultSelection = ((topLevel.default_selection as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const defaultRep = String(defaultSelection.rep_id ?? Object.keys(manifestRepIndex)[0] ?? "");
  const firstRepMeta = ((manifestRepIndex[defaultRep] as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const firstMonth =
    String(defaultSelection.month_key ?? "") ||
    String((((firstRepMeta.months as unknown[]) ?? [])[0] as Record<string, unknown> | undefined)?.value ?? "");
  const firstDateRows =
    ((((firstRepMeta.dates_by_month as Record<string, unknown> | undefined) ?? {})[firstMonth] as unknown[]) ?? []) as Array<
      Record<string, unknown>
    >;
  const firstDate =
    String(defaultSelection.date_key ?? "") ||
    String(
      firstDateRows.find((row) => String(row.value ?? "") === "__ALL__")?.value ??
        firstDateRows[0]?.value ??
        ""
    );

  const manifestPayload: Record<string, unknown> = {
    ...topLevel,
    data_mode: "chunked_rep_month_payloads_v1",
    asset_base: assetDirName,
    hospital_catalog: sharedHospitalCatalog,
    rep_payloads: {},
    rep_index: manifestRepIndex,
    default_selection: {
      ...defaultSelection,
      rep_id: defaultRep,
      month_key: firstMonth,
      date_key: firstDate
    }
  };

  return {
    ...payload,
    template_payload: manifestPayload,
    asset_manifest: [
      ...payload.asset_manifest.filter((item) => item.asset_type !== "territory_scope_assets"),
      {
        asset_type: "territory_scope_assets",
        path: toPosixRelativePath(assetDir),
        note: "Territory 담당자/월 상세 데이터를 lazy load용 js 조각으로 분리"
      }
    ]
  };
}

function buildTerritoryDetailData(payload: BuilderPayloadStandard): {
  repData: Record<string, unknown>;
  monthData: Record<string, unknown>;
} {
  const templatePayload = payload.template_payload as Record<string, unknown>;
  const repIndex = ((templatePayload.rep_index as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const hospitalCatalog = ((templatePayload.hospital_catalog as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
  const repData = Object.fromEntries(
    Object.entries(repIndex).map(([repId, repMetaUnknown]) => {
      const repMeta = ((repMetaUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
      const repRows = Object.entries(hospitalCatalog)
        .filter(([, hospitalUnknown]) => {
          const hospital = ((hospitalUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
          return String(hospital.rep_id ?? "") === repId;
        })
        .map(([hospitalId, hospitalUnknown], index) => {
          const hospital = ((hospitalUnknown as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>;
          return {
            hospital_id: hospitalId,
            hospital: hospital.hospital ?? hospitalId,
            rep_id: hospital.rep_id ?? repId,
            rep_name: hospital.rep_name ?? repMeta.rep_name ?? repId,
            date_key: "ALL",
            seq: index + 1,
            sales: Number(hospital.sales ?? 0),
            target: Number(hospital.target ?? 0),
            region: hospital.region ?? "미지정",
            lat: hospital.lat ?? null,
            lon: hospital.lon ?? null,
            attainment_rate: Number(hospital.attainment_rate ?? 0)
          };
        })
        .sort((left, right) => Number(right.sales ?? 0) - Number(left.sales ?? 0));

      const salesTotal = repRows.reduce((sum, row) => sum + Number(row.sales ?? 0), 0);
      const targetTotal = repRows.reduce((sum, row) => sum + Number(row.target ?? 0), 0);
      const attainmentRate = targetTotal > 0 ? salesTotal / targetTotal : 0;

      return [
        repId,
        {
          rep_id: repId,
          rep_name: String(repMeta.rep_name ?? repId),
          portfolio_summary: {
            hospital_count: Number(repMeta.hospital_count ?? repRows.length),
            coverage_score: Number(repMeta.coverage_score ?? 0),
            sales: Number(repMeta.sales ?? salesTotal),
            target: Number(repMeta.target ?? targetTotal),
            gap_count: Number(repRows.length)
          },
          months: [
            {
              value: "ALL",
              label: "전체",
              day_count: Number(repRows.length)
            }
          ],
          dates_by_month: {
            ALL: [
              {
                value: "__ALL__",
                label: "전체",
                day_count: Number(repRows.length),
                stop_count: Number(repRows.length)
              }
            ]
          },
          points: repRows,
          summary: {
            visit_count: Number(repRows.length),
            selected_hospital_count: Number(repRows.length),
            sales_total: salesTotal,
            target_total: targetTotal,
            attainment_rate: attainmentRate,
            distance_km: 0,
            radius_km: 0,
            km_per_visit: 0
          },
          insight_text:
            repRows.length > 0
              ? `${String(repMeta.rep_name ?? repId)} 담당자 기준 병원 ${repRows.length}곳의 커버리지 데이터를 표시합니다.`
              : `${String(repMeta.rep_name ?? repId)} 담당자 기준 연결된 병원 데이터가 부족합니다.`
        }
      ];
    })
  );

  return {
    repData,
    monthData: {},
  };
}

function buildTerritoryTopLevelPayload(payload: BuilderPayloadStandard): Record<string, unknown> {
  const templatePayload = payload.template_payload as Record<string, unknown>;
  return {
    ...templatePayload,
    asset_base: ""
  };
}

function renderHtmlForModule(moduleKey: BuilderModuleKey, payload: BuilderPayloadStandard, templateHtml: string): string {
  switch (moduleKey) {
    case "crm":
      return injectWindowData(templateHtml, "__CRM_DATA__", payload.template_payload);
    case "sandbox":
      return injectSandboxData(templateHtml, payload.template_payload);
    case "territory": {
      const injected = injectWindowData(templateHtml, "__TERRITORY_DATA__", payload.template_payload);
      return replaceTerritoryLeafletAssets(injected);
    }
    case "prescription": {
      const injected = injectWindowData(templateHtml, "__PRESCRIPTION_DATA__", payload.template_payload);
      return injectPrescriptionDetails(injected, buildPrescriptionDetailData(payload));
    }
    case "radar":
      return injectRadarData(templateHtml, payload.template_payload);
  }
}

function createPreviewInputStandard(payload: BuilderPayloadStandard): BuilderInputStandard {
  return {
    schema_version: "builder_input_standard_v1",
    input_type: "builder_input_standard",
    module: payload.module,
    template_key: payload.template_key,
    template_path: REPORT_OUTPUTS[payload.module].templatePath,
    output_name: REPORT_OUTPUTS[payload.module].fileName,
    report_title: payload.report_title,
    company_key: payload.company_key,
    run_id: payload.run_id,
    payload_path: toPosixRelativePath(reportPayloadStandardPath(payload.company_key, payload.module)),
    source_result_asset_path: payload.source_paths.result_asset_path,
    validation_summary_path: payload.source_paths.validation_summary_path,
    render_mode: "preview"
  };
}

function createPreviewResultAsset(payload: BuilderPayloadStandard): BuilderPreviewResultAsset {
  return {
    schema_version: "builder_preview_result_asset_v1",
    asset_type: "builder_preview_result_asset",
    module: payload.module,
    template_key: payload.template_key,
    report_title: payload.report_title,
    company_key: payload.company_key,
    run_id: payload.run_id,
    generated_at: payload.generated_at,
    quality_status: payload.quality_status,
    html_path: toPosixRelativePath(reportHtmlPath(payload.company_key, payload.module)),
    payload_standard_path: toPosixRelativePath(reportPayloadStandardPath(payload.company_key, payload.module)),
    input_standard_path: toPosixRelativePath(reportInputStandardPath(payload.company_key, payload.module))
  };
}

function createModuleBuilderValidationSummary(payload: BuilderPayloadStandard): Record<string, unknown> {
  return {
    module: payload.module,
    quality_status: payload.quality_status,
    report_title: payload.report_title,
    html_ready: true,
    input_standard_ready: true,
    payload_standard_ready: true,
    generated_at: payload.generated_at,
    reasoning_note: `${payload.module.toUpperCase()} Builder preview를 생성했습니다.`
  };
}

function buildTotalValidHtml(reports: BuilderRenderRunResult["reports"]): string {
  const links = reports
    .map(
      (report) =>
        `<li><a href="${path.basename(report.html_path)}">${report.report_title}</a> <span>(${report.quality_status})</span></li>`
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Total Valid Preview</title>
  <style>
    body { font-family: "Segoe UI", system-ui, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }
    .card { max-width: 960px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    h1 { margin-top: 0; font-size: 24px; }
    ul { line-height: 1.9; }
    a { color: #2563eb; text-decoration: none; font-weight: 700; }
    span { color: #64748b; margin-left: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Total Valid Preview</h1>
    <p>생성된 모듈별 preview HTML 목록입니다.</p>
    <ul>${links}</ul>
  </div>
</body>
</html>
`;
}

async function updateRunArtifactsIndex(
  companyKey: string,
  runId: string,
  reports: BuilderRenderRunResult["reports"]
): Promise<void> {
  const existing = (await readRunArtifactsIndex(companyKey, runId)) ?? {
    company_key: companyKey,
    run_id: runId,
    artifacts: []
  };
  const artifacts = Array.isArray((existing as { artifacts?: unknown[] }).artifacts)
    ? [...(existing as { artifacts: unknown[] }).artifacts]
    : [];
  const filtered = artifacts.filter((item) => {
    if (!item || typeof item !== "object") {
      return true;
    }
    const type = String((item as { artifact_type?: unknown }).artifact_type ?? "");
    return type !== "builder_html" && type !== "builder_preview_result_asset" && type !== "builder_reports_index";
  });

  filtered.push(
    ...reports.flatMap((report) => [
      {
        artifact_type: "builder_html",
        module: report.module,
        path: report.html_path,
        status: report.quality_status
      },
      {
        artifact_type: "builder_preview_result_asset",
        module: report.module,
        path: report.result_asset_path,
        status: report.quality_status
      }
    ]),
    {
      artifact_type: "builder_reports_index",
      module: "builder",
      path: toPosixRelativePath(runBuilderIndexPath(companyKey, runId)),
      status: "READY"
    }
  );

  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "artifacts.index.json"), {
    ...(existing as Record<string, unknown>),
    artifacts: filtered
  });
}

async function updateRunReportContext(
  companyKey: string,
  runId: string,
  reports: BuilderRenderRunResult["reports"]
): Promise<void> {
  const existing = await readRunReportContext(companyKey, runId);
  if (!existing) {
    return;
  }

  const full = { ...existing.full } as Record<string, unknown>;
  const linkedArtifacts = { ...((full.linked_artifacts as Record<string, unknown> | undefined) ?? {}) };
  linkedArtifacts.builder_reports = reports.map((report) => ({
    module: report.module,
    html_path: report.html_path,
    result_asset_path: report.result_asset_path
  }));
  linkedArtifacts.total_valid_preview = toPosixRelativePath(totalValidPreviewPath(companyKey));
  full.linked_artifacts = linkedArtifacts;
  full.report_ready_modules = reports.map((report) => report.module);

  const prompt = { ...existing.prompt } as Record<string, unknown>;
  prompt.report_ready_modules = reports.map((report) => report.module);

  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "report_context.full.json"), full);
  await writeJsonFile(path.join(validationCompanyRoot(companyKey), "runs", runId, "report_context.prompt.json"), prompt);
}

export async function runBuilderRender(input: {
  companyKey: string;
  executionMode?: string | null;
}): Promise<BuilderRenderRunResult> {
  const companyKey = input.companyKey;
  assertValidCompanyKey(companyKey);

  const shouldRefreshPayload = Boolean(input.executionMode);
  let payloadRun = shouldRefreshPayload ? null : await readLatestBuilderPayloadResult(companyKey);
  if (!payloadRun) {
    payloadRun = await runBuilderPayload({ companyKey, executionMode: input.executionMode ?? null });
  }

  const reports: BuilderRenderRunResult["reports"] = [];
  const generatedAt = new Date().toISOString();

  for (const moduleKey of ["crm", "sandbox", "territory", "prescription", "radar"] as BuilderModuleKey[]) {
    const sourcePayload = await readLatestBuilderModulePayload(companyKey, moduleKey);
    if (!sourcePayload) {
      continue;
    }

    const payload =
      moduleKey === "crm"
        ? await prepareCrmChunkAssets(companyKey, sourcePayload)
        : moduleKey === "territory"
          ? await prepareTerritoryChunkAssets(companyKey, sourcePayload)
          : sourcePayload;

    const templateInfo = REPORT_OUTPUTS[moduleKey];
    const templateHtml = await fs.readFile(templateInfo.templatePath, "utf8");
    const renderedHtml = renderHtmlForModule(moduleKey, payload, templateHtml);
    const previewInput = createPreviewInputStandard(payload);
    const previewResultAsset = createPreviewResultAsset(payload);
    const moduleValidationSummary = createModuleBuilderValidationSummary(payload);

    const htmlPath = reportHtmlPath(companyKey, moduleKey);
    const inputPath = reportInputStandardPath(companyKey, moduleKey);
    const payloadPath = reportPayloadStandardPath(companyKey, moduleKey);
    const resultAssetPath = reportResultAssetPath(companyKey, moduleKey);

    await ensureDir(builderRoot(companyKey));
    await fs.writeFile(htmlPath, renderedHtml, "utf8");
    await writeJsonFile(inputPath, previewInput);
    await writeJsonFile(payloadPath, payload);
    await writeJsonFile(resultAssetPath, previewResultAsset);
    await writeJsonFile(moduleBuilderValidationSummaryPath(companyKey, moduleKey), moduleValidationSummary);

    reports.push({
      module: moduleKey,
      report_type: payload.template_key,
      report_title: payload.report_title,
      html_path: toPosixRelativePath(htmlPath),
      payload_standard_path: toPosixRelativePath(payloadPath),
      input_standard_path: toPosixRelativePath(inputPath),
      result_asset_path: toPosixRelativePath(resultAssetPath),
      quality_status: payload.quality_status
    });
  }

  const result: BuilderRenderRunResult = {
    company_key: companyKey,
    run_id: payloadRun.run_id,
    generated_at: generatedAt,
    overall_status: payloadRun.overall_status,
    builder_root: toPosixRelativePath(builderRoot(companyKey)),
    reports,
    summary_message: "Builder preview HTML과 표준 JSON 결과물을 생성했습니다."
  };

  await writeJsonFile(latestBuilderRenderPath(companyKey), result);
  await writeJsonFile(builderRenderHistoryPath(companyKey, generatedAt), result);
  await writeJsonFile(builderValidationSummaryPath(companyKey), {
    generated_at: generatedAt,
    overall_status: payloadRun.overall_status,
    report_count: reports.length,
    reports
  });
  await writeJsonFile(runBuilderIndexPath(companyKey, payloadRun.run_id), {
    company_key: companyKey,
    run_id: payloadRun.run_id,
    generated_at: generatedAt,
    reports
  });
  await fs.writeFile(totalValidPreviewPath(companyKey), buildTotalValidHtml(reports), "utf8");
  await updateRunArtifactsIndex(companyKey, payloadRun.run_id, reports);
  await updateRunReportContext(companyKey, payloadRun.run_id, reports);
  return result;
}

export async function readLatestBuilderRenderResult(companyKey: string): Promise<BuilderRenderRunResult | null> {
  assertValidCompanyKey(companyKey);
  const filePath = latestBuilderRenderPath(companyKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<BuilderRenderRunResult>(filePath);
}

export async function listBuilderReports(companyKey: string): Promise<BuilderRenderRunResult["reports"]> {
  const latest = await readLatestBuilderRenderResult(companyKey);
  return latest?.reports ?? [];
}

export async function readBuilderReport(
  companyKey: string,
  reportType: BuilderTemplateKey
): Promise<BuilderRenderRunResult["reports"][number] | null> {
  const reports = await listBuilderReports(companyKey);
  return reports.find((item) => item.report_type === reportType) ?? null;
}

export async function readBuilderArtifacts(companyKey: string): Promise<Record<string, unknown>> {
  const latest = await readLatestBuilderRenderResult(companyKey);
  return {
    company_key: companyKey,
    builder_root: toPosixRelativePath(builderRoot(companyKey)),
    latest_builder_result_path: latest ? toPosixRelativePath(latestBuilderRenderPath(companyKey)) : null,
    total_valid_preview_path: (await fileExists(totalValidPreviewPath(companyKey)))
      ? toPosixRelativePath(totalValidPreviewPath(companyKey))
      : null,
    reports: latest?.reports ?? []
  };
}
