import { NextResponse } from "next/server";

import { readLatestValidationSummary } from "@/lib/server/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readLatestValidationSummary(companyKey);

    if (!result) {
      return NextResponse.json({ error: "No validation summary found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load validation summary.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
