import { Download, ExternalLink } from "lucide-react";

const reportCards = [
  {
    title: "Total Validation Report",
    summary:
      "Total validation summary for final decision review, encompassing schema checks and business logic constraints.",
    keyValue: "VAL_TOTAL_RUN_01",
    time: "Mar 30, 2026, 14:45 KST",
    status: "Generated",
    tone: "success"
  },
  {
    title: "Territory Report",
    summary:
      "Territory coverage and assignment review. 1.5% of clinic IDs remain unmapped and fell back to Unknown Region.",
    keyValue: "TERR_COV_02",
    time: "Mar 30, 2026, 14:41 KST",
    status: "Available w/ Warning",
    tone: "warn"
  },
  {
    title: "Prescription Report",
    summary:
      "Prescription consistency and trend analysis based on unified baseline models across 4 active regions.",
    keyValue: "RX_TREND_09",
    time: "Mar 30, 2026, 14:43 KST",
    status: "Generated",
    tone: "success"
  },
  {
    title: "CRM Report",
    summary:
      "CRM performance and validation overview. Underlying run has been superceded by a newer execution.",
    keyValue: "CRM_PERF_OLD",
    time: "Mar 29, 2026, 09:12 KST",
    status: "Stale",
    tone: "stale"
  },
  {
    title: "Sandbox Report",
    summary:
      "Review of experimental data transformations. Report building crashed due to unhandled schema exception.",
    keyValue: "SBX_NULL",
    time: "--",
    status: "Failed",
    tone: "fail"
  },
  {
    title: "RADAR Report",
    summary:
      "Advanced outlier detection and anomaly clustering. Skipped because Unified Release mode bypasses RADAR.",
    keyValue: "--",
    time: "--",
    status: "Not Generated",
    tone: "disabled"
  }
];

export default function ReportsPage() {
  return (
    <div>
      <section className="relative mb-8 flex flex-wrap items-start justify-between gap-8 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute bottom-0 right-0 top-0 z-0 flex w-64 items-center justify-center border-l border-slate-100 bg-slate-50 p-6 text-center">
          <span className="rotate-12 text-8xl text-slate-200">◫</span>
        </div>
        <div className="relative z-10 flex grow flex-wrap items-center gap-12">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Target Workspace
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Hangyeol Pharma
            </h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">KEY: HG_RX_PROD_01</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Selected Run <span className="text-[12px]">⌄</span>
            </p>
            <h3 className="font-mono text-xl font-bold text-sky-600">RUN-20260330-01</h3>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-emerald-600">CLEARED</span>
            </p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Execution Mode
            </p>
            <p className="text-[14px] font-bold text-slate-800">Unified Release</p>
            <p className="mt-1 text-[11px] text-slate-500">Prod DB Append</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">
          Final Deliverable Reports
        </h1>
        <p className="max-w-4xl border-l-2 border-sky-500 pl-3 text-sm font-medium text-slate-500">
          This directory contains human-facing, high-level business intelligence reports and final
          summaries.
          <br />
          <b className="text-slate-700">These are not internal pipeline artifacts.</b>
        </p>
      </section>

      <section className="mb-6 flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-medium text-slate-700 shadow-sm">
            <option>All Report Types</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <input type="checkbox" className="rounded text-sky-600" defaultChecked />
            <span>Generated Only</span>
          </label>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button className="rounded border border-slate-200 bg-white px-4 py-1.5 text-sm font-bold text-slate-800 shadow-sm">
            Current Run Only
          </button>
          <button className="px-4 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-800">
            Latest Reports
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((card) => {
          const tones =
            card.tone === "success"
              ? {
                  card: "border-slate-200 bg-white hover:border-sky-300 hover:shadow-md",
                  icon: "border-emerald-100 bg-emerald-50 text-emerald-600",
                  badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  footer: "bg-slate-50 border-slate-100"
                }
              : card.tone === "warn"
                ? {
                    card: "border-slate-200 bg-white hover:border-amber-300 hover:shadow-md",
                    icon: "border-amber-100 bg-amber-50 text-amber-600",
                    badge: "border-amber-200 bg-amber-50 text-amber-700",
                    footer: "bg-amber-50/30 border-slate-100"
                  }
                : card.tone === "stale"
                  ? {
                      card: "border-slate-200 bg-slate-50 opacity-80",
                      icon: "border-slate-300 bg-slate-200 text-slate-500",
                      badge: "border-slate-300 bg-slate-100 text-slate-600",
                      footer: "bg-slate-100 border-slate-200"
                    }
                  : card.tone === "fail"
                    ? {
                        card: "border-rose-200 bg-rose-50/30 hover:border-rose-300 hover:shadow-md",
                        icon: "border-rose-200 bg-rose-100 text-rose-600",
                        badge: "border-rose-300 bg-rose-100 text-rose-700",
                        footer: "bg-rose-50 border-rose-100"
                      }
                    : {
                        card: "border-dashed border-slate-200 bg-slate-50/50",
                        icon: "border-slate-200 bg-slate-100 text-slate-400",
                        badge: "border-slate-200 bg-white text-slate-500",
                        footer: "bg-transparent border-transparent"
                      };

          return (
            <div
              key={card.title}
              className={`group flex h-full flex-col overflow-hidden rounded-xl border shadow-sm transition-all ${tones.card}`}
            >
              <div className="flex-1 border-b border-slate-100 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tones.icon}`}>
                    <span className="text-[18px]">{card.tone === "fail" ? "!" : card.tone === "disabled" ? "◌" : "▣"}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm ${tones.badge}`}>
                    <span className="h-2 w-2 rounded-full bg-current" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{card.status}</span>
                  </div>
                </div>
                <h4 className="mb-2 text-lg font-extrabold text-slate-900 transition-colors group-hover:text-sky-600">
                  {card.title}
                </h4>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">{card.summary}</p>
                <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                  <p>
                    <span className="font-semibold uppercase tracking-wider text-slate-700">KEY:</span>{" "}
                    {card.keyValue}
                  </p>
                  <p>
                    <span className="font-semibold uppercase tracking-wider text-slate-700">TIME:</span>{" "}
                    {card.time}
                  </p>
                </div>
              </div>
              <div className={`flex gap-3 border-t p-4 ${tones.footer}`}>
                {card.tone === "disabled" ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 cursor-not-allowed rounded-lg bg-slate-100 py-2 text-sm font-bold text-slate-400"
                  >
                    Unavailable
                  </button>
                ) : card.tone === "fail" ? (
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white py-2 text-sm font-bold text-rose-700 shadow-sm hover:bg-rose-50"
                  >
                    View Error Log
                  </button>
                ) : card.tone === "stale" ? (
                  <button
                    type="button"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    View Old Report
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-bold text-slate-800 shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                    >
                      <ExternalLink className="h-[18px] w-[18px]" />
                      {card.tone === "warn" ? "Open & Review" : "Open"}
                    </button>
                    <button
                      type="button"
                      className="flex w-12 items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-slate-600 shadow-sm hover:bg-slate-100"
                    >
                      <Download className="h-[18px] w-[18px]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
