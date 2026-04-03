import { NextResponse } from "next/server";

import { getCompanyOverview } from "@/lib/server/console/company-overview";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string }> },
) {
  try {
    const { companyKey } = await context.params;
    const overview = await getCompanyOverview(companyKey);
    return NextResponse.json({ overview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load company overview.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
