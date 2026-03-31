import { NextResponse } from "next/server";

import { readLatestBuilderPayloadResult } from "@/lib/server/builder";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readLatestBuilderPayloadResult(companyKey);
    if (!result) {
      return NextResponse.json({ error: "No payload result found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payload result.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
