import { notFound } from "next/navigation";

import { CompanySelectionRequired } from "@/components/company-selection-required";
import { RunDetailConsole } from "@/components/run-detail-console";
import { listCompanyOptions } from "@/lib/server/console/company-context";
import { getRunDetailContext } from "@/lib/server/console/run-detail-context";
import { getPipelineRunSnapshot, listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ company?: string }>;
};
export default async function RunDetailPage({ params, searchParams }: RunDetailPageProps) {
  const { runId } = await params;
  const query = await searchParams;
  const companyKey = query.company?.trim() || null;
  if (!companyKey) {
    const companies = await listCompanyOptions();
    return <CompanySelectionRequired companies={companies} returnPath={`/runs/${runId}`} />;
  }
  const [selected, recentRuns, detail] = await Promise.all([
    getPipelineRunSnapshot(companyKey, runId),
    listPipelineRunSnapshots(companyKey, 12),
    getRunDetailContext(companyKey),
  ]);

  if (!selected) {
    notFound();
  }

  return (
    <RunDetailConsole
      companyKey={companyKey}
      initialRun={selected}
      initialRuns={recentRuns}
      initialDetail={detail}
    />
  );
}
