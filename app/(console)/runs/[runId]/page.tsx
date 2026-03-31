import { notFound } from "next/navigation";
import { runHistory, runStepDetails } from "@/lib/shared/mock-data";

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
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Recent Runs
          </p>
          <h2 className="text-xl font-semibold text-slate-950">run 선택</h2>
          <div className="mt-5 space-y-3">
            {runHistory.map((item) => {
              const selectedState = item.runId === selected.runId;

              return (
                <a
                  key={item.runId}
                  href={`/runs/${item.runId}`}
                  className={`block rounded-2xl border p-4 transition ${
                    selectedState
                      ? "border-sky-300 bg-sky-50/80 shadow-[0_20px_40px_rgba(14,116,144,0.08)]"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-500">
                        {item.runId}
                      </p>
                      <p className="mt-2 font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm text-slate-500">{item.executedAt}</p>
                    </div>
                    <span
                      className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                        item.status === "approved"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : item.status === "fail"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/65 bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <p className="eyebrow">Execution Passport</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {selected.title} 결과 해석
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="pill">Company · hangyeol_pharma</span>
            <span className="pill">Mode · {selected.mode}</span>
            <span className="pill">Run · {selected.runId}</span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              {selected.statusLabel}
            </span>
          </div>
          <p className="mt-6 max-w-3xl text-body text-base text-slate-600">
            현재 선택된 run의 단계별 판정과 근거 파일, 다음 확인 포인트를 한 화면에서 보여주는 상세 화면입니다.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="section-header">
            <div>
              <p className="section-kicker">Step Trace</p>
              <h2 className="section-title">단계별 결과</h2>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {runStepDetails.map((step) => (
              <div key={step.title} className="action-card">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                  <span
                    className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      step.status === "pass"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : step.status === "approved"
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {step.statusLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                <p className="mt-3 font-mono text-sm text-slate-500">Evidence · {step.evidence}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="section-kicker">Decision Summary</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              WARN 상태이지만 운영 검토 후 진행 가능합니다.
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="callout callout-warn">
                Territory 매핑 예외 증가로 인해 운영 검토가 필요합니다.
              </div>
              <div className="callout callout-ok">
                핵심 KPI 계산은 완료되었고, Builder 입력도 생성되었습니다.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="section-kicker">Next Actions</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">바로 확인할 항목</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/artifacts" className="secondary-button">
                Open Artifacts
              </a>
              <a href="/reports" className="ghost-button">
                Open Reports
              </a>
              <a href="/agent" className="ghost-button">
                Ask Agent
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
