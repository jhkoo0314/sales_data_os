import Link from "next/link";
import { Copy, Download, FileJson, FolderSearch } from "lucide-react";

import { CompanySelectionRequired } from "@/components/company-selection-required";
import { StatusBadge } from "@/components/status-badge";
import { resolveSelectedCompanyKey } from "@/lib/server/console/company-context";
import { getResultBrowserContext } from "@/lib/server/console/result-browser";

function withCompany(href: string, companyKey: string) {
  return `${href}?company=${encodeURIComponent(companyKey)}`;
}

export default async function ArtifactsPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return <CompanySelectionRequired companies={companies} returnPath="/artifacts" />;
  }
  const context = await getResultBrowserContext(selectedCompanyKey);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute bottom-0 right-0 top-0 z-0 flex w-64 items-center justify-center border-l border-slate-100 bg-slate-50 p-6 text-center">
          <span className="rotate-12 text-8xl text-slate-200">⌕</span>
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
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Artifacts</p>
            <p className="text-[14px] font-bold text-slate-800">{context.artifacts.length}개 표시 중</p>
            <p className="mt-1 text-[11px] text-slate-500">상위 결과 파일만 정리</p>
          </div>
        </div>
      </section>

      <section>
        <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">Operational Artifacts</h1>
        <p className="max-w-3xl border-l-2 border-sky-500 pl-3 text-sm font-medium text-slate-500">
          이 화면은 내부 검토용 산출물만 모아 보여줍니다. 중간 계산을 다시 만들지 않고, 이미 저장된 결과 파일만 읽습니다.
        </p>
      </section>

      <section className="space-y-4">
        {context.artifacts.length > 0 ? (
          context.artifacts.map((artifact) => (
            <div
              key={artifact.key}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
            >
              <div className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600 shadow-inner">
                  {artifact.format}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {artifact.stage}
                    </span>
                    <span className="font-mono text-[10px] font-medium text-slate-400">{artifact.updatedAt}</span>
                    <span className="text-[10px] font-medium text-slate-400">• Size: {artifact.sizeLabel}</span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-mono text-[15px] font-bold text-slate-900 transition-colors group-hover:text-sky-600">
                        {artifact.fileName}
                      </h4>
                      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{artifact.summary}</p>
                      <p className="mt-2 font-mono text-[11px] text-slate-400">{artifact.relativePath}</p>
                    </div>
                    <StatusBadge tone={artifact.tone}>{artifact.status}</StatusBadge>
                  </div>
                </div>

                <div className="ml-4 flex shrink-0 flex-col gap-2 border-l border-slate-100 pl-4">
                  <a
                    href={`/api/companies/${encodeURIComponent(selectedCompanyKey)}/files?path=${encodeURIComponent(artifact.relativePath)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    <FileJson className="h-4 w-4" />
                    View
                  </a>
                  <div className="flex gap-2">
                    <a
                      href={`/api/companies/${encodeURIComponent(selectedCompanyKey)}/files?path=${encodeURIComponent(artifact.relativePath)}&download=1`}
                      className="flex flex-1 items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
                      title="Download File"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      disabled
                      className="flex flex-1 items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-600"
                      title="Copy Path"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            아직 보여줄 artifact가 없습니다. Pipeline 실행 후 validation/builder 결과를 먼저 확인해 주세요.
          </div>
        )}
      </section>

      <section className="flex justify-end">
        <Link
          href={withCompany("/reports", selectedCompanyKey)}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
        >
          Reports로 이동
        </Link>
      </section>

      <div className="border-t border-slate-200 pb-4 pt-8 text-center">
        <p className="text-[11px] tracking-wide text-slate-400">
          END OF ARTIFACT LIST FOR {context.latestRunKey ?? selectedCompanyKey}
        </p>
      </div>
    </div>
  );
}
