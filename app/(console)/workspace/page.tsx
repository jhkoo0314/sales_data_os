import {
  Activity,
  CloudUpload,
  FileOutput,
  GitBranchPlus,
  History,
  Map,
  Plus,
  Users
} from "lucide-react";
import { reports, runContext } from "@/lib/shared/mock-data";

const quickActionCards = [
  {
    title: "Upload Matrix",
    description: "Ingest raw targets",
    href: "/upload",
    icon: CloudUpload,
    accent: "group-hover:border-sky-300 group-hover:bg-sky-600"
  },
  {
    title: "Run Pipeline",
    description: "Process calculation batch",
    href: "/pipeline",
    icon: GitBranchPlus,
    accent: "group-hover:border-violet-300 group-hover:bg-violet-600"
  },
  {
    title: "Target Mapping",
    description: "Review coverage gaps",
    href: `/runs/${runContext.runId}`,
    icon: Map,
    accent: "group-hover:border-emerald-300 group-hover:bg-emerald-600"
  },
  {
    title: "Reports & Output",
    description: "Final matrix delivery",
    href: "/reports",
    icon: FileOutput,
    dark: true,
    accent: ""
  }
];

const recentUploads = [
  {
    focus: "CRM Entities",
    file: "master_customer_list.csv",
    time: "Today, 09:12 AM",
    status: "Validated",
    statusTone: "text-emerald-600 bg-emerald-50",
    icon: Users,
    iconTone: "bg-indigo-50 text-indigo-600"
  },
  {
    focus: "Sales Baseline",
    file: "q1_regional_sales.xlsx",
    time: "Today, 08:45 AM",
    status: "Analyzing...",
    statusTone: "text-amber-600 bg-amber-50",
    icon: Activity,
    iconTone: "bg-rose-50 text-rose-600"
  },
  {
    focus: "Goal Matrix",
    file: "annual_forecast_v2.csv",
    time: "Yesterday, 04:30 PM",
    status: "Validated",
    statusTone: "text-emerald-600 bg-emerald-50",
    icon: Map,
    iconTone: "bg-teal-50 text-teal-600"
  }
];

export default function WorkspacePage() {
  return (
    <div>
      <section className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">Architecture Overview</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Workspace Home</h1>
        </div>
        <div className="flex gap-3">
          <a
            href="/pipeline"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
          >
            <Plus className="h-[18px] w-[18px]" />
            New Pipeline Run
          </a>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800"
          >
            <Plus className="h-[18px] w-[18px]" />
            새 회사 등록
          </button>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <div className="relative col-span-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-8">
          <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-64 w-64 rounded-full bg-sky-50 blur-3xl" />

          <div className="relative z-10 mb-8 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-2xl font-bold text-white shadow-lg">
                HYL
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Hangyeol Pharma</h2>
                  <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                    Enterprise Sync Active
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Global Node: System Architect for clinical validation
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 md:grid-cols-4">
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Daily Target
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">$1.2M</p>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">+4.2% vs prev</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Territories
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">142</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">9 active clusters</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Sync Health
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">99.8%</p>
              <p className="mt-1 text-[11px] font-medium text-emerald-600">Nominal</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Active Agents
              </p>
              <p className="font-mono text-2xl font-bold text-slate-900">12</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Operational Nodes</p>
            </div>
          </div>
        </div>

        <div className="relative col-span-12 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl lg:col-span-4">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
          <div className="relative z-10">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Active Execution
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                WARN
              </span>
            </div>
            <h3 className="mb-2 font-mono text-lg text-white">{runContext.runId}</h3>
            <p className="mb-6 text-sm font-light leading-relaxed text-slate-400">
              Validation running for common window. Some sources indicate period mismatches.
            </p>
          </div>
          <div className="relative z-10">
            <div className="mb-2 flex justify-between text-xs font-medium text-slate-300">
              <span>Step: Data Normalization</span>
              <span className="font-mono text-white">85%</span>
            </div>
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="relative h-full w-[85%] rounded-full bg-gradient-to-r from-amber-600 to-amber-400">
                <div className="absolute bottom-0 right-0 top-0 w-4 bg-white/50 blur-sm" />
              </div>
            </div>
            <a
              href={`/runs/${runContext.runId}`}
              className="block w-full rounded-lg bg-white/10 py-2.5 text-center text-xs font-bold text-white transition-colors hover:bg-white/20"
            >
              Inspect Live Trace
            </a>
          </div>
        </div>
      </section>

      <section className="col-span-12 mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {quickActionCards.map((card) => {
          const Icon = card.icon;

          return (
            <a
              key={card.title}
              href={card.href}
              className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-5 transition-all ${
                card.dark
                  ? "border-none bg-slate-900"
                  : "border-slate-200 bg-white/95 backdrop-blur-[12px]"
              }`}
            >
              {!card.dark ? (
                <div className="absolute inset-0 bg-gradient-to-r from-sky-100/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              ) : null}
              <div className="relative z-10">
                <h3 className={`text-sm font-bold ${card.dark ? "text-white" : "text-slate-900"}`}>
                  {card.title}
                </h3>
                <p className={`mt-1 text-[11px] ${card.dark ? "text-slate-400" : "text-slate-500"}`}>
                  {card.description}
                </p>
              </div>
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  card.dark
                    ? "border border-slate-700 bg-slate-800 text-white group-hover:bg-white group-hover:text-slate-900"
                    : `bg-slate-100 text-slate-600 ${card.accent}`
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>
            </a>
          );
        })}
      </section>

      <section className="mt-6 grid grid-cols-12 gap-6">
        <div className="col-span-12 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <History className="h-[18px] w-[18px] text-slate-400" />
              Recent Data Ingests
            </h3>
            <a href="/upload" className="text-xs font-semibold text-sky-600 hover:underline">
              View File Explorer
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Dataset Focus
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Source File
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUploads.map((item) => {
                  const Icon = item.icon;

                  return (
                    <tr key={item.file} className="group cursor-pointer transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconTone}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-900 transition-colors group-hover:text-sky-600">
                            {item.focus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-[12px] text-slate-600">{item.file}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{item.time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold ${item.statusTone}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="relative col-span-12 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-slate-50 blur-3xl" />
          <div className="relative z-10 mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-[18px] w-[18px] text-slate-400" />
              Operational Intelligence
            </h3>
          </div>

          <div className="relative z-10 space-y-4">
            {reports.slice(0, 2).map((report, index) => (
              <a
                key={report.name}
                href="/reports"
                className="group flex items-start gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/30"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    index === 0
                      ? "border-sky-100 bg-sky-50 text-sky-600"
                      : "border-amber-100 bg-amber-50 text-amber-600"
                  }`}
                >
                  {index === 0 ? <FileOutput className="h-[18px] w-[18px]" /> : <Map className="h-[18px] w-[18px]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-sky-700">
                    {report.name}
                  </h4>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{report.summary}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-200" />
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-300" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {index === 0 ? "24H AGO" : "2D AGO"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
