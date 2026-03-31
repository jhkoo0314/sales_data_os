import { NextResponse } from "next/server";

import { readLatestValidationModuleSummary, type ValidationModuleKey } from "@/lib/server/validation";

const MODULE_KEYS = new Set<ValidationModuleKey>(["crm", "sandbox", "prescription", "territory", "radar"]);

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; moduleKey: string }> }
) {
  try {
    const { companyKey, moduleKey } = await context.params;
    if (!MODULE_KEYS.has(moduleKey as ValidationModuleKey)) {
      return NextResponse.json({ error: "Unsupported validation module." }, { status: 400 });
    }

    const result = await readLatestValidationModuleSummary(companyKey, moduleKey as ValidationModuleKey);
    if (!result) {
      return NextResponse.json({ error: "No validation module summary found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load validation module summary.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
