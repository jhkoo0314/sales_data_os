"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileOutput,
  FolderSearch,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { RunDetailContext } from "@/lib/shared/run-detail-context";
import type { PipelineRunSnapshot } from "@/lib/server/pipeline/run-monitor";

function shouldPoll(run: PipelineRunSnapshot) {
  return run.runStatus === "pending" || run.runStatus === "running";
}

export function RunDetailConsole({
  companyKey,
  initialRun,
  initialRuns,
  initialDetail,
}: {
  companyKey: string;
  initialRun: PipelineRunSnapshot;
  initialRuns: PipelineRunSnapshot[];
  initialDetail: RunDetailContext;
}) {
  const [run, setRun] = useState(initialRun);
  const [recentRuns, setRecentRuns] = useState(initialRuns);
  const [detail, setDetail] = useState(initialDetail);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldPoll(run)) {
      return;
    }

    const interval = window.setInterval(() => {
      void Promise.all([
        fetch(`/api/companies/${companyKey}/pipeline-runs/${run.runKey}`, { cache: "no-store" }),
        fetch(`/api/companies/${companyKey}/pipeline-runs?limit=12`, { cache: "no-store" }),
        fetch(`/api/companies/${companyKey}/pipeline-runs/${run.runKey}/context`, { cache: "no-store" }),
      ])
        .then(async ([runResponse, listResponse, detailResponse]) => {
          if (!runResponse.ok || !listResponse.ok || !detailResponse.ok) {
            throw new Error("run 상태를 갱신하지 못했습니다.");
          }
          const runPayload = (await runResponse.json()) as { run?: PipelineRunSnapshot };
          const listPayload = (await listResponse.json()) as { runs?: PipelineRunSnapshot[] };
          const detailPayload = (await detailResponse.json()) as { detail?: RunDetailContext };
          if (runPayload.run) {
            setRun(runPayload.run);
          }
          setRecentRuns(listPayload.runs ?? []);
          if (detailPayload.detail) {
            setDetail(detailPayload.detail);
          }
          setRequestError(null);
        })
        .catch((error) => {
          setRequestError(error instanceof Error ? error.message : "run 상태 갱신에 실패했습니다.");
        });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [companyKey, run]);

  const warnSteps = run.steps.filter((step) => step.tone === "warn");
  const failSteps = run.steps.filter((step) => step.tone === "fail");
  const companyQuery = `?company=${encodeURIComponent(companyKey)}`;
  const flaggedModules = detail.modules.filter((item) => item.tone === "warn" || item.tone === "fail");

  return (
    <div className="space-y-6">
      <section className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">Run Detail</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{run.runKey} 실행 해석</h1>
          <p className="mt-2 text-sm text-slate-500">
            회사 <span className="font-mono text-slate-700">{companyKey}</span> 기준으로, 이 run의 상태와 이유를 보여줍니다.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/artifacts${companyQuery}`}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
          >
            <FolderSearch className="h-[18px] w-[18px]" />
            Artifacts 열기
          </Link>
          <Link
            href={`/reports${companyQuery}`}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold !text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
          >
            <FileOutput className="h-[18px] w-[18px]" />
            결과 보고서
          </Link>
        </div>
      </section>

      {requestError ? (
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm text-rose-900">{requestError}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="pointer-events-none absolute right-[-2rem] top-[-2rem] h-48 w-48 rounded-full bg-slate-50 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="h-[18px] w-[18px] text-slate-400" />
              Recent Runs
            </h2>
          </div>
          <div className="relative z-10 mt-4 space-y-3">
            {recentRuns.map((item) => {
              const selectedState = item.runKey === run.runKey;
              return (
                <Link
                  key={item.id}
                  href={`/runs/${item.runKey}${companyQuery}`}
                  className={`group block rounded-xl border p-4 transition-all ${
                    selectedState
                      ? "border-sky-200 bg-sky-50/50 shadow-sm"
                      : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                          selectedState ? "text-sky-600" : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      >
                        {item.runKey}
                      </p>
                      <p
                        className={`mt-1.5 text-sm font-bold transition-colors ${
                          selectedState ? "text-sky-900" : "text-slate-900 group-hover:text-sky-700"
                        }`}
                      >
                        {item.executionMode}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">{item.createdAt}</p>
                    </div>
                    <StatusBadge tone={item.tone}>{item.statusLabel}</StatusBadge>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="relative col-span-12 flex flex-col justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl lg:col-span-1">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Run Identity</span>
              <StatusBadge tone={run.tone}>{run.statusLabel}</StatusBadge>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Company</p>
                <p className="font-mono text-lg text-white">{run.companyKey}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Mode</p>
                <p className="font-mono text-lg text-white">{run.executionMode}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">Queue</p>
                <p className="font-mono text-lg text-sky-400">{run.queueLabel}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur">
              <p className="text-sm font-light leading-relaxed text-slate-300">{run.explanation}</p>
              <p className="mt-3 text-[11px] text-slate-500">
                시작 {run.startedAt ?? "대기 중"} · 종료 {run.finishedAt ?? "진행 중"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="pointer-events-none absolute right-[-2rem] top-[-2rem] h-48 w-48 rounded-full bg-slate-50 blur-3xl" />
          <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-[18px] w-[18px] text-slate-400" />
              Step Trace
            </h2>
          </div>

          <div className="relative z-10 space-y-4">
            {run.steps.map((step) => {
              const isPass = step.tone === "pass" || step.tone === "approved";
              const Icon = isPass ? ShieldCheck : ShieldAlert;
              return (
                <div
                  key={step.id}
                  className="group relative rounded-xl border border-slate-100 bg-white p-5 transition-all hover:border-sky-200 hover:bg-sky-50/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isPass
                            ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                            : step.tone === "fail"
                              ? "border-rose-100 bg-rose-50 text-rose-600"
                              : "border-amber-100 bg-amber-50 text-amber-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{step.stepLabel}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                        <p className="mt-3 font-mono text-[11px] text-slate-400">
                          완료 {step.finishedAt ?? "대기"} · {Math.round(step.durationMs / 1000)}s
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={step.tone}>{step.statusLabel}</StatusBadge>
                  </div>
                </div>
              );
            })}

            {run.steps.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-600">
                  아직 `pipeline_run_steps`가 비어 있습니다. 현재 run은 queue 상태만 먼저 저장되고, 단계 요약은 완료 후 반영됩니다.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldAlert className="h-[18px] w-[18px] text-slate-400" />
                Validation Summary
              </h2>
              {detail.overallStatus ? <StatusBadge tone={flaggedModules.length ? "warn" : "pass"}>{detail.overallStatus}</StatusBadge> : null}
            </div>

            <div className="relative z-10 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium leading-relaxed text-slate-700">{detail.overallSummary}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {detail.overallScore !== null ? `전체 점수 ${detail.overallScore.toFixed(1)}점` : "전체 점수는 별도 저장이 없습니다."}
                  {detail.totalDurationMs !== null ? ` · 총 ${Math.round(detail.totalDurationMs / 1000)}초` : ""}
                </p>
              </div>

              {detail.modules.length > 0 ? (
                <div className="space-y-3">
                  {detail.modules.map((module) => (
                    <div key={module.moduleKey} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{module.moduleLabel}</h3>
                            <StatusBadge tone={module.tone}>{module.status}</StatusBadge>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-600">{module.summaryText}</p>
                        </div>
                        {module.score !== null ? (
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Score</p>
                            <p className="font-mono text-sm font-bold text-slate-900">{module.score.toFixed(1)}</p>
                          </div>
                        ) : null}
                      </div>

                      {module.evidence.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {module.evidence.map((item) => (
                            <div key={`${module.moduleKey}-${item.label}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-700">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                  아직 validation summary 파일이 없어 모듈별 해석을 붙일 수 없습니다.
                </div>
              )}
            </div>
          </div>

          {detail.radar ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="pointer-events-none absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full bg-sky-50 blur-3xl" />
              <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Activity className="h-[18px] w-[18px] text-slate-400" />
                  RADAR Priority
                </h2>
                {detail.radar.status ? <StatusBadge tone={detail.radar.tone}>{detail.radar.status}</StatusBadge> : null}
              </div>

              <div className="relative z-10 space-y-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    {detail.radar.topIssue ?? "아직 먼저 볼 RADAR 신호가 없습니다."}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{detail.radar.summaryText}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Signals</p>
                    <p className="mt-1 text-2xl font-extrabold text-slate-900">{detail.radar.signalCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Run</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">{detail.radar.runId ?? "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Period</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">{detail.radar.periodValue ?? "-"}</p>
                  </div>
                </div>

                {detail.radar.signals.length > 0 ? (
                  <div className="space-y-3">
                    {detail.radar.signals.slice(0, 2).map((signal) => (
                      <div key={signal.signalId} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={signal.tone}>{signal.severity}</StatusBadge>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {signal.priorityLabel}
                          </span>
                          {signal.priorityScore !== null ? (
                            <span className="font-mono text-[11px] text-slate-500">Priority {signal.priorityScore}</span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-slate-900">{signal.title}</h3>
                        <p className="mt-2 text-xs leading-5 text-slate-600">{signal.message}</p>

                        {signal.evidence.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {signal.evidence.map((item) => (
                              <div key={`${signal.signalId}-${item.label}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-700">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {signal.decisionOptions.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {signal.decisionOptions.map((option) => (
                              <div key={`${signal.signalId}-${option.code}`} className="rounded-lg border border-slate-100 bg-white p-3">
                                <p className="text-xs font-bold text-slate-900">
                                  {option.code}. {option.label}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">{option.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                    현재 run 기준으로 먼저 볼 RADAR 신호가 없습니다.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute right-[-2rem] top-[-2rem] h-32 w-32 rounded-full bg-amber-50 blur-3xl" />
            <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="h-[18px] w-[18px] text-slate-400" />
                Decision Summary
              </h2>
            </div>

            <div className="relative z-10">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                {run.runStatus === "failed"
                  ? "실행이 중단되어 원인 확인이 필요합니다."
                  : run.overallStatus === "warn"
                    ? "경고가 있어 운영 검토 후 진행해야 합니다."
                    : run.overallStatus === "pass"
                      ? "전체 흐름이 정상 완료되었습니다."
                      : "worker가 현재 실행 중입니다."}
              </h2>
              <div className="mt-5 space-y-3">
                {warnSteps.length > 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm font-medium leading-relaxed text-amber-900">
                      경고 단계: {warnSteps.map((step) => step.stepLabel).join(", ")}
                    </p>
                  </div>
                ) : null}
                {failSteps.length > 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <p className="text-sm font-medium leading-relaxed text-rose-900">
                      실패 단계: {failSteps.map((step) => step.stepLabel).join(", ")}
                    </p>
                  </div>
                ) : null}
                {run.overallStatus === "pass" ? (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <p className="text-sm font-medium leading-relaxed text-emerald-900">
                      KPI 계산, validation, builder 결과가 모두 끝났습니다. 이제 산출물 확인 단계로 넘어가면 됩니다.
                    </p>
                  </div>
                ) : null}
                {flaggedModules.length > 0 ? (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <p className="text-sm font-medium leading-relaxed text-amber-900">
                      운영 검토가 필요한 모듈: {flaggedModules.map((module) => module.moduleLabel).join(", ")}
                    </p>
                  </div>
                ) : null}
                {detail.builder ? (
                  <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                    <FileOutput className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                    <p className="text-sm font-medium leading-relaxed text-sky-900">
                      Builder 기준 미리보기 보고서 {detail.builder.builtReportCount}개가 준비되어 있습니다.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {detail.builder ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <FileOutput className="h-[18px] w-[18px] text-slate-400" />
                  Builder Output
                </h2>
              </div>
              <div className="relative z-10 space-y-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">생성된 보고서 {detail.builder.builtReportCount}개</p>
                  <p className="mt-1 text-xs text-slate-500">현재 run에서 확인 가능한 미리보기 결과 수입니다.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.builder.reportNames.map((name) => (
                    <span key={name} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
                {detail.builder.skippedReports.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    건너뛴 보고서: {detail.builder.skippedReports.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Zap className="h-[18px] w-[18px] text-slate-400" />
                Next Actions
              </h2>
            </div>

            <div className="relative z-10 flex flex-col gap-3">
              {detail.nextActions.map((action) => (
                <div key={action} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  {action}
                </div>
              ))}
              <Link
                href={`/artifacts${companyQuery}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-sky-300 hover:bg-sky-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    <FolderSearch className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-sky-700">
                      Open Artifacts
                    </h3>
                    <p className="text-xs text-slate-500">근거 파일과 builder 입력을 확인합니다.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" />
              </Link>

              <Link
                href={`/reports${companyQuery}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
                    <FileOutput className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                      Open Reports
                    </h3>
                    <p className="text-xs text-slate-500">최종 보고서와 전달 가능한 결과를 확인합니다.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600" />
              </Link>

              <Link
                href={`/agent${companyQuery}&run=${encodeURIComponent(run.runKey)}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-violet-300 hover:bg-violet-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
                    <MessageSquare className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-violet-700">
                      Ask Agent
                    </h3>
                    <p className="text-xs text-slate-500">경고 사유와 대응 방향을 해석 레이어에서 확인합니다.</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-600" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
