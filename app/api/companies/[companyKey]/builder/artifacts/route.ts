import { NextResponse } from "next/server";

import { readBuilderArtifacts } from "@/lib/server/builder";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await readBuilderArtifacts(companyKey);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load builder artifacts.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
