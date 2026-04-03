import { CompanySelectionRequired } from "@/components/company-selection-required";
import { PipelineConsole } from "@/components/pipeline-console";
import { listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";
import { getPhase11CompanySnapshot, resolveSelectedCompanyKey } from "@/lib/server/console/company-context";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return <CompanySelectionRequired companies={companies} returnPath="/pipeline" />;
  }
  const [runs, snapshot] = await Promise.all([
    listPipelineRunSnapshots(selectedCompanyKey, 12),
    getPhase11CompanySnapshot(selectedCompanyKey),
  ]);

  return (
    <PipelineConsole
      companyKey={selectedCompanyKey}
      companyName={snapshot.company.companyName}
      intake={snapshot.intake}
      initialRuns={runs}
    />
  );
}
