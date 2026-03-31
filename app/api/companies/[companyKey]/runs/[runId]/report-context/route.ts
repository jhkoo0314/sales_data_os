import { NextResponse } from "next/server";

import { readRunReportContext } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; runId: string }> }
) {
  try {
    const { companyKey, runId } = await context.params;
    const result = await readRunReportContext(companyKey, runId);
    if (!result) {
      return NextResponse.json({ error: "No run report context found." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load run report context.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
