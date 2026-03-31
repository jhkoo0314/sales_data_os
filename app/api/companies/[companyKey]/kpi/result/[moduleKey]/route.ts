import { NextResponse } from "next/server";

import { isKpiModuleKey, readLatestKpiModuleResult } from "@/lib/server/kpi";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; moduleKey: string }> }
) {
  try {
    const { companyKey, moduleKey } = await context.params;
    if (!isKpiModuleKey(moduleKey)) {
      return NextResponse.json({ error: "Unsupported KPI module." }, { status: 400 });
    }

    const result = await readLatestKpiModuleResult(companyKey, moduleKey);
    if (!result) {
      return NextResponse.json({ error: "No module result found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load KPI module result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
