import { NextResponse } from "next/server";

import { readLatestKpiResult } from "@/lib/server/kpi";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readLatestKpiResult(companyKey);

    if (!result) {
      return NextResponse.json({ error: "No KPI result found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load KPI result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
