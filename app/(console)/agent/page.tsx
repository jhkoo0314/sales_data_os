import { CompanySelectionRequired } from "@/components/company-selection-required";
import { AgentConsole } from "@/components/agent-console";
import { resolveSelectedCompanyKey } from "@/lib/server/console/company-context";
import { getAgentConsoleContext } from "@/lib/server/console/agent-context";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; run?: string }>;
}) {
  const params = await searchParams;
  const { companies, selectedCompanyKey } = await resolveSelectedCompanyKey(params.company);
  if (!selectedCompanyKey) {
    return <CompanySelectionRequired companies={companies} returnPath="/agent" />;
  }
  const context = await getAgentConsoleContext({
    companyKey: selectedCompanyKey,
    runKey: params.run,
  });

  return <AgentConsole initialContext={context} />;
}
