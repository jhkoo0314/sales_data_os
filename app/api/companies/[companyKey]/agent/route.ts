import { NextResponse } from "next/server";
import { z } from "zod";

import { getAgentConsoleContext } from "@/lib/server/console/agent-context";
import { logError, logInfo } from "@/lib/server/shared/ops-log";
import type { AgentAnswer } from "@/lib/shared/agent-context";

export const runtime = "nodejs";

const bodySchema = z.object({
  runKey: z.string().trim().optional(),
  question: z.string().trim().min(1, "질문을 입력해 주세요."),
});

function resolveGeminiConfig() {
  const apiKey = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "").trim();
  const modelName = (process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview").trim();
  if (!apiKey) {
    return null;
  }
  return { apiKey, modelName };
}

function buildPrompt(input: {
  companyKey: string;
  question: string;
  context: Awaited<ReturnType<typeof getAgentConsoleContext>>;
}) {
  const { context, question } = input;
  const validationSummary = context.detail.modules
    .map((module) => ({
      module: module.moduleLabel,
      status: module.status,
      summary: module.summaryText,
      evidence: module.evidence,
    }));

  const radarSummary = context.radar
    ? {
        status: context.radar.status,
        topIssue: context.radar.topIssue,
        summaryText: context.radar.summaryText,
        signals: context.radar.signals.slice(0, 2).map((signal) => ({
          title: signal.title,
          message: signal.message,
          priorityLabel: signal.priorityLabel,
          priorityScore: signal.priorityScore,
          decisionOptions: signal.decisionOptions,
          evidence: signal.evidence,
        })),
      }
    : null;

  const evidenceLinks = context.evidenceLinks.map((item) => ({
    label: item.label,
    description: item.description,
    href: item.href,
  }));

  return `
너는 Sales Data OS의 운영 해석 도구다.
중요 규칙:
- 현재 company_key, run_id 문맥 밖으로 벗어나지 마라.
- 주어진 데이터에 없는 내용은 단정하지 마라.
- 일반론보다 현재 run 기준 설명을 우선해라.
- 답변은 한국어로, 비개발자도 이해하게 쉽게 써라.
- 답변은 반드시 "핵심 요약", "근거", "다음 행동", "한계" 구조를 가져라.
- 근거 섹션에는 반드시 href가 있는 항목만 넣어라.
- JSON만 출력해라. 마크다운 금지.

출력 JSON 형식:
{
  "summary": "string",
  "evidence": [{"title":"string","detail":"string","href":"string"}],
  "nextActions": ["string"],
  "caveats": ["string"]
}

현재 문맥:
${JSON.stringify(
    {
      companyKey: context.companyKey,
      companyName: context.companyName,
      runKey: context.selectedRunKey,
      executionMode: context.executionMode,
      runStatusLabel: context.runStatusLabel,
      runExplanation: context.runExplanation,
      validationSummary,
      radarSummary,
      evidenceLinks,
    },
    null,
    2,
  )}

사용자 질문:
${question}
`;
}

function normalizeAnswer(payload: unknown, modelName: string): AgentAnswer {
  if (!payload || typeof payload !== "object") {
    return {
      summary: "응답을 구조화해서 해석하지 못했습니다.",
      evidence: [],
      nextActions: ["질문을 조금 더 구체적으로 다시 입력해 주세요."],
      caveats: ["모델 응답 형식이 예상과 달랐습니다."],
      modelName,
    };
  }

  const record = payload as Record<string, unknown>;
  const evidence = Array.isArray(record.evidence)
    ? record.evidence
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }
          const entry = item as Record<string, unknown>;
          const title = typeof entry.title === "string" ? entry.title : null;
          const detail = typeof entry.detail === "string" ? entry.detail : null;
          const href = typeof entry.href === "string" ? entry.href : null;
          if (!title || !detail) {
            return null;
          }
          return { title, detail, href };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    : [];

  return {
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary
        : "현재 run 기준으로 바로 답을 만들기 어려웠습니다.",
    evidence,
    nextActions: Array.isArray(record.nextActions)
      ? record.nextActions.filter((item): item is string => typeof item === "string")
      : ["Run Detail과 Reports를 함께 확인해 주세요."],
    caveats: Array.isArray(record.caveats)
      ? record.caveats.filter((item): item is string => typeof item === "string")
      : [],
    modelName,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ companyKey: string }> },
) {
  try {
    const { companyKey } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const gemini = resolveGeminiConfig();
    if (!gemini) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY가 없어 Agent 응답을 만들 수 없습니다." },
        { status: 400 },
      );
    }

    const consoleContext = await getAgentConsoleContext({
      companyKey,
      runKey: parsed.runKey,
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(gemini.modelName)}:generateContent?key=${encodeURIComponent(gemini.apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt({ companyKey, question: parsed.question, context: consoleContext }) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json(
        { error: `Gemini 호출에 실패했습니다. ${message || response.statusText}` },
        { status: 400 },
      );
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const answer = normalizeAnswer(JSON.parse(text), gemini.modelName);
    logInfo({
      event: "agent.answer.success",
      route: "/api/companies/[companyKey]/agent",
      companyKey,
      runKey: consoleContext.selectedRunKey,
      meta: { model: gemini.modelName },
    });

    return NextResponse.json({ answer, context: consoleContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent 응답 생성에 실패했습니다.";
    logError({
      event: "agent.answer.failed",
      route: "/api/companies/[companyKey]/agent",
      detail: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
