import { getPhase11CompanySnapshot, resolveSelectedCompanyKey } from "@/lib/server/console/company-context";
import { getRadarContext } from "@/lib/server/console/radar-context";
import { getResultBrowserContext } from "@/lib/server/console/result-browser";
import { getRunDetailContext } from "@/lib/server/console/run-detail-context";
import { getPipelineRunSnapshot, listPipelineRunSnapshots } from "@/lib/server/pipeline/run-monitor";
import type { AgentConsoleContext, AgentEvidenceLink, AgentQuickPrompt, AgentRunOption } from "@/lib/shared/agent-context";

function withCompany(href: string, companyKey: string) {
  return `${href}?company=${encodeURIComponent(companyKey)}`;
}

function withCompanyAndRun(href: string, companyKey: string, runKey: string | null) {
  if (!runKey) {
    return withCompany(href, companyKey);
  }
  return `${href}?company=${encodeURIComponent(companyKey)}&run=${encodeURIComponent(runKey)}`;
}

function buildQuickPrompts(runKey: string | null, hasWarnModule: boolean, radarTopIssue: string | null): AgentQuickPrompt[] {
  return [
    {
      id: "warn-cause",
      label: "왜 이런 상태인지",
      question: runKey
        ? `현재 run(${runKey})에서 왜 ${hasWarnModule ? "WARN" : "현재 상태"}가 나왔는지 쉽게 설명해줘.`
        : "현재 회사 기준으로 왜 지금 상태가 이렇게 보이는지 쉽게 설명해줘.",
    },
    {
      id: "what-first",
      label: "무엇부터 볼지",
      question: radarTopIssue
        ? `RADAR가 잡은 "${radarTopIssue}"를 기준으로 무엇부터 확인해야 하는지 순서대로 알려줘.`
        : "이 run에서 무엇을 먼저 확인해야 하는지 순서대로 알려줘.",
    },
    {
      id: "evidence-files",
      label: "어떤 근거를 볼지",
      question: "답변 근거로 어떤 validation, artifact, report를 봐야 하는지 파일 기준으로 정리해줘.",
    },
  ];
}

function buildEvidenceLinks(
  companyKey: string,
  runKey: string | null,
  context: {
    reports: Awaited<ReturnType<typeof getResultBrowserContext>>["reports"];
    artifacts: Awaited<ReturnType<typeof getResultBrowserContext>>["artifacts"];
    detail: Awaited<ReturnType<typeof getRunDetailContext>>;
  },
) {
  const links: AgentEvidenceLink[] = [];

  links.push({
    label: "Run Detail",
    description: "현재 run의 단계 상태와 validation 해석을 함께 봅니다.",
    href: runKey ? `/runs/${runKey}?company=${encodeURIComponent(companyKey)}` : withCompany("/runs", companyKey),
  });

  const radarModule = context.detail.modules.find((module) => module.moduleKey === "radar");
  if (radarModule) {
    links.push({
      label: "Reports",
      description: "RADAR 우선순위와 보고서 결과를 함께 확인합니다.",
      href: withCompanyAndRun("/reports", companyKey, runKey),
    });
  }

  for (const artifact of context.artifacts.slice(0, 4)) {
    links.push({
      label: artifact.fileName,
      description: `${artifact.stage} 근거 파일입니다.`,
      href: `/api/companies/${encodeURIComponent(companyKey)}/files?path=${encodeURIComponent(artifact.relativePath)}`,
    });
  }

  for (const report of context.reports.slice(0, 2)) {
    links.push({
      label: report.title,
      description: "최종 보고서 미리보기입니다.",
      href: `/api/companies/${encodeURIComponent(companyKey)}/files?path=${encodeURIComponent(report.relativePath)}`,
    });
  }

  return links.slice(0, 8);
}

function toRunOptions(runs: Awaited<ReturnType<typeof listPipelineRunSnapshots>>): AgentRunOption[] {
  return runs.map((run) => ({
    runKey: run.runKey,
    label: `${run.runKey} · ${run.executionMode}`,
    statusLabel: run.statusLabel,
    tone: run.tone,
  }));
}

export async function getAgentConsoleContext(input: {
  companyKey?: string | null;
  runKey?: string | null;
}): Promise<AgentConsoleContext> {
  const { selectedCompanyKey } = await resolveSelectedCompanyKey(input.companyKey ?? undefined);
  if (!selectedCompanyKey) {
    throw new Error("company_key가 없어 Agent 문맥을 만들 수 없습니다.");
  }
  const [companySnapshot, recentRuns, detail, resultBrowser, radar] = await Promise.all([
    getPhase11CompanySnapshot(selectedCompanyKey),
    listPipelineRunSnapshots(selectedCompanyKey, 12),
    getRunDetailContext(selectedCompanyKey),
    getResultBrowserContext(selectedCompanyKey),
    getRadarContext(selectedCompanyKey),
  ]);

  const selectedRun =
    input.runKey?.trim()
      ? await getPipelineRunSnapshot(selectedCompanyKey, input.runKey.trim())
      : recentRuns[0] ?? null;

  const hasWarnModule = detail.modules.some((module) => module.tone === "warn" || module.tone === "fail");

  return {
    companyKey: selectedCompanyKey,
    companyName: companySnapshot.company.companyName,
    selectedRunKey: selectedRun?.runKey ?? null,
    executionMode: selectedRun?.executionMode ?? null,
    runStatusLabel: selectedRun?.statusLabel ?? null,
    runExplanation: selectedRun?.explanation ?? "아직 선택된 run이 없어 회사 기준 결과만 보여줍니다.",
    recentRuns: toRunOptions(recentRuns),
    quickPrompts: buildQuickPrompts(selectedRun?.runKey ?? null, hasWarnModule, radar.topIssue),
    detail,
    radar,
    evidenceLinks: buildEvidenceLinks(selectedCompanyKey, selectedRun?.runKey ?? null, {
      reports: resultBrowser.reports,
      artifacts: resultBrowser.artifacts,
      detail,
    }),
  };
}
