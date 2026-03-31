import { NextResponse } from "next/server";

import { runBuilderPayload } from "@/lib/server/builder";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { execution_mode?: string | null };
    const result = await runBuilderPayload({
      companyKey,
      executionMode: body.execution_mode ?? null
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
