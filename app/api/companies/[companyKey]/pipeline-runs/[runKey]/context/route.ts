import { NextResponse } from "next/server";

import { getRunDetailContext } from "@/lib/server/console/run-detail-context";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; runKey: string }> },
) {
  try {
    const { companyKey } = await context.params;
    const detail = await getRunDetailContext(companyKey);
    return NextResponse.json({ detail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load run detail context.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
