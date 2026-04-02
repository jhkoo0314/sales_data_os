import { notFound } from "next/navigation";
import { runHistory, runStepDetails } from "@/lib/shared/mock-data";
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
  Zap,
} from "lucide-react";

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
};

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { runId } = await params;
  const selected = runHistory.find((item) => item.runId === runId);

  if (!selected) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">Execution Passport</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {selected.title} 결과 해석
          </h1>
        </div>
        <div className="flex gap-3">
          <a
            href="/artifacts"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
          >
            <FolderSearch className="h-[18px] w-[18px]" />
            Artifacts 열기
          </a>
          <a
            href="/reports"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold !text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
          >
            <FileOutput className="h-[18px] w-[18px]" />
            결과 보고서
          </a>
        </div>
      </section>

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
            {runHistory.map((item) => {
              const selectedState = item.runId === selected.runId;

              return (
                <a
                  key={item.runId}
                  href={`/runs/${item.runId}`}
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
                          selectedState
                            ? "text-sky-600"
                            : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      >
                        {item.runId}
                      </p>
                      <p
                        className={`mt-1.5 text-sm font-bold transition-colors ${
                          selectedState
                            ? "text-sky-900"
                            : "text-slate-900 group-hover:text-sky-700"
                        }`}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500">
                        {item.executedAt}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        item.status === "approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "fail"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.status !== "fail" && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === "approved"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />
                      )}
                      {item.statusLabel}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="relative col-span-12 flex flex-col justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl lg:col-span-1">
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Run Identity
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                  selected.status === "approved"
                    ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                    : selected.status === "fail"
                      ? "border-rose-500/30 bg-rose-500/20 text-rose-400"
                      : "border-amber-500/30 bg-amber-500/20 text-amber-500"
                }`}
              >
                {selected.statusLabel}
              </span>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Company
                </p>
                <p className="font-mono text-lg text-white">hangyeol_pharma</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Mode
                </p>
                <p className="font-mono text-lg text-white">{selected.mode}</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  Run ID
                </p>
                <p className="font-mono text-lg text-sky-400">{selected.runId}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-5 backdrop-blur">
              <p className="text-sm font-light leading-relaxed text-slate-300">
                현재 선택된 run의 단계별 판정과 근거 파일, 다음 확인 포인트를 한
                화면에서 보여주는 상세 화면입니다. Validation 정책에 따라 최종{" "}
                {selected.statusLabel} 판정을 받았습니다.
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
            {runStepDetails.map((step) => {
              const isPass =
                step.status === "pass" || step.status === "approved";
              const Icon = isPass ? ShieldCheck : ShieldAlert;
              return (
                <div
                  key={step.title}
                  className="group relative rounded-xl border border-slate-100 bg-white p-5 transition-all hover:border-sky-200 hover:bg-sky-50/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          isPass
                            ? "border-emerald-100 bg-emerald-50 text-emerald-600"
                            : "border-amber-100 bg-amber-50 text-amber-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {step.description}
                        </p>
                        <p className="mt-3 font-mono text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-500">
                            Evidence
                          </span>{" "}
                          · {step.evidence}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        isPass
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {step.statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
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
                WARN 상태이지만 운영 검토 후 진행 가능합니다.
              </h2>
              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <p className="text-sm font-medium leading-relaxed text-amber-900">
                    Territory 매핑 예외 증가로 인해 운영 검토가 필요합니다.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium leading-relaxed text-emerald-900">
                    핵심 KPI 계산은 완료되었고, Builder 입력도 생성되었습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="relative z-10 mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Zap className="h-[18px] w-[18px] text-slate-400" />
                Next Actions
              </h2>
            </div>

            <div className="relative z-10 flex flex-col gap-3">
              <a
                href="/artifacts"
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
                    <p className="text-xs text-slate-500">
                      근거 파일 및 Builder 입력 확인
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" />
              </a>

              <a
                href="/agent"
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
                    <p className="text-xs text-slate-500">
                      예외 사유 분석 및 대응 가이드 질문
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-600" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
