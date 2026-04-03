import type { CompanyOverview } from "@/lib/shared/company-overview";
import { getPhase11CompanySnapshot, listCompanyOptions } from "@/lib/server/console/company-context";
import { getResultBrowserContext } from "@/lib/server/console/result-browser";

export async function getCompanyOverview(companyKey: string): Promise<CompanyOverview> {
  const [snapshot, browser] = await Promise.all([
    getPhase11CompanySnapshot(companyKey),
    getResultBrowserContext(companyKey),
  ]);

  const uploadedSourceCount = snapshot.sources.filter((item) => item.exists).length;
  const latestRun = snapshot.recentRuns[0] ?? null;

  return {
    companyKey: snapshot.company.companyKey,
    companyName: snapshot.company.companyName,
    companyStatus: snapshot.company.status,
    intakeStatus: snapshot.intake?.status ?? null,
    readyForAdapter: Boolean(snapshot.intake?.ready_for_adapter),
    uploadedSourceCount,
    totalSourceCount: snapshot.sources.length,
    latestRunKey: latestRun?.runKey ?? null,
    latestRunStatus: latestRun?.statusLabel ?? null,
    reportCount: browser.reports.length,
    artifactCount: browser.artifacts.length,
    nextAction: snapshot.intake?.ready_for_adapter
      ? "Pipeline에서 run을 접수할 수 있습니다."
      : snapshot.intake?.findings[0] ?? "Upload와 intake 결과를 먼저 확인해야 합니다.",
  };
}

export async function listCompanyOverviews(): Promise<CompanyOverview[]> {
  const companies = await listCompanyOptions();
  return Promise.all(companies.map((company) => getCompanyOverview(company.companyKey)));
}
