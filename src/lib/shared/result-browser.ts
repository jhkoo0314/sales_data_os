export type ResultFileTone = "pass" | "warn" | "fail" | "approved" | "ready";

import type { RadarContext } from "@/lib/shared/radar-context";

export type ReportCardItem = {
  key: string;
  title: string;
  summary: string;
  status: string;
  tone: ResultFileTone;
  updatedAt: string;
  relativePath: string;
  fileName: string;
};

export type ArtifactListItem = {
  key: string;
  fileName: string;
  stage: string;
  format: string;
  updatedAt: string;
  sizeLabel: string;
  status: string;
  tone: ResultFileTone;
  summary: string;
  relativePath: string;
};

export type ResultBrowserContext = {
  latestRunKey: string | null;
  latestRunStatus: string | null;
  companyName: string;
  reports: ReportCardItem[];
  artifacts: ArtifactListItem[];
  radar: RadarContext;
};
