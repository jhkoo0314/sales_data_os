import { ArrowRight, CalendarDays, FolderOpen, Pill, Target, Users } from "lucide-react";
import { monthlyUploads, savedFiles } from "@/lib/mock-data";

const sourceCards = [
  {
    title: "CRM Entity & Territory",
    label: "Master",
    labelTone: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Users,
    iconTone: "bg-indigo-50 text-indigo-600",
    progress: "100% Complete",
    width: "w-full",
    note: "Latest: 2026-03-30",
    noteTone: "text-slate-400",
    barTone: "bg-indigo-500"
  },
  {
    title: "Prescription Records (UB)",
    label: "Transactional",
    labelTone: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Pill,
    iconTone: "bg-sky-50 text-sky-600",
    progress: "84% Complete",
    width: "w-[84%]",
    note: "End Date: Dec 2025",
    noteTone: "text-sky-600",
    barTone: "bg-sky-500"
  },
  {
    title: "Sales & Target Goals",
    label: "Transactional",
    labelTone: "bg-sky-50 text-sky-700 border-sky-200",
    icon: Target,
    iconTone: "bg-emerald-50 text-emerald-600",
    progress: "100% Complete",
    width: "w-full",
    note: "End Date: June 2026",
    noteTone: "text-emerald-600",
    barTone: "bg-emerald-500"
  }
];

export default function UploadPage() {
  return (
    <div>
      <section className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-slate-900">Upload Readiness</h1>
          <p className="text-[15px] font-light tracking-wide text-slate-500">
            데이터 인테이크 상태 및 엔진 가동 전 정합성 검토
          </p>
        </div>
        <a href="/pipeline" className="primary-button flex items-center gap-2 px-6 py-3">
          Start Execution
          <ArrowRight className="h-[18px] w-[18px]" />
        </a>
      </section>

      <section className="relative mb-6 flex items-center gap-4 overflow-hidden rounded-xl border border-sky-200 bg-sky-50/50 p-4">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-sky-500" />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Common Analysis Window: December 2025</h3>
          <p className="mt-0.5 text-[13px] text-slate-600">
            The system has identified <strong className="text-sky-700">December 2025</strong> as
            the maximum common threshold across all transactional sources.
          </p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Source Validation Matrix
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {sourceCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${card.barTone}`} />
                  <div className="mb-6 flex items-start justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconTone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${card.labelTone}`}>
                      {card.label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight text-slate-900">{card.title}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Coverage Sync</span>
                      <span className="font-bold text-slate-900">{card.progress}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${card.width} ${card.barTone}`} />
                    </div>
                    <p className={`mt-2 text-[11px] font-mono font-bold ${card.noteTone}`}>{card.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            System Verdict
          </h3>
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <span className="mb-6 inline-flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Periodic Sync Warning
                </span>
                <p className="font-serif text-xl font-medium leading-relaxed tracking-tight text-white">
                  "System architecture is mapped, but source periods differ. Validating within
                  common window (Dec 2025)."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FolderOpen className="h-[18px] w-[18px] text-slate-400" />
            Recently Processed Files
          </h2>
          <button className="text-[11px] font-bold uppercase tracking-widest text-sky-600 transition-colors hover:text-sky-800">
            Open Explorer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4">Upload Context</th>
                <th className="px-6 py-4 text-right">Sanity Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[13px] font-medium text-slate-600">
              {[
                {
                  filename: "rx_data_raw_202512.parquet",
                  type: monthlyUploads[0]?.source ?? "Prescription",
                  size: "1.2 GB",
                  context: "2026-03-30 09:30 KST",
                  status: "Pass",
                  tone: "bg-emerald-50 text-emerald-600 border-emerald-100",
                  icon: "check"
                },
                {
                  filename: "sales_target_v3_final.csv",
                  type: monthlyUploads[3]?.source ?? "Sales/Goals",
                  size: "450 MB",
                  context: "2026-03-30 10:15 KST",
                  status: "Warn",
                  tone: "bg-amber-50 text-amber-600 border-amber-100",
                  icon: "warning"
                },
                {
                  filename: "territory_mapping_delta.json",
                  type: savedFiles[1]?.name ?? "Master Sync",
                  size: "12.4 MB",
                  context: "2026-03-29 16:45 KST",
                  status: "Pass",
                  tone: "bg-emerald-50 text-emerald-600 border-emerald-100",
                  icon: "check"
                }
              ].map((row) => (
                <tr key={row.filename} className="group cursor-pointer transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-[12px] text-slate-900 transition-colors group-hover:text-sky-600">
                    {row.filename}
                  </td>
                  <td className="px-6 py-4">{row.type}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{row.size}</td>
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{row.context}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${row.tone}`}>
                      <span className="text-[12px] leading-none">{row.icon === "check" ? "✓" : "!"}</span>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
