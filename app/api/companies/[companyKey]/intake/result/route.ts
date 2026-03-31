import { NextResponse } from "next/server";

import { readLatestIntakeConfirmation, readLatestIntakeResult } from "@/lib/server/intake-analysis";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readLatestIntakeResult(companyKey);
    const confirmation = await readLatestIntakeConfirmation(companyKey);

    if (!result) {
      return NextResponse.json({ error: "No intake result found." }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      confirmation
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load intake result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
