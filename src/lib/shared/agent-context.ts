import type { RadarContext } from "@/lib/shared/radar-context";
import type { RunDetailContext } from "@/lib/shared/run-detail-context";

export type AgentRunOption = {
  runKey: string;
  label: string;
  statusLabel: string;
  tone: "ready" | "running" | "pass" | "warn" | "fail" | "approved" | "generated";
};

export type AgentEvidenceLink = {
  label: string;
  description: string;
  href: string;
};

export type AgentQuickPrompt = {
  id: string;
  label: string;
  question: string;
};

export type AgentConsoleContext = {
  companyKey: string;
  companyName: string;
  selectedRunKey: string | null;
  executionMode: string | null;
  runStatusLabel: string | null;
  runExplanation: string;
  recentRuns: AgentRunOption[];
  quickPrompts: AgentQuickPrompt[];
  detail: RunDetailContext;
  radar: RadarContext | null;
  evidenceLinks: AgentEvidenceLink[];
};

export type AgentAnswerSection = {
  title: string;
  detail: string;
  href?: string | null;
};

export type AgentAnswer = {
  summary: string;
  evidence: AgentAnswerSection[];
  nextActions: string[];
  caveats: string[];
  modelName: string;
};

export type AgentChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: AgentAnswer;
};
