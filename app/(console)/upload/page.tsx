import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, FolderOpen, UploadCloud } from "lucide-react";

import { CompanySelectionRequired } from "@/components/company-selection-required";
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

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return <CompanySelectionRequired companies={companies} returnPath="/upload" />;
  }
  const snapshot = await getPhase11CompanySnapshot(selectedCompanyKey);

  const recentFiles = snapshot.sources
    .flatMap((source) => source.files.map((file) => ({ source, file })))
    .sort((left, right) => right.file.updatedAt.localeCompare(left.file.updatedAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-slate-900">Upload Readiness</h1>
          <p className="text-[15px] text-slate-500">
            <span className="font-mono text-slate-700">{snapshot.company.companyKey}</span> 기준 입력 준비 상태와
            intake 판단을 보여줍니다.
          </p>
        </div>
        <Link href={withCompany("/pipeline", snapshot.company.companyKey)} className="primary-button flex items-center gap-2 px-6 py-3">
          Pipeline 이동
          <ArrowRight className="h-[18px] w-[18px]" />
        </Link>
      </section>

      <section className="relative overflow-hidden rounded-xl border border-sky-200 bg-sky-50/60 p-4">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-sky-500" />
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">공통 분석 구간</h3>
              <StatusBadge tone={intakeToneFromStatus(snapshot.intake?.status)}>
                {intakeLabelFromStatus(snapshot.intake?.status)}
              </StatusBadge>
            </div>
            <p className="text-[13px] text-slate-700">{formatAnalysisWindow(snapshot.intake)}</p>
            <p className="mt-1 text-[13px] text-slate-600">
              {snapshot.intake?.analysis_summary_message ??
                "아직 intake 결과가 없어서 공통 분석 구간을 설명할 수 없습니다."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Source Validation Matrix</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {snapshot.sources.map((source) => {
              const packageInfo = snapshot.intake?.packages.find((item) => item.source_key === source.sourceKey);
              const tone = intakeToneFromStatus(packageInfo?.status);
              const statusText = packageInfo
                ? packageInfo.status === "ready"
                  ? "바로 사용 가능"
                  : packageInfo.status === "ready_with_fixes"
                    ? "자동 보정 후 사용 가능"
                    : packageInfo.status === "needs_review"
                      ? "사람 확인 필요"
                      : "입력 부족으로 차단"
                : source.exists
                  ? "업로드는 있지만 intake 결과가 없습니다."
                  : "아직 업로드되지 않았습니다.";

              return (
                <div key={source.sourceKey} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold leading-tight text-slate-900">{source.label}</h3>
                      <p className="mt-1 font-mono text-[11px] text-slate-400">{source.sourceKey}</p>
                    </div>
                    <StatusBadge tone={tone}>{packageInfo ? packageInfo.status : source.exists ? "UPLOADED" : "EMPTY"}</StatusBadge>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-bold text-slate-900">{statusText}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {packageInfo?.findings[0] ??
                          packageInfo?.fixes[0] ??
                          (source.supportsMonthlyUpload
                            ? "월별 업로드와 일반 업로드를 함께 관리할 수 있는 source입니다."
                            : "기준 마스터 source로 한 번 올라오면 계속 재사용합니다.")}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-slate-100 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">최근 업로드</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">{formatDateTime(source.latestUploadedAt)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">행 수</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {packageInfo?.row_count ? packageInfo.row_count.toLocaleString("ko-KR") : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 p-3 text-xs text-slate-500">
                      <p>
                        업로드 방식:{" "}
                        <span className="font-semibold text-slate-700">
                          {source.supportsMonthlyUpload ? "일반 + 월별 업로드 지원" : "일반 업로드만 지원"}
                        </span>
                      </p>
                      <p className="mt-1">
                        현재 파일 수: <span className="font-semibold text-slate-700">{source.files.length}</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Verdict</h3>
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/20 blur-3xl" />
            <div className="relative z-10 space-y-5">
              <StatusBadge tone={intakeToneFromStatus(snapshot.intake?.status)}>
                {intakeLabelFromStatus(snapshot.intake?.status)}
              </StatusBadge>
              <p className="text-xl font-medium leading-relaxed tracking-tight text-white">
                {snapshot.intake?.ready_for_adapter
                  ? "필수 입력은 다음 단계로 넘길 수 있습니다. 다만 자동 보정 내역은 같이 확인하는 것이 좋습니다."
                  : "아직 사람 확인이 필요한 입력이 있어 바로 실행 단계로 넘기면 안 됩니다."}
              </p>
              <div className="space-y-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-sm text-slate-300">
                <p>{snapshot.intake?.analysis_summary_message ?? "intake 요약 문장이 아직 없습니다."}</p>
                <p>
                  자동 보정 {snapshot.intake?.fixes.length ?? 0}건 · 검토 항목 {snapshot.intake?.findings.length ?? 0}건
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              {snapshot.intake?.ready_for_adapter ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <h3 className="text-sm font-bold text-slate-900">다음 행동 안내</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                {snapshot.intake?.ready_for_adapter
                  ? "지금은 Pipeline에서 run을 접수할 수 있습니다. 다만 자동 보정 내역이 많은 source는 운영 검토를 같이 보는 것이 안전합니다."
                  : "먼저 아래 검토 항목을 보고, 누락된 의미 컬럼이나 source 구성을 보완해야 합니다."}
              </p>
              {(snapshot.intake?.findings ?? []).slice(0, 3).map((finding) => (
                <div key={finding} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-amber-900">
                  {finding}
                </div>
              ))}
              {snapshot.intake?.findings.length ? null : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  현재 intake 기준 대표 경고는 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FolderOpen className="h-[18px] w-[18px] text-slate-400" />
            최근 업로드 파일
          </h2>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <UploadCloud className="h-4 w-4" />
            {snapshot.company.companyKey}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Upload Time</th>
                <th className="px-6 py-4 text-right">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-[13px] font-medium text-slate-600">
              {recentFiles.length > 0 ? (
                recentFiles.map(({ source, file }) => {
                  const packageInfo = snapshot.intake?.packages.find((item) => item.source_key === source.sourceKey);
                  return (
                    <tr key={file.relativePath} className="group transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-[12px] text-slate-900">{file.name}</td>
                      <td className="px-6 py-4">
                        <div>{source.label}</div>
                        <div className="mt-1 font-mono text-[11px] text-slate-400">{source.sourceKey}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{formatDateTime(file.updatedAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge tone={intakeToneFromStatus(packageInfo?.status)}>
                          {packageInfo ? intakeLabelFromStatus(packageInfo.status) : "UPLOADED"}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-slate-500">
                    아직 업로드된 파일이 없습니다. source 파일을 올린 뒤 intake 결과를 다시 확인해 주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
