import { NextResponse } from "next/server";

import { analyzeIntake } from "@/lib/server/intake-analysis";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { execution_mode?: string | null };
    const result = await analyzeIntake({
      companyKey,
      executionMode: body.execution_mode ?? null
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze intake.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
