import { PipelineConsole } from "@/components/pipeline-console";
import { listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";

const DEFAULT_COMPANY_KEY = process.env.OPS_COMPANY_KEY?.trim() || "hangyeol_pharma";

export default async function PipelinePage() {
  const runs = await listPipelineRunSnapshots(DEFAULT_COMPANY_KEY, 12);

  return <PipelineConsole companyKey={DEFAULT_COMPANY_KEY} initialRuns={runs} />;
}
