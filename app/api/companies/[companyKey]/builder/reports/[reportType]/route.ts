import { NextResponse } from "next/server";

import { readBuilderReport, type BuilderTemplateKey } from "@/lib/server/builder";

const REPORT_TYPES = new Set<BuilderTemplateKey>([
  "crm_analysis",
  "sandbox_report",
  "territory_optimizer",
  "prescription_flow",
  "radar_report"
]);

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; reportType: string }> }
) {
  try {
    const { companyKey, reportType } = await context.params;
    if (!REPORT_TYPES.has(reportType as BuilderTemplateKey)) {
      return NextResponse.json({ error: "Unsupported report type." }, { status: 400 });
    }

    const result = await readBuilderReport(companyKey, reportType as BuilderTemplateKey);
    if (!result) {
      return NextResponse.json({ error: "No builder report found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load builder report.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
