export type IntakeStatus = "ready" | "ready_with_fixes" | "needs_review" | "blocked";

export type IntakePackageSnapshot = {
  source_key: string;
  label: string;
  required: boolean;
  status: IntakeStatus;
  row_count: number;
  missing_required_fields: string[];
  findings: string[];
  fixes: string[];
  period_coverage: {
    start_month: string;
    end_month: string;
    month_count: number;
  } | null;
};

export type IntakeSnapshot = {
  company_key: string;
  status: IntakeStatus;
  ready_for_adapter: boolean;
  analysis_start_month: string | null;
  analysis_end_month: string | null;
  analysis_month_count: number | null;
  analysis_summary_message: string | null;
  findings: string[];
  fixes: string[];
  suggestions: string[];
  packages: IntakePackageSnapshot[];
  analyzed_at: string | null;
};

export function intakeToneFromStatus(status: IntakeStatus | null | undefined) {
  if (!status) {
    return "ready" as const;
  }
  if (status === "blocked") {
    return "fail" as const;
  }
  if (status === "needs_review") {
    return "warn" as const;
  }
  if (status === "ready_with_fixes") {
    return "approved" as const;
  }
  return "pass" as const;
}

export function intakeLabelFromStatus(status: IntakeStatus | null | undefined) {
  if (!status) {
    return "NO INTAKE";
  }
  if (status === "blocked") {
    return "BLOCKED";
  }
  if (status === "needs_review") {
    return "REVIEW";
  }
  if (status === "ready_with_fixes") {
    return "READY WITH FIXES";
  }
  return "READY";
}

export function formatAnalysisWindow(intake: IntakeSnapshot | null) {
  if (!intake?.analysis_start_month || !intake.analysis_end_month) {
    return "공통 분석 구간을 아직 계산하지 못했습니다.";
  }

  if (intake.analysis_start_month === intake.analysis_end_month) {
    return `${intake.analysis_start_month} 단일 월 기준입니다.`;
  }

  return `${intake.analysis_start_month} ~ ${intake.analysis_end_month} (${intake.analysis_month_count ?? 0}개월)`;
}
