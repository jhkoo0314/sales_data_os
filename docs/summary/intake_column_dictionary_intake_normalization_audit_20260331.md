# 컬럼 사전 · Intake · 정규화 조사 메모

작성일: 2026-03-31

## 우리 프로젝트 적용 기준

- 이 문서의 원본 조사 내용 중 `standardized`는 우리 프로젝트에서는 `standardized`로 읽는다.
- 이 문서의 원본 조사 내용 중 `validation`은 우리 프로젝트에서는 `validation`으로 읽는다.
- 이 문서의 원본 조사 내용 중 `COMPANY_SOURCE_ROOT`는 우리 프로젝트에서는 `COMPANY_SOURCE_ROOT` 같은 실행용 source root 문맥으로 읽는다.
- 원본 파일명이나 원본 절대경로는 증거 보존을 위해 그대로 남길 수 있지만, 실제 구현 경로 기준은 `data/standardized/*`, `data/validation/*`를 사용한다.

## 1. 한 줄 결론

이 프로젝트는 현재 **엄격 차단형 intake보다, 공통 의미를 추정하고 자동보정한 뒤 `_intake_staging` 정리본으로 다음 단계에 최대한 넘기는 운영 방식**으로 컬럼 사전, intake, 정규화를 설계·구현해왔다.

## 2. 컬럼 사전 현황

### 실제 발견한 파일/문서

- `modules/intake/rules.py`
- `modules/intake/suggestions.py`
- `modules/intake/service.py`
- `common/company_onboarding_registry.py`
- `data/company_source/company_000002/_onboarding/company_onboarding_registry.json`
- `docs/architecture/19_intake_gate_and_onboarding_plan.md`
- `docs/architecture/20_common_intake_engine_implementation_plan.md`

### 공통 사전이 있었는지

- 있었다. 다만 “중앙 대형 컬럼 사전 테이블 1개” 형태보다는 `modules/intake/rules.py` 안의 `IntakeRule` 묶음 형태다.
- source별로 `required_fields`, `field_aliases`, `review_fields`를 정의한다.
- 예:
  - `crm_activity`: `activity_date`, `rep`, `account`, `activity_type`
  - `sales`: `account`, `product`, `amount`, `period`
  - `target`: `period`, `target_value`
  - `prescription`: `ship_date`, `pharmacy`, `product`, `quantity`

### source별 규칙이 있었는지

- 있었다.
- `modules/intake/rules.py`가 source별 최소 의미 필드를 분리해서 가진다.
- 실제 source 키:
  - `crm_activity`
  - `crm_rep_master`
  - `crm_account_assignment`
  - `crm_rules`
  - `sales`
  - `target`
  - `prescription`

### 별칭/표준 컬럼 처리 방식

- 1차는 **의미 기반 alias 탐지**다.
  - `modules/intake/rules.py`의 `field_aliases`
  - 예: `period`에 `yyyymm`, `sales_month`, `month`, `매출월`, `기준년월`, `월`
- 2차는 **후보 컬럼 추정**이다.
  - `modules/intake/suggestions.py`
  - 문자열 유사도 + positive/negative token으로 후보를 고른다.
  - 확신이 높으면 자동 선택, 아니면 suggestion/advisory로 남긴다.
- 3차는 **Adapter 실행용 컬럼 자동 추가**다.
  - `modules/intake/service.py`의 `_ADAPTER_CANONICAL_COLUMN_MAP`
  - 예:
    - `병원코드 -> 거래처코드`
    - `매출월 -> 기준년월`
    - `목표월 -> 기준년월`
    - `출고일 -> ship_date (출고일)`
- 4차는 **회사별로 확정된 매핑 재사용**이다.
  - `common/company_onboarding_registry.py`
  - 실제 저장 예시는 `data/company_source/company_000002/_onboarding/company_onboarding_registry.json`

### 컬럼명 흔들림을 어떻게 흡수했는가

- 컬럼명 앞뒤 공백/중복 공백 정리: `modules/intake/fixers.py`
- 중복 헤더 정리: `modules/intake/fixers.py`
- alias exact match + normalized match: `modules/intake/service.py`
- 후보 컬럼 추천: `modules/intake/suggestions.py`
- 실행용 canonical column 추가: `modules/intake/service.py`
- 회사별 저장 매핑 fallback: `modules/intake/service.py`

### 표준 컬럼명으로 어떤 식으로 맞췄는가

- intake 단계에서 raw를 바로 공통 스키마 객체로 바꾸는 것이 아니라,
  - 먼저 `_intake_staging`에 **Adapter가 읽기 쉬운 컬럼명**을 자동 추가한다.
- 그 뒤 실제 정규화는 adapter config 기반으로 `data/standardized/{company}/...`에 쓴다.
- 즉 현재 구조는:
  - `의미 추정/보정`: `modules/intake/*`
  - `정식 공통 스키마 변환`: `adapters/*` + `scripts/normalize_*`

### 아직 비어있는 부분

- 저장소에서 “모든 source가 공통으로 참조하는 독립 컬럼 사전 파일 1개”는 찾지 못했다.
- `data/standardized/` 경로는 없었다. 실제 표준화 산출물 경로는 `data/standardized/`였다.
- `docs/backend_architecture/`, `docs/task.md`는 찾지 못했다.

## 3. Intake 검증 현황

### 실제 검증 항목

- 파일 존재 여부
  - 업로드도 없고 기존 source 경로에도 파일이 없으면 검사
  - `modules/intake/service.py`
- source별 필수 의미 필드 존재 여부
  - `required_fields` 기준
  - `modules/intake/rules.py`, `modules/intake/service.py`
- review 필드 존재 여부
  - 없어도 막지 않고 suggestion 생성
- 실행용 staging에서 Adapter 필수 컬럼이 실제로 충분한지
  - `_adapter_ready_check`
  - `modules/intake/service.py`
- 기간 범위 계산
  - `_build_period_coverage`
  - `modules/intake/service.py`
- source 간 공통 분석 구간 계산
  - `_build_timing_summary`
  - `modules/intake/service.py`

### 자동보정 항목

- 컬럼명 trim / 중복 공백 정리
- 중복 헤더 구분
- 완전 중복 행 제거
- 월 형식 `YYYYMM` 정리
- 날짜 형식 `YYYY-MM-DD` 정리
- Adapter 실행용 canonical column 추가
- `crm_account_assignment` 부족 시 CRM 활동에서 실행용 거래처/병원 배정표 유도 생성
- `crm_rep_master` 부족 시 담당 배정 파일을 조합해 실행용 CRM 마스터 생성
- 월별 raw 자동 병합

근거 파일:

- `modules/intake/fixers.py`
- `modules/intake/service.py`
- `modules/intake/merge.py`

### advisory/warn 처리 방식

- 필수 의미 필드를 못 찾았어도 후보 컬럼이 있으면 바로 `blocked` 하지 않는다.
- 이 경우:
  - suggestion: `required_mapping_candidate`
  - finding: `candidate_review_recommended`
  - 상태는 계속 진행 가능하게 둘 수 있다.
- optional/review 필드는 suggestion만 남긴다.
- UI도 “치명적이지 않은 intake 주의 항목”으로 안내한다.

근거 파일:

- `modules/intake/service.py`
- `modules/intake/suggestions.py`
- `ui/console/tabs/upload_tab.py`
- `ui/console/tabs/pipeline_tab.py`

### blocked/fail 기준

- `blocked`
  - 필수 source가 없고 기존 경로에도 파일이 없음
- `needs_review`
  - 필수 의미 필드를 확정하지 못했고 후보도 약함
  - 또는 intake는 통과했지만 staging에서 adapter 필수 컬럼이 부족함
- intake 단계에는 `fail` 상태 타입이 없다.
  - 모델상 상태는 `ready`, `ready_with_fixes`, `needs_review`, `blocked`
  - `modules/intake/models.py`
- 파이프라인 단계 `FAIL`은 validation/실행 결과 쪽이고 intake와 별개다.

### period/common window 처리 방식

- source별 period column을 찾는다.
- 각 source의 시작월/종료월/월 수를 계산한다.
- 시나리오 기준 분석 source들의 교집합 월을 계산한다.
- 공통 구간이 있으면:
  - `analysis_start_month`
  - `analysis_end_month`
  - `analysis_month_count`
  - `analysis_summary_message`
  - `proceed_confirmation_message`
  를 만든다.
- 기간 차이가 있어도 바로 막지 않고 경고 + 사용자 확인으로 처리한다.

근거 파일:

- `modules/intake/service.py`
- `modules/intake/scenarios.py`
- `ui/console/tabs/pipeline_tab.py`

### intake 결과를 어디에 저장했는가

- source별 onboarding package
  - `data/company_source/{company_key}/_onboarding/{source_key}_onboarding_package.json`
- intake 최신 스냅샷
  - `data/company_source/{company_key}/_onboarding/intake_result.latest.json`
- intake 이력 스냅샷
  - `data/company_source/{company_key}/_onboarding/intake_result_YYYYMMDD_HHMMSS.json`
- 회사별 저장 매핑
  - `data/company_source/{company_key}/_onboarding/company_onboarding_registry.json`

근거 파일:

- `modules/intake/staging.py`

### `_intake_staging`, `_onboarding`은 어떻게 썼는가

- `_intake_staging`
  - 자동보정 후 Adapter가 실제로 읽을 정리본 저장 위치
  - `modules/intake/staging.py`
  - 실행 시 `COMPANY_SOURCE_ROOT` 환경변수로 이 경로를 source root처럼 사용
  - `modules/intake/runtime.py`, `common/company_runtime.py`
- `_onboarding`
  - package별 판정, suggestion, resolved mapping, period coverage, registry를 남기는 메타 저장 위치
  - `modules/intake/staging.py`

## 4. 정규화 현황

### 정규화 단계 구조

- 실제 운영 구조는 2단계다.
  1. intake 정리
     - raw -> `_intake_staging`
  2. adapter 정규화
     - `_intake_staging` 또는 기존 source -> `data/standardized/{company}/{module}`

### mapping/adapter 위치

- adapter 설정 계약
  - `adapters/crm/adapter_config.py`
  - `adapters/sandbox/adapter_config.py`
  - `adapters/prescription/adapter_config.py`
- 실제 변환기
  - `adapters/crm/crm_activity_adapter.py`
  - `adapters/crm/company_master_adapter.py`
  - `adapters/crm/hospital_adapter.py`
  - `adapters/prescription/company_prescription_adapter.py`
  - sandbox/territory adapter 계열
- 회사별 source target 기본 경로와 config factory
  - `common/company_profile.py`

### raw를 어떤 공통 구조로 바꿨는가

- CRM
  - `ops_hospital_master.xlsx`
  - `ops_company_master.xlsx`
  - `ops_crm_activity.xlsx`
- Sandbox
  - `ops_sales_records.xlsx`
  - `ops_target_records.xlsx`
- Prescription
  - `ops_prescription_standard.xlsx`
- Territory
  - `ops_territory_activity.xlsx`

근거 파일:

- `scripts/normalize_crm_source.py`
- `scripts/normalize_sandbox_source.py`
- `scripts/normalize_prescription_source.py`
- `scripts/normalize_territory_source.py`
- `data/standardized/*`

### 날짜/월/수치 타입 통일은 어떻게 했는가

- intake에서 1차 정리
  - 월: `YYYYMM`
  - 날짜: `YYYY-MM-DD`
  - `modules/intake/fixers.py`
- adapter에서 2차 정식 변환
  - config의 `metric_month_col`, `sales_date_col`, `transaction_date_col`, `date_format` 등을 사용
  - 예: `adapters/crm/crm_activity_adapter.py`, `adapters/prescription/company_prescription_adapter.py`

### source별 예외를 어디서 흡수했는가

- 1차: intake alias / suggestion / canonical column 추가
- 2차: adapter config 주입
- 3차: 회사별 저장 매핑 재사용
- 4차: 일부 CRM 실행용 staging 합성

즉 예외 흡수 위치는 주로 아래 네 곳이다.

- `modules/intake/rules.py`
- `modules/intake/service.py`
- `modules/intake/suggestions.py`
- `adapters/*/adapter_config.py`

### standardized 결과를 어디에 저장했는가

- 실제 저장 경로는 `data/standardized/`가 아니라 `data/standardized/`였다.
- 예:
  - `data/standardized/company_000002/crm/ops_crm_activity.xlsx`
  - `data/standardized/company_000002/prescription/ops_prescription_standard.xlsx`
  - `data/standardized/company_000002/sandbox/ops_sales_records.xlsx`

### 아직 미완성인 부분

- 중앙 컬럼 사전 파일 1개로 완전히 분리된 구조는 아직 아니다.
- intake는 의미 추정 + staging 보정이 강하고, adapter config는 여전히 회사 예시 기반이다.
- 문서에서는 “시나리오 + 매핑 + 룰”을 더 일반화하려고 하지만, 실제 adapter config는 `hangyeol_*_example`류가 기본 factory로 남아 있다.
- 즉 intake는 공통엔진화가 많이 진행됐지만, 정규화 config는 완전한 회사 독립형 registry로 끝난 상태는 아니다.

## 5. 실제 운영 원칙

### intake는 엄격 검증보다 자동보정 중심이었는가

- 그렇다.
- 가장 직접적인 근거:
  - `docs/architecture/19_intake_gate_and_onboarding_plan.md`
  - `docs/architecture/20_common_intake_engine_implementation_plan.md`
  - `modules/intake/service.py`
  - `modules/intake/fixers.py`
- 실제 구현도 후보 컬럼이 있으면 advisory로 넘기고, 실행용 컬럼을 자동 추가하며, staging 합성까지 한다.

### 파이프라인까지 최대한 돌리기 위해 어떤 완화 규칙이 있었는가

- candidate가 있는 필수 의미 컬럼은 바로 차단하지 않음
- optional source는 없어도 진행
- 기간 차이는 공통 분석 구간 계산 후 계속 진행 가능
- CRM 배정표/마스터 부족 시 실행용 staging 합성
- 월별 raw는 실행 직전 자동 병합
- 기존 source에 컬럼 정보가 없으면 저장된 회사 매핑 fallback 사용

### Builder, validation, KPI와의 경계는 어떻게 유지했는가

- intake는 raw 정리와 adapter 준비까지만 담당
  - `modules/intake/*`
- 정규화는 adapter + `data/standardized`
  - `adapters/*`, `scripts/normalize_*`
- KPI 계산은 `modules/kpi/*`
- validation/orchestration은 `modules/validation/*`와 별도 runtime 레이어
- Builder는 최종 결과 렌더링만 담당

이 경계는 문서와 코드가 대체로 일치한다.

## 6. 실제 파일 근거

### 컬럼 사전 / 의미 규칙

- `modules/intake/rules.py`
- `modules/intake/suggestions.py`
- `modules/intake/models.py`
- `common/company_onboarding_registry.py`
- `data/company_source/company_000002/_onboarding/company_onboarding_registry.json`

### intake 엔진 / 자동보정 / staging

- `modules/intake/service.py`
- `modules/intake/fixers.py`
- `modules/intake/staging.py`
- `modules/intake/runtime.py`
- `modules/intake/merge.py`
- 별도 runtime 입력 준비 레이어
- `common/company_runtime.py`

핵심 함수/구조:

- `build_intake_result`
- `CommonIntakeEngine.inspect`
- `_apply_adapter_canonical_columns`
- `_build_execution_ready_crm_account_assignment`
- `_build_execution_ready_crm_rep_master`
- `_adapter_ready_check`
- `_build_period_coverage`
- `_build_timing_summary`
- `stage_intake_dataframe`
- `prepare_intake_staged_sources`

### 정규화 / adapter

- `common/company_profile.py`
- `adapters/crm/adapter_config.py`
- `adapters/crm/crm_activity_adapter.py`
- `adapters/sandbox/adapter_config.py`
- `adapters/prescription/adapter_config.py`
- `adapters/prescription/company_prescription_adapter.py`
- `scripts/normalize_crm_source.py`
- `scripts/normalize_sandbox_source.py`
- `scripts/normalize_prescription_source.py`
- `scripts/normalize_territory_source.py`

### UI/운영 연결

- `ui/console/tabs/upload_tab.py`
- `ui/console/tabs/pipeline_tab.py`
- `ui/console/artifacts.py`

### 샘플 산출물

- `data/company_source/company_000002/_onboarding/intake_result.latest.json`
- `data/company_source/company_000002/_onboarding/crm_activity_onboarding_package.json`
- `data/standardized/company_000002/crm/ops_crm_activity.xlsx`
- `data/standardized/company_000002/prescription/ops_prescription_standard.xlsx`

## 7. 문서와 코드 차이

### 요청한 문서 경로와 실제 저장소 차이

- 요청한 아래 경로는 찾지 못했다.
  - `docs/archive_part2_status_source_of_truth.md`
  - `docs/archive_SALES_DATA_OS_DETAIL.md`
  - `docs/13_backend_logic_request_prompt.md`
  - `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `docs/backend_architecture/03_metrics-logic-v2.md`
  - `docs/06_backend_api_plan.md`
  - `docs/07_data_flow.md`
  - `docs/task.md`
- 실제 대응 근거는 주로 아래였다.
  - `docs/architecture/12_part2_status_source_of_truth.md`
  - `docs/SALES_DATA_OS_DETAIL.md`
  - `docs/architecture/18_real_company_raw_input_flow.md`
  - `docs/architecture/19_intake_gate_and_onboarding_plan.md`
  - `docs/architecture/20_common_intake_engine_implementation_plan.md`

### data 경로 차이

- 요청에는 `data/standardized/`, `data/validation/`가 있었지만 실제 경로는
  - `data/standardized/`
  - `data/validation/`
  였다.

### workers 경로 차이

- 요청에는 `workers/`가 있었지만 현재 저장소에는 해당 폴더를 찾지 못했다.

## 8. 지금 우리에게 필요한 다음 결정

### 1순위. 정규화 계약을 먼저 잠글지 결정

- 추천: 먼저 잠그는 것이 맞다.
- 이유:
  - 현재 intake는 이미 “살려서 staging으로 넘기기”를 하고 있다.
  - 그런데 최종 adapter 입력 계약이 더 넓고 명시적으로 문서화돼 있지는 않다.
  - 이 계약이 먼저 고정돼야 컬럼 사전도 불필요하게 커지지 않는다.

### 2순위. 기존 규칙을 재사용할지 결정

- 추천: 새로 처음부터 만들지 말고 `modules/intake/rules.py` + `_ADAPTER_CANONICAL_COLUMN_MAP` + onboarding registry를 재사용하는 것이 맞다.
- 이유:
  - 이미 source별 의미 필드와 alias가 구현되어 있다.
  - 실검증 데이터(`company_000002`)도 남아 있다.

### 3순위. 컬럼 사전을 별도 문서/파일로 승격할지 결정

- 추천: 만들 필요가 있다.
- 이유:
  - 지금은 규칙이 코드 안 여러 위치에 흩어져 있다.
  - 운영/비개발자 관점에서는 한 번에 보기 어렵다.
- 단, 완전히 새 규칙을 만드는 것이 아니라 기존 구현을 추출해 문서화하는 방식이 맞다.

### 4순위. intake 자동보정을 어디까지 허용할지 결정

- 추천:
  - 형식 보정, canonical column 추가, CRM staging 합성까지는 유지
  - 의미 추정이 약한 경우는 계속 advisory/needs_review로 남기는 방식 유지
- 이유:
  - 현재 철학과 실구현이 모두 “차단보다 구조적 보정”에 맞춰져 있다.
  - 반대로 자동 의미 확정을 너무 공격적으로 늘리면 잘못된 연결을 조용히 통과시킬 위험이 커진다.

