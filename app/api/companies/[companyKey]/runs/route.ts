import { NextResponse } from "next/server";

import { listValidationRuns } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const runs = await listValidationRuns(companyKey);
    return NextResponse.json({ company_key: companyKey, runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load runs.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
