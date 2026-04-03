import { NextResponse } from "next/server";

import { listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";
import { enqueuePipelineRun } from "@/lib/server/pipeline/run-queue";

export const runtime = "nodejs";

type RequestBody = {
  execution_mode?: string;
  run_key?: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "20");
    const runs = await listPipelineRunSnapshots(companyKey, Number.isFinite(limit) ? limit : 20);
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "run 목록 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as RequestBody;
    const queued = await enqueuePipelineRun({
      companyKey,
      executionMode: payload.execution_mode,
      runKey: payload.run_key
    });
    return NextResponse.json({
      ok: true,
      run: queued,
      message: "run이 pending 상태로 접수되었습니다."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "run 접수 중 오류가 발생했습니다.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
