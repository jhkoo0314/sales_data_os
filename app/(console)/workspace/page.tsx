import Link from "next/link";
import { Activity, ArrowRight, FileOutput, GitBranchPlus, History, Map, Upload } from "lucide-react";

import { CompanySelectionRequired } from "@/components/company-selection-required";
import { CompanyRegistryPanel } from "@/components/company-registry-panel";
import { StatusBadge } from "@/components/status-badge";
import {
  formatAnalysisWindow,
  getPhase11CompanySnapshot,
  intakeLabelFromStatus,
  intakeToneFromStatus,
  resolveSelectedCompanyKey,
} from "@/lib/server/console/company-context";

function withCompany(href: string, companyKey: string) {
  return `${href}?company=${encodeURIComponent(companyKey)}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "기록 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return (
      <CompanySelectionRequired
        companies={companies}
        returnPath="/workspace"
        title="작업할 회사를 선택해 주세요"
        description="이 프로젝트는 회사별 company_key 문맥으로 동작합니다. 아래에서 회사를 선택하면 그 회사 기준으로 Upload, Pipeline, Reports를 계속 보게 됩니다."
      />
    );
  }
  const snapshot = await getPhase11CompanySnapshot(selectedCompanyKey);

  const latestRun = snapshot.recentRuns[0] ?? null;
  const requiredPackages = snapshot.intake?.packages.filter((item) => item.required) ?? [];
  const readyPackages = requiredPackages.filter((item) => item.status === "ready" || item.status === "ready_with_fixes");
  const recentUploads = snapshot.sources
    .flatMap((source) => source.files.map((file) => ({ source, file })))
    .sort((left, right) => right.file.updatedAt.localeCompare(left.file.updatedAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="eyebrow">Phase 11 Workspace</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">운영 진입 화면</h1>
          <p className="mt-2 text-sm text-slate-500">
            현재 선택 회사는 <span className="font-mono text-slate-700">{snapshot.company.companyKey}</span> 입니다.
            업로드 준비 상태와 최근 실행 흐름을 한 번에 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={withCompany("/upload", snapshot.company.companyKey)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:text-slate-900"
          >
            <Upload className="h-[18px] w-[18px]" />
            Upload 확인
          </Link>
          <Link
            href={withCompany("/pipeline", snapshot.company.companyKey)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-slate-800"
          >
            <GitBranchPlus className="h-[18px] w-[18px]" />
            Pipeline 이동
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="pointer-events-none absolute right-[-4rem] top-[-4rem] h-64 w-64 rounded-full bg-sky-50 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-2xl font-bold text-white shadow-lg">
                  {snapshot.company.companyName.slice(0, 1)}
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      {snapshot.company.companyName}
                    </h2>
                    <StatusBadge tone={intakeToneFromStatus(snapshot.intake?.status)}>
                      {intakeLabelFromStatus(snapshot.intake?.status)}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {snapshot.intake?.analysis_summary_message ??
                      "아직 intake 결과가 없어 업로드와 입력 검토를 먼저 확인해야 합니다."}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Common Window</p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">{formatAnalysisWindow(snapshot.intake)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 md:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">업로드 source</p>
                <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                  {snapshot.sources.filter((item) => item.exists).length}/{snapshot.sources.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">현재 raw 파일이 있는 source 수</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">필수 입력 준비</p>
                <p className="mt-2 font-mono text-2xl font-bold text-slate-900">
                  {readyPackages.length}/{requiredPackages.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">필수 source 기준 다음 단계 준비 수</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">최근 run</p>
                <p className="mt-2 font-mono text-sm font-bold text-slate-900">{latestRun?.runKey ?? "없음"}</p>
                <p className="mt-1 text-xs text-slate-500">{latestRun?.statusLabel ?? "아직 실행 전"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">다음 행동</p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {snapshot.intake?.ready_for_adapter ? "Pipeline 실행 가능" : "Upload 검토 필요"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {snapshot.intake?.ready_for_adapter
                    ? "worker 대기열로 run을 접수할 수 있습니다."
                    : "누락 항목과 검토 사유를 먼저 확인해야 합니다."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <CompanyRegistryPanel
          companies={companies}
          returnPath="/workspace"
          selectedCompanyKey={snapshot.company.companyKey}
          title="회사 선택"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          {
            title: "Upload Matrix",
            description: "필수 파일과 월별 업로드 현황을 확인합니다.",
            href: withCompany("/upload", snapshot.company.companyKey),
            icon: Upload,
          },
          {
            title: "Run Pipeline",
            description: "실행 가능 여부와 run 접수 상태를 확인합니다.",
            href: withCompany("/pipeline", snapshot.company.companyKey),
            icon: GitBranchPlus,
          },
          {
            title: "Latest Run",
            description: latestRun ? latestRun.explanation : "아직 run이 없어 Upload와 Pipeline 확인이 먼저입니다.",
            href: latestRun
              ? `/runs/${latestRun.runKey}?company=${encodeURIComponent(snapshot.company.companyKey)}`
              : withCompany("/pipeline", snapshot.company.companyKey),
            icon: Map,
          },
          {
            title: "Reports & Output",
            description: "최종 보고서와 산출물 확인 단계입니다.",
            href: withCompany("/reports", snapshot.company.companyKey),
            icon: FileOutput,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-sky-300 hover:bg-sky-50/30"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{card.description}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors group-hover:bg-sky-100 group-hover:text-sky-700">
                <Icon className="h-[18px] w-[18px]" />
              </div>
            </Link>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <History className="h-[18px] w-[18px] text-slate-400" />
              최근 업로드 파일
            </h3>
            <Link href={withCompany("/upload", snapshot.company.companyKey)} className="text-xs font-semibold text-sky-600 hover:underline">
              Upload 자세히 보기
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">파일</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">업로드 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUploads.length > 0 ? (
                  recentUploads.map(({ source, file }) => (
                    <tr key={file.relativePath} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{source.label}</td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-[12px] text-slate-600">{file.name}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{source.sourceKey}</div>
                      </td>
                      <td className="px-6 py-4 text-[12px] text-slate-500">{formatDateTime(file.updatedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-slate-500">
                      아직 업로드된 파일이 없습니다. 먼저 Upload 화면에서 source 파일을 올려야 합니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Activity className="h-[18px] w-[18px] text-slate-400" />
              운영 해석
            </h3>
            {latestRun ? <StatusBadge tone={latestRun.tone}>{latestRun.statusLabel}</StatusBadge> : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Intake Summary</p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                {snapshot.intake?.analysis_summary_message ??
                  "아직 intake 결과가 저장되지 않았습니다. 업로드 후 입력 검토를 먼저 실행해야 합니다."}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">실행 판단</p>
              <p className="mt-2 text-sm font-bold text-slate-900">
                {snapshot.intake?.ready_for_adapter
                  ? "필수 입력이 준비되어 Pipeline으로 넘어갈 수 있습니다."
                  : "검토가 필요한 입력이 있어 바로 실행하면 안 됩니다."}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {snapshot.intake?.findings[0] ??
                  latestRun?.explanation ??
                  "현재 회사의 가장 먼저 볼 항목은 Upload 상태와 공통 분석 구간입니다."}
              </p>
            </div>

            <Link
              href={withCompany(snapshot.intake?.ready_for_adapter ? "/pipeline" : "/upload", snapshot.company.companyKey)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-900 px-4 py-4 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              <span>{snapshot.intake?.ready_for_adapter ? "Pipeline으로 이동" : "Upload 검토로 이동"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
