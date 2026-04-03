import { NextResponse } from "next/server";

import { getPipelineRunSnapshot } from "@/lib/server/pipeline/run-monitor";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ companyKey: string; runKey: string }> }
) {
  try {
    const { companyKey, runKey } = await context.params;
    const run = await getPipelineRunSnapshot(companyKey, runKey);
    if (!run) {
      return NextResponse.json({ ok: false, error: "run을 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "run 상세 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
