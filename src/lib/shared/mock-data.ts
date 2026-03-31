export const runContext = {
  companyName: "Hangyeol Pharma",
  companyKey: "hangyeol_pharma",
  runId: "RUN-20260330-01",
  mode: "Unified Release",
  status: "warn" as const,
  statusLabel: "WARN",
  updatedAt: "2026-03-30 21:40"
};

export const workspaceStats = [
  {
    label: "Recent Uploads",
    value: "12",
    description: "기본 파일과 월별 raw 저장이 최근 7일 안에 갱신되었습니다."
  },
  {
    label: "Current Run",
    value: "4 / 7",
    description: "Validation Layer 단계까지 완료되었고 경고 사유가 수집되고 있습니다."
  },
  {
    label: "Reports Ready",
    value: "3",
    description: "CRM, Territory, Total Validation 보고서가 바로 열 수 있는 상태입니다."
  }
];

export const quickActions = [
  {
    tag: "Start",
    title: "Upload 검토",
    description: "기본 입력 파일과 월별 raw 상태를 확인합니다.",
    href: "/upload"
  },
  {
    tag: "Execute",
    title: "Pipeline 실행",
    description: "현재 입력 기준으로 어떤 실행 모드가 가능한지 확인합니다.",
    href: "/pipeline"
  },
  {
    tag: "Review",
    title: "Reports 확인",
    description: "최종 전달용 보고서 상태와 최근 생성 결과를 확인합니다.",
    href: "/reports"
  },
  {
    tag: "Investigate",
    title: "Run Detail 열기",
    description: "현재 run의 경고 사유와 근거 파일을 확인합니다.",
    href: `/runs/${runContext.runId}`
  }
];

export const pageSummaries = [
  {
    kicker: "Upload",
    title: "입력 준비 상태",
    description: "필수 파일, 월별 raw, 기간 차이, intake 해석 문장을 함께 보여줍니다.",
    href: "/upload"
  },
  {
    kicker: "Pipeline",
    title: "실행 관제",
    description: "실행 가능 여부, 현재 진행 단계, 다음 액션을 관제 화면처럼 보여줍니다.",
    href: "/pipeline"
  },
  {
    kicker: "Run Detail",
    title: "근거 기반 해석",
    description: "선택한 run의 단계별 판정과 evidence를 모아 보여줍니다.",
    href: `/runs/${runContext.runId}`
  }
];

export const uploadStatusCards = [
  {
    label: "General Uploads",
    value: "5 / 5",
    description: "기본 입력 파일은 모두 저장되었습니다."
  },
  {
    label: "Monthly Raw",
    value: "14 / 16",
    description: "2개 월 파일은 검토가 필요합니다."
  },
  {
    label: "Intake Verdict",
    value: "WARN",
    description: "기간 차이가 있지만 공통 분석 구간 기준 진행 가능"
  },
  {
    label: "Next Step",
    value: "Pipeline",
    description: "필수 저장은 끝났고 실행 검토 단계로 넘어갈 수 있습니다."
  }
];

export const savedFiles = [
  {
    name: "crm_master.xlsx",
    note: "영업 조직 기준 파일. 최신 버전 저장됨.",
    updatedAt: "2026-03-30 19:10",
    status: "pass" as const,
    statusLabel: "SAVED"
  },
  {
    name: "territory_assignment.xlsx",
    note: "담당자 배치 기준 파일. 일부 예외 레코드 포함.",
    updatedAt: "2026-03-30 19:18",
    status: "warn" as const,
    statusLabel: "REVIEW"
  },
  {
    name: "target_plan.xlsx",
    note: "목표 데이터 파일. 형식 정상.",
    updatedAt: "2026-03-30 18:54",
    status: "pass" as const,
    statusLabel: "SAVED"
  }
];

export const monthlyUploads = [
  {
    month: "2025-10",
    source: "Prescription",
    status: "pass" as const,
    statusLabel: "UPLOADED",
    note: "정상 저장"
  },
  {
    month: "2025-11",
    source: "Prescription",
    status: "pass" as const,
    statusLabel: "UPLOADED",
    note: "정상 저장"
  },
  {
    month: "2025-12",
    source: "Prescription",
    status: "warn" as const,
    statusLabel: "REVIEW",
    note: "행 수 급증 확인 필요"
  },
  {
    month: "2026-01",
    source: "Sales",
    status: "fail" as const,
    statusLabel: "INVALID",
    note: "파일 재업로드 필요"
  }
];

export const pipelineModes = [
  {
    title: "CRM → Sandbox",
    description: "매핑과 sandbox 결과를 우선 확인하는 빠른 점검 모드입니다.",
    status: "ready" as const,
    statusLabel: "READY"
  },
  {
    title: "Sandbox → HTML",
    description: "기존 sandbox 결과를 기반으로 HTML 보고서를 생성합니다.",
    status: "ready" as const,
    statusLabel: "READY"
  },
  {
    title: "CRM → PDF",
    description: "최종 전달용 PDF를 생성하는 배포 모드입니다.",
    status: "warn" as const,
    statusLabel: "CHECK INPUT"
  },
  {
    title: "통합 실행",
    description: "전체 단계 실행과 보고서 산출을 한 번에 진행합니다.",
    status: "approved" as const,
    statusLabel: "AVAILABLE"
  }
];

export const recentRun = {
  runId: "RUN-20260330-01",
  title: "Unified Release",
  status: "running" as const,
  statusLabel: "RUNNING",
  currentStep: "Validation Layer",
  completedSteps: 4,
  totalSteps: 7
};

export const pipelineSteps = [
  {
    title: "Intake",
    note: "필수 입력 저장 확인 완료",
    status: "pass" as const,
    statusLabel: "DONE"
  },
  {
    title: "KPI Core",
    note: "단일 소스 계산 완료",
    status: "pass" as const,
    statusLabel: "DONE"
  },
  {
    title: "Validation Layer",
    note: "담당자 배치 편차 검토 중",
    status: "running" as const,
    statusLabel: "LIVE"
  },
  {
    title: "Builder Output",
    note: "이전 단계 완료 후 생성 예정",
    status: "ready" as const,
    statusLabel: "WAITING"
  }
];

export const reports = [
  {
    name: "CRM Report",
    type: "Final Report",
    summary: "CRM 성과 및 validation 요약을 함께 보여주는 최종 보고서입니다.",
    status: "generated" as const,
    statusLabel: "GENERATED",
    generatedAt: "2026-03-30 22:18",
    runId: "RUN-20260330-01"
  },
  {
    name: "Territory Report",
    type: "Final Report",
    summary: "담당자 배치, 커버리지, 예외 지점을 운영 관점에서 정리한 보고서입니다.",
    status: "warn" as const,
    statusLabel: "WARNING",
    generatedAt: "2026-03-30 22:16",
    runId: "RUN-20260330-01"
  },
  {
    name: "Total Validation Report",
    type: "Decision Report",
    summary: "최종 판정과 검토 포인트를 한 번에 보는 종합 검증 보고서입니다.",
    status: "approved" as const,
    statusLabel: "AVAILABLE",
    generatedAt: "2026-03-30 22:20",
    runId: "RUN-20260330-01"
  }
];

export const artifacts = [
  {
    name: "crm_result_asset_202512.json",
    type: "Result Asset",
    module: "CRM",
    description: "Agent와 Run Detail이 직접 참고하는 구조화 결과 파일입니다.",
    status: "approved" as const,
    statusLabel: "PRIMARY",
    runId: "RUN-20260330-01",
    format: "JSON",
    size: "2.1 MB",
    createdAt: "2026-03-30 21:52"
  },
  {
    name: "validation_summary.json",
    type: "Validation Summary",
    module: "Validation Layer",
    description: "경고/실패 사유와 근거 수치를 담은 요약 파일입니다.",
    status: "generated" as const,
    statusLabel: "GENERATED",
    runId: "RUN-20260330-01",
    format: "JSON",
    size: "412 KB",
    createdAt: "2026-03-30 22:03"
  },
  {
    name: "mapping_exceptions.json",
    type: "Artifact",
    module: "Territory",
    description: "Territory 매핑 예외 레코드를 조사할 때 쓰는 운영용 파일입니다.",
    status: "warn" as const,
    statusLabel: "INVESTIGATE",
    runId: "RUN-20260330-01",
    format: "JSON",
    size: "664 KB",
    createdAt: "2026-03-30 22:05"
  }
];

export const runHistory = [
  {
    runId: "RUN-20260330-01",
    title: "Unified Release",
    mode: "Unified Release",
    status: "warn" as const,
    statusLabel: "WARN",
    executedAt: "2026-03-30 21:40"
  },
  {
    runId: "RUN-20260329-04",
    title: "CRM → Sandbox",
    mode: "CRM → Sandbox",
    status: "approved" as const,
    statusLabel: "APPROVED",
    executedAt: "2026-03-29 18:25"
  },
  {
    runId: "RUN-20260328-02",
    title: "CRM → PDF",
    mode: "CRM → PDF",
    status: "fail" as const,
    statusLabel: "FAIL",
    executedAt: "2026-03-28 20:08"
  }
];

export const runStepDetails = [
  {
    title: "Intake Review",
    description: "필수 기본 파일 저장과 공통 분석 구간 확인을 완료했습니다.",
    evidence: "intake_summary.json",
    status: "pass" as const,
    statusLabel: "PASS"
  },
  {
    title: "KPI Core Calculation",
    description: "KPI 단일 소스 계산을 완료했고 다음 단계 입력이 생성되었습니다.",
    evidence: "crm_result_asset_202512.json",
    status: "pass" as const,
    statusLabel: "PASS"
  },
  {
    title: "Validation Layer",
    description: "담당자 배치 불균형과 매핑 예외 증가가 경고로 기록되었습니다.",
    evidence: "validation_summary.json / mapping_exceptions.json",
    status: "warn" as const,
    statusLabel: "WARN"
  },
  {
    title: "Builder Preparation",
    description: "보고서 생성에 필요한 입력은 준비되었지만 경고 문구를 함께 전달해야 합니다.",
    evidence: "builder_input_payload.json",
    status: "approved" as const,
    statusLabel: "READY"
  }
];

export const quickPrompts = [
  "이번 WARN의 핵심 원인은 뭐야?",
  "어떤 result asset을 먼저 봐야 해?",
  "Validation 경고를 운영 관점에서 설명해줘"
];

export const agentEvidence = [
  {
    name: "crm_result_asset_202512.json",
    type: "Result Asset",
    reason: "핵심 KPI 결과와 기준값 비교에 직접 사용"
  },
  {
    name: "validation_summary.json",
    type: "Validation Summary",
    reason: "현재 WARN 사유와 단계별 상태 해석에 사용"
  },
  {
    name: "Territory Report",
    type: "Report",
    reason: "담당자 배치 불균형을 사람이 읽기 쉽게 정리한 근거"
  }
];

export const agentHistory = [
  {
    question: "어떤 artifact를 먼저 봐야 해?",
    answer: "먼저 mapping_exceptions.json을 열고 예외 레코드가 특정 팀에 몰려 있는지 확인하는 것이 좋습니다."
  },
  {
    question: "이 run에서 보고서 해석 전에 주의할 점은 뭐야?",
    answer: "Territory Report는 볼 수 있지만, 매핑 예외가 남아 있으므로 최종 확정 전 운영 검토가 필요합니다."
  }
];
