"use client";

import { startTransition, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, FileJson, Lock, Play, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { IntakeSnapshot } from "@/lib/shared/intake-status";
import { formatAnalysisWindow, intakeLabelFromStatus, intakeToneFromStatus } from "@/lib/shared/intake-status";
import type { PipelineRunSnapshot } from "@/lib/server/pipeline/run-monitor";

const modeCards = [
  {
    key: "integrated_full",
    title: "통합 실행",
    description: "CRM, Prescription, Sandbox, Territory, RADAR, Builder를 worker가 순서대로 실행합니다.",
    enabled: true,
  },
  {
    key: "sandbox_only",
    title: "Sandbox 전용",
    description: "부분 실행 모드는 아직 worker registry에 연결되지 않았습니다.",
    enabled: false,
  },
  {
    key: "builder_only",
    title: "Builder 전용",
    description: "render-only 흐름은 이후 Phase에서 별도 진입점으로 분리할 예정입니다.",
    enabled: false,
  },
] as const;

function shouldPoll(runs: PipelineRunSnapshot[]) {
  return runs.some((run) => run.runStatus === "pending" || run.runStatus === "running");
}

function toneFromRun(run: PipelineRunSnapshot | null) {
  return run?.tone ?? "ready";
}

export function PipelineConsole({
  companyKey,
  companyName,
  intake,
  initialRuns,
}: {
  companyKey: string;
  companyName: string;
  intake: IntakeSnapshot | null;
  initialRuns: PipelineRunSnapshot[];
}) {
  const [runs, setRuns] = useState(initialRuns);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState("integrated_full");
  const [isPending, beginTransition] = useTransition();
  const latestRun = runs[0] ?? null;
  const canStartRun = Boolean(intake?.ready_for_adapter);
  const companyQuery = `?company=${encodeURIComponent(companyKey)}`;

  useEffect(() => {
    if (!shouldPoll(runs)) {
      return;
    }

    const interval = window.setInterval(() => {
      startTransition(() => {
        void fetch(`/api/companies/${companyKey}/pipeline-runs?limit=12`, { cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("run 목록을 갱신하지 못했습니다.");
            }
            const payload = (await response.json()) as { runs?: PipelineRunSnapshot[] };
            setRuns(payload.runs ?? []);
          })
          .catch((error) => {
            setRequestError(error instanceof Error ? error.message : "run 목록 갱신에 실패했습니다.");
          });
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [companyKey, runs]);

  function handleStartRun() {
    if (!canStartRun) {
      setRequestError(
        intake?.findings[0] ?? "아직 intake 검토가 끝나지 않아 run을 바로 접수할 수 없습니다. Upload 화면에서 부족한 입력을 먼저 확인해 주세요.",
      );
      return;
    }

    beginTransition(() => {
      void fetch(`/api/companies/${companyKey}/pipeline-runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          execution_mode: selectedMode,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            ok?: boolean;
            error?: string;
          };
          if (!response.ok || !payload.ok) {
            throw new Error(payload.error || "run 접수에 실패했습니다.");
          }

          setRequestError(null);
          const refreshed = await fetch(`/api/companies/${companyKey}/pipeline-runs?limit=12`, {
            cache: "no-store",
          });
          const refreshedPayload = (await refreshed.json()) as { runs?: PipelineRunSnapshot[] };
          setRuns(refreshedPayload.runs ?? []);
        })
        .catch((error) => {
          setRequestError(error instanceof Error ? error.message : "run 접수에 실패했습니다.");
        });
    });
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <section className="space-y-8 lg:col-span-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pipeline 실행 관제</h1>
            <p className="mt-2 text-[13px] font-medium tracking-wide text-slate-500">
              현재 회사는 <span className="font-mono text-slate-700">{companyKey}</span> ({companyName}) 입니다.
              웹은 실행을 접수하고, 계산은 worker가 처리합니다.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">실행 준비 상태</p>
              <h3 className="mt-1 text-sm font-bold text-slate-900">
                {canStartRun ? "필수 입력이 준비되어 run을 접수할 수 있습니다." : "아직 사람 확인이 필요한 입력이 남아 있습니다."}
              </h3>
            </div>
            <StatusBadge tone={intakeToneFromStatus(intake?.status)}>
              {intakeLabelFromStatus(intake?.status)}
            </StatusBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">공통 분석 구간</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{formatAnalysisWindow(intake)}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">자동 보정</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{intake?.fixes.length ?? 0}건</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">검토 항목</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{intake?.findings.length ?? 0}건</p>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
            {intake?.analysis_summary_message ??
              "아직 intake 결과가 없어 실행 가능 여부를 확정할 수 없습니다. Upload 화면에서 입력 상태를 먼저 확인해 주세요."}
          </p>
          {!canStartRun ? (
            <p className="mt-2 text-[13px] font-medium text-amber-700">
              {intake?.findings[0] ?? "Upload 화면에서 부족한 의미 컬럼이나 source 구성을 먼저 보완해야 합니다."}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 border-l-4 border-emerald-500 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <StatusBadge tone={latestRun ? toneFromRun(latestRun) : "ready"}>
                  {latestRun?.statusLabel ?? "READY"}
                </StatusBadge>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {latestRun
                  ? `${latestRun.runKey} 상태를 보고 있습니다.`
                  : "아직 접수된 run이 없습니다."}
              </h3>
              <p className="mt-1 text-[12px] text-slate-500">
                {latestRun?.explanation ?? "실행 버튼을 누르면 worker 대기열에 pending run이 등록됩니다."}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="mb-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Current Step
            </p>
            <p className="font-mono text-[15px] font-bold text-slate-900">
              {latestRun?.currentStepLabel ?? "No active run"}
            </p>
          </div>
        </div>

        {requestError ? (
          <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <p className="text-[13px] font-medium leading-relaxed text-rose-900">{requestError}</p>
          </div>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-[13px] font-medium leading-relaxed text-amber-900">
            현재 worker registry에는 <span className="font-mono">integrated_full</span> 모드만 연결되어 있습니다.
            부분 실행 카드는 설명용이며, 아직 시작 버튼을 누를 수 없습니다. 실제 실행 가능 여부는 위의 intake 준비 상태를 먼저 따릅니다.
          </p>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">실행 모드 선택</h3>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-400">
              Worker 연결 모드 1개
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {modeCards.map((card) => {
              const active = selectedMode === card.key;
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={!card.enabled || isPending}
                  onClick={() => card.enabled && setSelectedMode(card.key)}
                  className={`relative rounded-2xl p-5 text-left shadow-sm ${
                    !card.enabled
                      ? "cursor-not-allowed border border-slate-200/50 bg-white/50 opacity-60"
                      : active
                        ? "cursor-pointer border-2 border-sky-500 bg-white"
                        : "cursor-pointer border border-slate-200 bg-white transition-all hover:border-sky-300"
                  }`}
                >
                  <div className="absolute right-4 top-4 text-slate-300">{active ? "◉" : "○"}</div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    {card.enabled ? "◍" : "▣"}
                  </div>
                  <h4 className="mb-2 text-[14px] font-bold text-slate-900">{card.title}</h4>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-500">{card.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            disabled
            className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 py-4 text-sm font-bold text-slate-400"
          >
            <Lock className="h-[18px] w-[18px]" />
            부분 실행은 추후 연결
          </button>
          <button
            type="button"
            onClick={handleStartRun}
            disabled={isPending || !canStartRun}
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? <RefreshCw className="h-[18px] w-[18px] animate-spin" /> : <Play className="h-[18px] w-[18px]" />}
            {isPending ? "Run 접수 중..." : canStartRun ? "통합 실행 접수" : "입력 검토 후 실행 가능"}
          </button>
        </div>
      </section>

      <aside className="relative lg:col-span-4">
        <div className="sticky top-20 flex flex-col space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative z-10 mb-6 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Latest Run</span>
              <StatusBadge tone={latestRun ? toneFromRun(latestRun) : "ready"}>
                {latestRun?.queueLabel ?? "IDLE"}
              </StatusBadge>
            </div>
            <div className="mb-6 h-[6px] w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
              <div
                className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all"
                style={{ width: `${latestRun?.progressPercent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">{latestRun?.runKey ?? "No run"}</p>
                <p className="font-mono text-xs font-bold text-emerald-600">{latestRun?.currentStepLabel ?? "대기"}</p>
              </div>
              {latestRun ? (
                <Link href={`/runs/${latestRun.runKey}${companyQuery}`} className="text-[11px] font-semibold text-sky-600 hover:underline">
                  상세 보기
                </Link>
              ) : null}
            </div>
          </div>

          <div className="relative flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900 p-5">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <FileJson className="h-4 w-4" />
                Run Trace
              </h3>
              <span className="text-[10px] font-bold uppercase text-slate-500">
                {latestRun?.steps.length ?? 0} step
              </span>
            </div>

            <div className="relative flex-1 space-y-0.5 overflow-y-auto p-5 pb-8">
              <div className="absolute bottom-12 left-[33px] top-8 w-[2px] bg-slate-800" />
              {(latestRun?.steps.length ? latestRun.steps : []).map((step, index) => (
                <div
                  key={`${step.stepName}-${step.stepOrder}`}
                  className={`relative flex items-start gap-4 rounded-xl p-3 ${
                    step.tone === "warn"
                      ? "border border-amber-900/30 bg-amber-900/10"
                      : step.tone === "fail"
                        ? "border border-rose-900/30 bg-rose-900/10"
                        : "bg-slate-800/20 transition-colors hover:bg-slate-800/40"
                  }`}
                >
                  <div
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-slate-900 ${
                      step.tone === "pass" || step.tone === "approved"
                        ? "bg-emerald-500 text-white"
                        : step.tone === "warn"
                          ? "bg-amber-500 text-white"
                          : step.tone === "fail"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-700 text-white"
                    }`}
                  >
                    {step.tone === "pass" || step.tone === "approved" ? (
                      <Check className="h-[14px] w-[14px]" />
                    ) : (
                      <span className="text-[10px] font-bold">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="mb-0.5 text-sm font-bold text-white">{step.stepLabel}</h4>
                      <span className="font-mono text-[11px] text-slate-400">{step.statusLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{step.description}</p>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {step.finishedAt ? `${step.finishedAt} 완료` : "완료 시각 대기"} · {Math.round(step.durationMs / 1000)}s
                    </p>
                  </div>
                </div>
              ))}

              {!latestRun?.steps.length ? (
                <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                  <p className="text-sm text-slate-300">
                    아직 단계 요약이 저장되지 않았습니다. 현재 구현은 실행 완료 후 `pipeline_run_steps`를 한 번에 기록합니다.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
