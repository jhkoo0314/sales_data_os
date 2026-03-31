import { NextResponse } from "next/server";

import { readLatestBuilderModulePayload, type BuilderModuleKey } from "@/lib/server/builder";

const MODULE_KEYS = new Set<BuilderModuleKey>(["crm", "sandbox", "prescription", "territory", "radar"]);

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; moduleKey: string }> }
) {
  try {
    const { companyKey, moduleKey } = await context.params;
    if (!MODULE_KEYS.has(moduleKey as BuilderModuleKey)) {
      return NextResponse.json({ error: "Unsupported payload module." }, { status: 400 });
    }

    const result = await readLatestBuilderModulePayload(companyKey, moduleKey as BuilderModuleKey);
    if (!result) {
      return NextResponse.json({ error: "No module payload found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load module payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
