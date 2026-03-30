import { Check, FileJson, Lock, Play, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

const modeCards = [
  {
    title: "CRM -> Sandbox -> Builder",
    description: "Baseline flow for testing CRM entity alignment within controlled sandbox.",
    icon: "tree",
    active: true
  },
  {
    title: "CRM -> Prescription Flow",
    description: "Advanced mapping of clinical prescription patterns to sales territories.",
    icon: "pill",
    active: false
  },
  {
    title: "Territory Optimizer V2",
    description: "Geospatial load balancing based on CRM. Needs full unified context.",
    icon: "stack",
    disabled: true
  },
  {
    title: "Full Stack Execution",
    description: "Unified CRM, Prescription, and Radar generation flow.",
    icon: "radar",
    disabled: true
  }
];

const inspectionSteps = [
  {
    title: "Stage 1: Source Intake",
    note: "Bucket sync OK (1.2GB)",
    done: true
  },
  {
    title: "Stage 2: Metadata Sync",
    note: "Schema verified.",
    done: true
  },
  {
    title: "Stage 3: CRM Validation",
    note: "[WARN] Merged 3 duplicated territory mappings. Using fallback algorithm.",
    warn: true
  },
  {
    title: "Stage 4: Format Conv",
    note: "Parquet active.",
    done: true
  },
  {
    title: "Stage 5: Metric Calc",
    note: "Generating historical baselines...",
    live: true
  },
  {
    title: "Stage 6: Report Generation",
    note: "Pending",
    pending: true
  },
  {
    title: "Stage 7: Artifact Publishing",
    note: "Pending",
    pending: true
  }
];

export default function PipelinePage() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <section className="space-y-8 lg:col-span-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Execution Control</h1>
            <p className="mt-2 text-[13px] font-medium tracking-wide text-slate-500">
              Define pipeline parameters and initiate validation run.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border-l-4 border-emerald-500 border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                  READY
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Core source data confirmed (CRM, Prescription)
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="mb-1 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              System Latency
            </p>
            <p className="font-mono text-[15px] font-bold text-slate-900">
              12ms{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-[11px] font-medium text-slate-500">
                STABLE
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-[13px] font-medium leading-relaxed text-amber-900">
            Target/Goal metrics are missing some inputs. Unified Execution is disabled. Sandbox
            Mode or CRM Base Flow remains accessible.
          </p>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Module Selection Matrix
            </h3>
            <span className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-400">
              4 Modules Available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {modeCards.map((card) => (
              <div
                key={card.title}
                className={`relative rounded-2xl p-5 shadow-sm ${
                  card.disabled
                    ? "cursor-not-allowed border border-slate-200/50 bg-white/50 opacity-60"
                    : card.active
                      ? "cursor-pointer border-2 border-sky-500 bg-white"
                      : "cursor-pointer border border-slate-200 bg-white transition-all hover:border-sky-300"
                }`}
              >
                <div className="absolute right-4 top-4 text-slate-300">
                  {card.active ? "◉" : "○"}
                </div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  {card.icon === "tree" ? "◎" : card.icon === "pill" ? "◌" : card.icon === "stack" ? "▣" : "◍"}
                </div>
                <h4 className="mb-2 text-[14px] font-bold text-slate-900">{card.title}</h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500">{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-slate-100 py-4 text-sm font-bold text-slate-400"
          >
            <Lock className="h-[18px] w-[18px]" />
            Start Unified Run
          </button>
          <button
            type="button"
            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-transform active:scale-[0.98]"
          >
            <Play className="h-[18px] w-[18px]" />
            Run Selected Flow
          </button>
        </div>
      </section>

      <aside className="relative lg:col-span-4">
        <div className="sticky top-20 flex flex-col space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative z-10 mb-6 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Progress Conduit
              </span>
              <span className="flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Running
              </span>
            </div>
            <div className="mb-6 h-[6px] w-full overflow-hidden rounded-full bg-slate-200 shadow-inner">
              <div className="h-full w-[57%] rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="flex justify-between">
              <p className="text-[11px] font-bold uppercase text-slate-500">Stage 5/7</p>
              <p className="font-mono text-xs font-bold text-emerald-600">Metric Calculation (57%)</p>
            </div>
          </div>

          <div className="relative flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <div className="flex items-center justify-between border-b border-slate-800/50 bg-slate-900 p-5">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                <FileJson className="h-4 w-4" />
                Stage Inspection
              </h3>
              <button type="button" className="text-[10px] font-bold uppercase text-slate-500 transition-colors hover:text-white">
                View Raw JSON
              </button>
            </div>

            <div className="relative flex-1 space-y-0.5 overflow-y-auto p-5 pb-8">
              <div className="absolute bottom-12 left-[33px] top-8 w-[2px] bg-slate-800" />
              {inspectionSteps.map((step, index) => (
                <div
                  key={step.title}
                  className={`relative flex items-start gap-4 rounded-xl p-3 ${
                    step.warn
                      ? "border border-amber-900/30 bg-amber-900/10"
                      : step.live
                        ? "border border-sky-500/20 bg-sky-900/20 shadow-lg"
                        : step.pending
                          ? "opacity-40"
                          : "bg-slate-800/20 transition-colors hover:bg-slate-800/40"
                  }`}
                >
                  <div
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-4 ring-slate-900 ${
                      step.done
                        ? "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        : step.warn
                          ? "bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                          : step.live
                            ? "bg-sky-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                            : "bg-slate-700 text-white"
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-[14px] w-[14px]" />
                    ) : step.warn ? (
                      <TriangleAlert className="h-[14px] w-[14px]" />
                    ) : step.live ? (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    ) : (
                      <span className="text-[10px] font-bold">{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="mb-0.5 text-sm font-bold text-white">{step.title}</h4>
                    {step.warn ? (
                      <div className="mt-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
                        <p className="font-mono text-[11px] leading-relaxed text-amber-300/80">
                          {step.note}
                        </p>
                      </div>
                    ) : step.live ? (
                      <>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-sky-300">
                          <RefreshCw className="h-[14px] w-[14px] animate-spin" />
                          {step.note}
                        </p>
                        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full w-[57%] bg-sky-500" />
                        </div>
                      </>
                    ) : (
                      <p
                        className={`mt-0.5 text-[11px] font-medium tracking-wide ${
                          step.done ? "text-emerald-400" : "font-mono text-slate-500"
                        }`}
                      >
                        {step.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800 p-4 font-mono text-xs text-slate-400">
              <span>Process ID: TX-9001A</span>
              <span className="text-sky-400">ETA: 01:15</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
