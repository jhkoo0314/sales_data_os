import type { ValidationModuleKey, ValidationStatus } from "@/lib/server/validation/types";

export type BuilderModuleKey = ValidationModuleKey;

export type BuilderTemplateKey =
  | "crm_analysis"
  | "sandbox_report"
  | "territory_optimizer"
  | "prescription_flow"
  | "radar_report";

export type BuilderPayloadStandard = {
  schema_version: string;
  payload_type: "builder_payload_standard";
  module: BuilderModuleKey;
  template_key: BuilderTemplateKey;
  report_title: string;
  output_name: string;
  quality_status: ValidationStatus;
  company_key: string;
  run_id: string;
  generated_at: string;
  period: {
    months: string[];
    start_month: string | null;
    end_month: string | null;
    label: string;
  };
  source_paths: {
    result_asset_path: string;
    validation_summary_path: string;
  };
  common_payload: {
    company_key: string;
    run_id: string;
    report_title: string;
    template_key: BuilderTemplateKey;
    template_path: string;
    overall_status: ValidationStatus;
    module_status: ValidationStatus;
    generated_at: string;
  };
  template_payload: Record<string, unknown>;
  asset_manifest: Array<{
    asset_type: string;
    path: string;
    note?: string;
  }>;
  payload_path?: string;
};

export type BuilderInputStandard = {
  schema_version: string;
  input_type: "builder_input_standard";
  module: BuilderModuleKey;
  template_key: BuilderTemplateKey;
  template_path: string;
  output_name: string;
  report_title: string;
  company_key: string;
  run_id: string;
  payload_path: string;
  source_result_asset_path: string;
  validation_summary_path: string;
  render_mode: "preview";
};

export type BuilderPayloadRunResult = {
  company_key: string;
  run_id: string;
  generated_at: string;
  overall_status: ValidationStatus;
  builder_root: string;
  payload_index_path: string;
  module_payloads: Array<{
    module: BuilderModuleKey;
    template_key: BuilderTemplateKey;
    quality_status: ValidationStatus;
    payload_path: string;
    input_standard_path: string;
    summary: string;
  }>;
  summary_message: string;
};

export type BuilderPreviewResultAsset = {
  schema_version: string;
  asset_type: "builder_preview_result_asset";
  module: BuilderModuleKey;
  template_key: BuilderTemplateKey;
  report_title: string;
  company_key: string;
  run_id: string;
  generated_at: string;
  quality_status: ValidationStatus;
  html_path: string;
  payload_standard_path: string;
  input_standard_path: string;
};

export type BuilderRenderRunResult = {
  company_key: string;
  run_id: string;
  generated_at: string;
  overall_status: ValidationStatus;
  builder_root: string;
  reports: Array<{
    module: BuilderModuleKey;
    report_type: BuilderTemplateKey;
    report_title: string;
    html_path: string;
    payload_standard_path: string;
    input_standard_path: string;
    result_asset_path: string;
    quality_status: ValidationStatus;
  }>;
  summary_message: string;
};
