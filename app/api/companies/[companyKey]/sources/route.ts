import { NextResponse } from "next/server";

import { listCompanySources } from "@/lib/server/source-storage";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const result = await listCompanySources(companyKey);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sources.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
