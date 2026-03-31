import { NextResponse } from "next/server";

import { saveMonthlySourceUpload } from "@/lib/server/source-storage";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> }
) {
  try {
    const { companyKey } = await context.params;
    const formData = await request.formData();
    const sourceKey = formData.get("source_key");
    const monthToken = formData.get("month_token");
    const file = formData.get("file");
    const uploadSessionId = formData.get("upload_session_id");
    const runId = formData.get("run_id");

    if (typeof sourceKey !== "string") {
      return NextResponse.json({ error: "source_key is required." }, { status: 400 });
    }

    if (typeof monthToken !== "string") {
      return NextResponse.json({ error: "month_token is required." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required." }, { status: 400 });
    }

    const saved = await saveMonthlySourceUpload({
      companyKey,
      sourceKey,
      monthToken,
      filename: file.name,
      content: await file.arrayBuffer(),
      uploadSessionId: typeof uploadSessionId === "string" ? uploadSessionId : null,
      runId: typeof runId === "string" ? runId : null
    });

    return NextResponse.json({
      company_key: companyKey,
      ...saved
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save monthly upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
