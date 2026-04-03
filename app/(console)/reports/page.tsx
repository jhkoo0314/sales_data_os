import Link from "next/link";
import { Activity, Download, ExternalLink, FileOutput, ShieldAlert, Zap } from "lucide-react";

import { CompanySelectionRequired } from "@/components/company-selection-required";
import { StatusBadge } from "@/components/status-badge";
import { resolveSelectedCompanyKey } from "@/lib/server/console/company-context";
import { getResultBrowserContext } from "@/lib/server/console/result-browser";

function withCompany(href: string, companyKey: string) {
  return `${href}?company=${encodeURIComponent(companyKey)}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return <CompanySelectionRequired companies={companies} returnPath="/reports" />;
  }
  const context = await getResultBrowserContext(selectedCompanyKey);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute bottom-0 right-0 top-0 z-0 flex w-64 items-center justify-center border-l border-slate-100 bg-slate-50 p-6 text-center">
          <span className="rotate-12 text-8xl text-slate-200">◫</span>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-10">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Workspace</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{context.companyName}</h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500">{selectedCompanyKey}</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Latest Run</p>
            <h3 className="font-mono text-xl font-bold text-sky-600">{context.latestRunKey ?? "run 없음"}</h3>
            <p className="mt-1 text-[11px] text-slate-500">{context.latestRunStatus ?? "실행 기록 없음"}</p>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Reports</p>
            <p className="text-[14px] font-bold text-slate-800">{context.reports.length}개 준비됨</p>
            <p className="mt-1 text-[11px] text-slate-500">builder preview 기준</p>
          </div>
        </div>
      </section>

      <section>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">Final Deliverable Reports</h1>
        <p className="max-w-4xl border-l-2 border-sky-500 pl-3 text-sm font-medium text-slate-500">
          이 화면은 실제 builder 결과를 바탕으로, 사람이 바로 열어볼 수 있는 보고서만 모아 보여줍니다.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-[18px] w-[18px] text-slate-400" />
              RADAR Priority
            </h2>
            {context.radar.status ? <StatusBadge tone={context.radar.tone}>{context.radar.status}</StatusBadge> : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {context.radar.topIssue ?? "가장 먼저 볼 신호가 아직 없습니다."}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{context.radar.summaryText}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Signals</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{context.radar.signalCount}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Run</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{context.radar.runId ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Period</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{context.radar.periodValue ?? "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Zap className="h-[18px] w-[18px] text-slate-400" />
              What To Check First
            </h2>
          </div>

          {context.radar.signals.length > 0 ? (
            <div className="space-y-4">
              {context.radar.signals.slice(0, 2).map((signal) => (
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
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{signal.message}</p>

                  {signal.decisionOptions.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {signal.decisionOptions.map((option) => (
                        <div key={`${signal.signalId}-${option.code}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
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
              아직 보여줄 RADAR 신호가 없습니다. 이 경우 억지 요약을 만들지 않고 빈 상태로 둡니다.
            </div>
          )}
        </div>
      </section>

      {context.radar.scopeHighlights.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
            <ShieldAlert className="h-[18px] w-[18px] text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">RADAR Scope Highlights</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {context.radar.scopeHighlights.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{item.summary}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {context.reports.length > 0 ? (
          context.reports.map((report) => (
            <div
              key={report.key}
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-sky-300 hover:shadow-md"
            >
              <div className="flex-1 border-b border-slate-100 p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-100 bg-sky-50 text-sky-600">
                    <FileOutput className="h-5 w-5" />
                  </div>
                  <StatusBadge tone={report.tone}>{report.status}</StatusBadge>
                </div>
                <h4 className="mb-2 text-lg font-extrabold text-slate-900 transition-colors group-hover:text-sky-600">
                  {report.title}
                </h4>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">{report.summary}</p>
                <div className="flex flex-col gap-1 text-[11px] text-slate-500">
                  <p>
                    <span className="font-semibold uppercase tracking-wider text-slate-700">FILE:</span> {report.fileName}
                  </p>
                  <p>
                    <span className="font-semibold uppercase tracking-wider text-slate-700">UPDATED:</span> {report.updatedAt}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
                <a
                  href={`/api/companies/${encodeURIComponent(selectedCompanyKey)}/files?path=${encodeURIComponent(report.relativePath)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-sm font-bold text-slate-800 shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <ExternalLink className="h-[18px] w-[18px]" />
                  Open
                </a>
                <a
                  href={`/api/companies/${encodeURIComponent(selectedCompanyKey)}/files?path=${encodeURIComponent(report.relativePath)}&download=1`}
                  className="flex w-12 items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-slate-600 shadow-sm hover:bg-slate-100"
                >
                  <Download className="h-[18px] w-[18px]" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            아직 builder 보고서가 없습니다. 먼저 Pipeline 실행과 Builder 완료 여부를 확인해 주세요.
          </div>
        )}
      </section>

      <section className="flex justify-end">
        <Link
          href={withCompany("/artifacts", selectedCompanyKey)}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
        >
          Artifacts로 이동
        </Link>
      </section>
    </div>
  );
}
