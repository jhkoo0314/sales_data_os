export type RadarTone = "pass" | "warn" | "fail" | "approved" | "ready";

export type RadarEvidenceItem = {
  label: string;
  value: string;
};

export type RadarDecisionOption = {
  code: string;
  label: string;
  description: string;
  style: string;
};

export type RadarSignalSummary = {
  signalId: string;
  signalType: string;
  title: string;
  message: string;
  severity: string;
  tone: RadarTone;
  priorityScore: number | null;
  priorityLabel: string;
  possibleExplanations: string[];
  decisionOptions: RadarDecisionOption[];
  evidence: RadarEvidenceItem[];
};

export type RadarScopeHighlight = {
  label: string;
  summary: string;
};

export type RadarContext = {
  sourceType: "radar_result_asset" | "missing";
  status: string | null;
  tone: RadarTone;
  signalCount: number;
  topIssue: string | null;
  summaryText: string;
  runId: string | null;
  periodValue: string | null;
  generatedAt: string | null;
  qualityScore: number | null;
  signals: RadarSignalSummary[];
  scopeHighlights: RadarScopeHighlight[];
};
