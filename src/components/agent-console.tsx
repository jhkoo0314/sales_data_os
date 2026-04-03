"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ExternalLink, LoaderCircle, MessageSquare, Send, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { AgentAnswer, AgentChatTurn, AgentConsoleContext } from "@/lib/shared/agent-context";

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildInitialAssistantMessage(context: AgentConsoleContext): AgentChatTurn {
  const nextAction = context.detail.nextActions[0] ?? "Run Detail과 Reports를 함께 확인해 주세요.";
  return {
    id: createId(),
    role: "assistant",
    text: context.runExplanation,
    answer: {
      summary: context.runExplanation,
      evidence: context.evidenceLinks.slice(0, 3).map((item) => ({
        title: item.label,
        detail: item.description,
        href: item.href,
      })),
      nextActions: [nextAction],
      caveats: ["이 화면은 현재 회사와 run 기준으로만 답합니다."],
      modelName: "context-only",
    },
  };
}

export function AgentConsole({ initialContext }: { initialContext: AgentConsoleContext }) {
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [selectedRunKey, setSelectedRunKey] = useState(initialContext.selectedRunKey ?? "");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<AgentChatTurn[]>([buildInitialAssistantMessage(initialContext)]);
  const [isPending, startTransition] = useTransition();

  const companyQuery = useMemo(
    () => `company=${encodeURIComponent(context.companyKey)}`,
    [context.companyKey],
  );

  function submitQuestion(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      return;
    }

    const userTurn: AgentChatTurn = {
      id: createId(),
      role: "user",
      text: trimmed,
    };

    setTurns((current) => [...current, userTurn]);
    setQuestion("");
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/companies/${encodeURIComponent(context.companyKey)}/agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            runKey: selectedRunKey || undefined,
            question: trimmed,
          }),
        });

        const payload = (await response.json()) as {
          answer?: AgentAnswer;
          context?: AgentConsoleContext;
          error?: string;
        };

        if (!response.ok || !payload.answer || !payload.context) {
          throw new Error(payload.error ?? "Agent 응답을 받지 못했습니다.");
        }

        const answer = payload.answer;
        setContext(payload.context);
        setTurns((current) => [
          ...current,
          {
            id: createId(),
            role: "assistant",
            text: answer.summary,
            answer,
          },
        ]);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "질문을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="eyebrow">Agent</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">운영 해석 도구</h1>
            <p className="mt-2 text-sm text-slate-500">
              일반 채팅이 아니라, 현재 회사와 run 기준 결과만 읽어서 설명합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Company</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-900">{context.companyKey}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Run</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-900">{context.selectedRunKey ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{context.runStatusLabel ?? "기록 없음"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold text-slate-900">Target Run</h2>
              {context.runStatusLabel ? (
                <StatusBadge tone={context.recentRuns.find((run) => run.runKey === context.selectedRunKey)?.tone ?? "ready"}>
                  {context.runStatusLabel}
                </StatusBadge>
              ) : null}
            </div>
            <label className="block text-xs font-semibold text-slate-600">
              질문 기준 run
              <select
                value={selectedRunKey}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedRunKey(value);
                  router.push(`/agent?company=${encodeURIComponent(context.companyKey)}&run=${encodeURIComponent(value)}`);
                }}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
              >
                {context.recentRuns.map((run) => (
                  <option key={run.runKey} value={run.runKey}>
                    {run.label} · {run.statusLabel}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{context.runExplanation}</p>
            <div className="mt-4 flex gap-3">
              {context.selectedRunKey ? (
                <Link
                  href={`/runs/${context.selectedRunKey}?${companyQuery}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                >
                  Run Detail
                </Link>
              ) : null}
              <Link
                href={`/reports?${companyQuery}${context.selectedRunKey ? `&run=${encodeURIComponent(context.selectedRunKey)}` : ""}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
              >
                Reports
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Sparkles className="h-[18px] w-[18px] text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Quick Questions</h2>
            </div>
            <div className="space-y-3">
              {context.quickPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => submitQuestion(prompt.question)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">{prompt.label}</span>
                  <span className="mt-1 block">{prompt.question}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
              <ExternalLink className="h-[18px] w-[18px] text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Evidence Links</h2>
            </div>
            <div className="space-y-3">
              {context.evidenceLinks.map((link) => (
                <a
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  target={link.href.startsWith("/api/") ? "_blank" : undefined}
                  rel={link.href.startsWith("/api/") ? "noreferrer" : undefined}
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <p className="text-sm font-bold text-slate-900">{link.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{link.description}</p>
                </a>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Run Interpreter</h2>
                <p className="text-xs text-slate-500">답변은 현재 선택한 run과 근거 링크만 기준으로 만듭니다.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 px-6 py-6">
            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} className="flex justify-end">
                  <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-slate-900 px-5 py-4 text-sm text-white shadow-sm">
                    {turn.text}
                  </div>
                </div>
              ) : (
                <div key={turn.id} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm leading-relaxed text-slate-700">{turn.answer?.summary ?? turn.text}</p>

                    {turn.answer?.evidence.length ? (
                      <div className="mt-5 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">근거</p>
                        {turn.answer.evidence.map((item) => (
                          <a
                            key={`${turn.id}-${item.title}`}
                            href={item.href ?? "#"}
                            target={item.href?.startsWith("/api/") ? "_blank" : undefined}
                            rel={item.href?.startsWith("/api/") ? "noreferrer" : undefined}
                            className="block rounded-xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <p className="text-sm font-bold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.detail}</p>
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {turn.answer?.nextActions.length ? (
                      <div className="mt-5 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">다음 행동</p>
                        {turn.answer.nextActions.map((item) => (
                          <div key={`${turn.id}-${item}`} className="rounded-xl border border-slate-100 bg-white p-3 text-sm text-slate-700">
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {turn.answer?.caveats.length ? (
                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">한계</p>
                        <div className="mt-2 space-y-1">
                          {turn.answer.caveats.map((item) => (
                            <p key={`${turn.id}-${item}`} className="text-xs leading-relaxed text-amber-900">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {turn.answer ? (
                      <p className="mt-4 text-[10px] text-slate-400">Model: {turn.answer.modelName}</p>
                    ) : null}
                  </div>
                </div>
              ),
            )}

            {isPending ? (
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
                  현재 run 기준 근거를 모아서 답을 만들고 있습니다.
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-white px-6 py-5">
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                {error}
              </div>
            ) : null}
            <div className="flex items-end gap-3">
              <textarea
                rows={3}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="예: 왜 WARN인지, 무엇을 먼저 봐야 하는지, 어떤 파일이 근거인지 물어보세요."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => submitQuestion(question)}
                disabled={isPending || !question.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
