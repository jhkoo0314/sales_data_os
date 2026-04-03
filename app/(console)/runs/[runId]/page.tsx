import { notFound } from "next/navigation";

import { RunDetailConsole } from "@/components/run-detail-console";
import { getPipelineRunSnapshot, listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";

type RunDetailPageProps = {
  params: Promise<{ runId: string }>;
};

const DEFAULT_COMPANY_KEY = process.env.OPS_COMPANY_KEY?.trim() || "hangyeol_pharma";

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { runId } = await params;
  const [selected, recentRuns] = await Promise.all([
    getPipelineRunSnapshot(DEFAULT_COMPANY_KEY, runId),
    listPipelineRunSnapshots(DEFAULT_COMPANY_KEY, 12),
  ]);

  if (!selected) {
    notFound();
  }

  return (
    <RunDetailConsole
      companyKey={DEFAULT_COMPANY_KEY}
      initialRun={selected}
      initialRuns={recentRuns}
    />
  );
}
