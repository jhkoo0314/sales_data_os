import { NextResponse } from "next/server";

import { saveIntakeConfirmation } from "@/lib/server/intake-analysis";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      confirmed?: boolean;
      execution_mode?: string | null;
    };

    if (typeof body.confirmed !== "boolean") {
      return NextResponse.json({ error: "confirmed is required." }, { status: 400 });
    }

    const confirmation = await saveIntakeConfirmation({
      companyKey,
      executionMode: body.execution_mode ?? null,
      confirmed: body.confirmed
    });

    return NextResponse.json(confirmation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save intake confirmation.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
