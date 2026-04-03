import type { RadarContext } from "@/lib/shared/radar-context";

export type RunModuleStatusTone = "pass" | "warn" | "fail" | "approved" | "ready";

export type RunEvidenceItem = {
  label: string;
  value: string;
};

export type RunModuleSummary = {
  moduleKey: string;
  moduleLabel: string;
  status: string;
  tone: RunModuleStatusTone;
  score: number | null;
  summaryText: string;
  evidence: RunEvidenceItem[];
  nextModules: string[];
};

export type RunBuilderSummary = {
  builtReportCount: number;
  skippedReports: string[];
  reportNames: string[];
};

export type RunDetailContext = {
  sourceType: "pipeline_validation_summary" | "module_validation_files" | "missing";
  overallStatus: string | null;
  overallScore: number | null;
  totalDurationMs: number | null;
  overallSummary: string;
  modules: RunModuleSummary[];
  builder: RunBuilderSummary | null;
  radar: RadarContext | null;
  nextActions: string[];
};
