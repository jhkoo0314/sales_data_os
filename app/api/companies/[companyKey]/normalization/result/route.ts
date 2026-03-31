import { NextResponse } from "next/server";

import { readLatestNormalizationResult } from "@/lib/server/normalization/run";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readLatestNormalizationResult(companyKey);

    if (!result) {
      return NextResponse.json({ error: "No normalization result found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load normalization result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
