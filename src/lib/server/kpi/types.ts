export type JsonRow = Record<string, string>;

export type StandardizedPayload = {
  company_key: string;
  source_key: string;
  module_key: string;
  standardized_at: string;
  row_count: number;
  schema_version: string;
  applied_fixes: string[];
  rows: JsonRow[];
};

export type CrmMetricSet = {
  hir: number;
  rtr: number;
  bcr: number;
  phr: number;
  nar: number;
  ahs: number;
  pv: number;
  fgr: number;
  pi: number;
  trg: number;
  swr: number;
  coach_score: number;
};

export type KpiRunStatus = "completed" | "completed_with_review" | "blocked";

export type KpiRunResult = {
  company_key: string;
  status: KpiRunStatus;
  normalization_status: string;
  validation_root: string;
  module_results: Array<{
    module: "crm" | "sandbox" | "prescription" | "territory" | "radar";
    status: "created" | "skipped";
    result_asset_path: string | null;
    row_count: number;
    summary: string;
  }>;
  generated_at: string;
  summary_message: string;
};

export type LookupRow = {
  accountId: string;
  accountName: string;
  repId: string;
  repName: string;
  branchId: string;
  branchName: string;
};

export type CrmActivityRecord = {
  metricMonth: string;
  activityDate: string;
  repId: string;
  repName: string;
  branchId: string;
  branchName: string;
  hospitalId: string;
  hospitalName: string;
  visitCount: number;
  hasDetailCall: boolean;
  trustLevel: string;
  sentimentScore: number | null;
  qualityFactor: number | null;
  impactFactor: number | null;
  activityWeight: number | null;
  weightedActivityScore: number | null;
  nextActionText: string;
  activityType: string;
};
