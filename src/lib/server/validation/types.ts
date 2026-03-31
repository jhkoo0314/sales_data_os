export type ValidationStatus = "PASS" | "WARN" | "FAIL" | "APPROVED" | "SKIP";

export type ValidationModuleKey = "crm" | "sandbox" | "prescription" | "territory" | "radar";

export type ValidationEvidenceItem = {
  key: string;
  value: string | number;
  note?: string;
};

export type ModuleValidationSummary = {
  module: ValidationModuleKey;
  quality_status: ValidationStatus;
  quality_score: number;
  reasoning_note: string;
  interpreted_reason?: string;
  next_modules: string[];
  gate_details: Record<string, unknown>;
  evidence: ValidationEvidenceItem[];
  evaluated_at: string;
  summary_path: string;
};

export type ValidationRunSummary = {
  company_key: string;
  run_id: string;
  overall_status: ValidationStatus;
  overall_score: number;
  evaluated_at: string;
  steps: Array<{
    step: ValidationModuleKey;
    status: ValidationStatus;
    reasoning_note: string;
    summary_path: string;
  }>;
  summary_by_module: Record<string, ModuleValidationSummary>;
  recommended_actions: string[];
  pipeline_summary_path?: string;
  run_root?: string;
};
