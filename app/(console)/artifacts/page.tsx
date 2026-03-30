import { Copy, Download, Info, Search } from "lucide-react";
import { artifacts } from "@/lib/mock-data";

const artifactRows = [
  {
    filename: "validation_summary.json",
    stage: "Validation",
    createdAt: "Mar 30, 14:40:12",
    size: "45 KB",
    description:
      "System audit trace of initial data type validation. Important for investigating intake rejections.",
    emphasis: "Safe to ignore if run passed.",
    status: "Audit / Reference Only",
    tone: "default",
    format: "JSON"
  },
  {
    filename: "mapping_exceptions.json",
    stage: "Territory",
    createdAt: "Mar 30, 14:41:05",
    size: "12 KB",
    description: "Contains 18 unmapped clinic IDs that fell back to 'Unknown Region'.",
    emphasis: "Requires investigation for operational accuracy.",
    status: "Generated w/ Warning",
    tone: "warn",
    format: "JSON"
  },
  {
    filename: "rx_unified_baseline_202512.parquet",
    stage: "Prescription",
    createdAt: "Mar 30, 14:43:22",
    size: "142 MB",
    description: "Columnar compressed payload containing clean, unified Rx data.",
    emphasis: "Core analytical artifact synced to Data Warehouse.",
    status: "Final Input to Next Stage",
    tone: "success",
    format: "PQT"
  },
  {
    filename: "builder_input_payload.json",
    stage: "Builder-Input",
    createdAt: "Not Generated",
    size: "--",
    description: "Target payload for external system consumption. Did not trigger because run stopped at Prescription stage.",
    emphasis: "",
    status: "Missing",
    tone: "missing",
    format: "JSON"
  }
];

export default function ArtifactsPage() {
  return (
    <div>
      <section className="relative mb-8 flex flex-wrap items-start justify-between gap-8 overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute bottom-0 right-0 top-0 z-0 flex w-64 items-center justify-center border-l border-slate-100 bg-slate-50 p-6 text-center">
          <span className="rotate-12 text-8xl text-slate-200">⌕</span>
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
          Operational Artifacts
        </h1>
        <p className="max-w-3xl border-l-2 border-sky-500 pl-3 text-sm font-medium text-slate-500">
          Artifacts are internal machine-facing outputs, structured intermediate payloads, and
          system exception logs generated during pipeline execution.
          <br />
          <b className="text-slate-700">These are not human-facing final reports.</b>
        </p>
      </section>

      <section className="mb-6 flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-[18px] w-[18px] text-slate-400" />
            <input
              type="text"
              placeholder="Search by artifact name..."
              className="w-72 rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm tracking-wide shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-medium text-slate-700 shadow-sm">
            <option>All Stages</option>
            <option>Intake</option>
            <option>Validation</option>
            <option>Territory</option>
          </select>
          <select className="rounded-lg border border-slate-300 bg-white p-2 text-sm font-medium text-slate-700 shadow-sm">
            <option>All Formats</option>
            <option>JSON</option>
            <option>Parquet</option>
            <option>XLSX</option>
          </select>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm">
            Current Run
          </button>
          <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
            All Recent
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {artifactRows.map((row) => {
          const toneClasses =
            row.tone === "warn"
              ? {
                  container: "border-amber-200 bg-amber-50/30 hover:border-amber-300",
                  icon: "border-amber-200 bg-white text-amber-600",
                  badge: "border-amber-200 bg-amber-50 text-amber-700",
                  meta: "bg-amber-100 text-amber-700"
                }
              : row.tone === "success"
                ? {
                    container: "border-slate-200 bg-white hover:border-slate-300",
                    icon: "border-sky-100 bg-sky-50 text-sky-600",
                    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
                    meta: "bg-slate-100 text-slate-500"
                  }
                : row.tone === "missing"
                  ? {
                      container: "border-rose-100 bg-rose-50/20 opacity-70",
                      icon: "border-slate-200 border-dashed bg-slate-50 text-slate-400",
                      badge: "border-rose-200 bg-white text-rose-500",
                      meta: "bg-slate-100 text-slate-500"
                    }
                  : {
                      container: "border-slate-200 bg-white hover:border-slate-300",
                      icon: "border-slate-200 bg-slate-100 text-slate-500",
                      badge: "border-slate-200 bg-white text-slate-500",
                      meta: "bg-slate-100 text-slate-500"
                    };

          return (
            <div
              key={row.filename}
              className={`group overflow-hidden rounded-xl border shadow-sm transition-colors ${toneClasses.container}`}
            >
              <div className="flex items-start gap-4 p-5">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-xs font-bold uppercase shadow-inner ${toneClasses.icon}`}
                >
                  {row.format}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${toneClasses.meta}`}
                    >
                      {row.stage}
                    </span>
                    <span className="font-mono text-[10px] font-medium text-slate-400">
                      {row.createdAt}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">• Size: {row.size}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-mono text-[15px] font-bold text-slate-900 transition-colors group-hover:text-sky-600">
                        {row.filename}
                      </h4>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                        {row.description}{" "}
                        {row.emphasis ? <strong className="font-medium text-slate-600">{row.emphasis}</strong> : null}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm ${toneClasses.badge}`}
                    >
                      {row.status}
                    </div>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 flex-col gap-2 border-l border-slate-100 pl-4">
                  {row.tone === "missing" ? (
                    <button
                      type="button"
                      disabled
                      className="w-28 cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-300 shadow-sm"
                    >
                      Unavailable
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-bold shadow-sm ${
                          row.tone === "warn"
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : row.tone === "success"
                              ? "bg-sky-500 text-white hover:bg-sky-600"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {row.tone === "warn" ? "Inspect" : row.tone === "success" ? "Download" : "View"}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
                          title="Download File"
                        >
                          {row.tone === "success" ? (
                            <Info className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="flex flex-1 items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
                          title="Copy DB Path"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-8 border-t border-slate-200 pb-4 pt-8 text-center">
        <p className="text-[11px] tracking-wide text-slate-400">
          END OF ARTIFACT LOG FOR RUN-20260330-01
        </p>
      </div>
    </div>
  );
}
