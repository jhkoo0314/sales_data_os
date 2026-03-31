import { NextResponse } from "next/server";

import { runValidation } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { execution_mode?: string | null };
    const result = await runValidation({
      companyKey,
      executionMode: body.execution_mode ?? null
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run validation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
