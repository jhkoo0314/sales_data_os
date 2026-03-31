# KPI 모듈 조사 메모

작성일: 2026-03-31

## 우리 프로젝트 적용 기준

- 이 문서에서 보이는 원본 프로젝트의 `ops_core/*` 표기는 우리 프로젝트에서는 별도 모듈명이 아니라 `validation / orchestration runtime` 책임으로 읽는다.
- 원본 절대경로와 원본 파일명은 근거 보존용으로 남길 수 있지만, 현재 프로젝트 설명에는 예전 운영체계 용어를 쓰지 않는다.

## 1. 한 줄 결론

현재 KPI 모듈은 `modules/kpi/*`를 공식 계산 단일 소스로 두고, `modules/*/service.py`는 엔진 호출과 Result Asset 조립만 맡는 방식으로 구현하는 것이 맞으며, Builder·validation·RADAR·agent는 그 결과를 소비만 해야 한다.

## 2. 반드시 먼저 볼 참고 문서 묶음

### 1순위

- `docs/architecture/12_part2_status_source_of_truth.md`
  - 현재 저장소 기준으로 KPI 엔진 4종 분리 완료 상태를 가장 직접적으로 고정한다.

- `docs/SALES_DATA_OS_DETAIL.md`
  - Sales Data OS 전체 흐름 안에서 KPI 모듈의 위치와 금지사항을 가장 직접적으로 설명한다.

- `docs/part1/12_CRM_KPI_Governance_Recovery_Plan.md`
  - CRM 11 KPI, KPI 단일 소스, Builder/Sandbox 재계산 금지, CRM 구현 순서가 가장 구체적이다.

### 2순위

- `docs/part2/14_Part2_Module_KPI_Engine_Separation_Plan.md`
  - CRM 이후 Sandbox / Territory / Prescription 엔진 분리 원칙과 구현 순서를 보여준다.

- `docs/architecture/01_current_state_audit.md`
  - 문서 구조와 실제 코드 연결을 짧게 확인하기 좋다.

- `docs/part2/12_Part2_Execution_Plan.md`
  - Part2 기준 KPI 엔진 분리의 실행 순서와 완료 기준을 같이 볼 수 있다.

### 3순위

- `data/sample_data/sample_crm/03_metrics-logic-v2.md`
  - CRM KPI 계산식 문서다.

- `docs/ai/07_current_phase.md`
  - 현재 단계가 `Part2 완료`이며 KPI 엔진 4종이 이미 운영 경로에 연결됐다는 요약을 준다.

### 이번 요청에서 찾지 못한 문서

- `docs/13_backend_logic_request_prompt.md`
- `docs/task.md`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
- `docs/backend_architecture/SALES_DATA_OS_PLANNER_SUMMARY.md`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
- `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`
- `docs/archive_part2_status_source_of_truth.md`
- `docs/archive_SALES_DATA_OS_DETAIL.md`
- `docs/06_backend_api_plan.md`
- `docs/07_data_flow.md`

## 3. KPI 모듈 구조 현황

### 문서 기준 구조

- 공식 흐름:
  - `raw -> Adapter -> Module/Core Engine -> Result Asset -> validation -> Intelligence(RADAR) -> Builder`
- KPI 계산 단일 소스:
  - `modules/kpi/*`
- Builder:
  - render-only
- Validation:
  - 평가와 handoff 판단만 수행
- RADAR:
  - KPI 재계산 없이 KPI 결과를 입력으로 소비

근거 문서:

- `docs/SALES_DATA_OS_DETAIL.md`
- `docs/architecture/01_current_state_audit.md`
- `docs/architecture/12_part2_status_source_of_truth.md`
- `docs/part2/14_Part2_Module_KPI_Engine_Separation_Plan.md`

### 코드 기준 구조

실제 KPI 엔진 파일이 존재한다.

- `modules/kpi/crm_engine.py`
- `modules/kpi/sandbox_engine.py`
- `modules/kpi/territory_engine.py`
- `modules/kpi/prescription_engine.py`

실제 서비스 계층은 대체로 엔진 호출 + Result Asset 조립을 맡는다.

- `modules/crm/service.py`
- `modules/sandbox/service.py`
- `modules/territory/service.py`
- `modules/prescription/service.py`

실제 평가 계층은 Result Asset만 받는다.

- 원본 validation runtime API
  - `crm_router.py`
  - `sandbox_router.py`
  - `territory_router.py`
  - `prescription_router.py`

실제 Builder는 render-only 문구와 payload 소비 구조를 가진다.

- `modules/builder/service.py`
- `modules/builder/schemas.py`

### 문서 기준 구조와 코드 기준 구조의 차이

- CRM은 문서와 코드가 가장 잘 맞는다.
- Sandbox도 공식 KPI 6은 엔진으로 분리되어 있다.
- Territory / Prescription은 엔진 파일은 존재하지만, 현재 코드상 “공식 KPI 세트 계산기”보다 builder context / summary 계산 성격이 더 강하다.
- Sandbox payload builder에는 공식 KPI 외의 평균/상관분석 등 화면 보조 계산이 남아 있다.

## 4. 모듈별 KPI 조사 결과

### CRM

- 역할
  - 공식 11 KPI 계산 기준 모듈
- 입력
  - `CrmStandardActivity`
- 계산/소비 여부
  - 계산
- 출력
  - `rep_monthly_kpi_11`
  - `monthly_kpi_11`
  - `metric_version`
  - `CrmResultAsset`
- 근거 파일
  - `modules/kpi/crm_engine.py`
  - `modules/crm/service.py`
  - `result_assets/crm_result_asset.py`

### Sandbox

- 역할
  - Sandbox 공식 KPI 6 계산
  - Sandbox 분석 자산 조립
  - CRM KPI는 입력으로 받아 소비
- 입력
  - `SandboxInputStandard`
  - sales / target 월별 집계
  - CRM KPI 입력값
- 계산/소비 여부
  - 공식 KPI 6 계산
  - CRM KPI 소비
- 출력
  - `analysis_summary.custom_metrics`
  - `dashboard_payload`
  - `SandboxResultAsset`
- 근거 파일
  - `modules/kpi/sandbox_engine.py`
  - `modules/sandbox/service.py`
  - `result_assets/sandbox_result_asset.py`

### Territory

- 역할
  - Sandbox 결과를 지도/동선/커버리지 자산으로 변환
- 입력
  - `TerritoryResultAsset`
  - territory activity 표준 파일
- 계산/소비 여부
  - 현재는 공식 KPI 세트 계산보다 builder context / route / coverage 계산 성격이 강함
- 출력
  - marker / route / zone / coverage payload
  - `TerritoryResultAsset`
- 근거 파일
  - `modules/kpi/territory_engine.py`
  - `modules/territory/service.py`
  - `result_assets/territory_result_asset.py`

### Prescription

- 역할
  - 처방 흐름 검증 / 요약 / builder context 생성
- 입력
  - claim / flow / gap / rep_kpi 데이터프레임
- 계산/소비 여부
  - 현재는 공식 KPI 엔진이라기보다 builder context / 요약 계산 성격이 강함
- 출력
  - prescription builder context
  - `PrescriptionResultAsset`
- 근거 파일
  - `modules/kpi/prescription_engine.py`
  - `modules/prescription/service.py`
  - `result_assets/prescription_result_asset.py`

## 5. CRM KPI 상세 현황

### 11개 지표 목록

- HIR
- RTR
- BCR
- PHR
- NAR
- AHS
- PV
- FGR
- PI
- TRG
- SWR

### 계산식 문서 위치

- `data/sample_data/sample_crm/03_metrics-logic-v2.md`
- `docs/part1/12_CRM_KPI_Governance_Recovery_Plan.md`

### 코드 구현 상태

- 구현 있음
  - `modules/kpi/crm_engine.py`
- 서비스 연결 있음
  - `modules/crm/service.py`
- 결과 자산 스키마 있음
  - `result_assets/crm_result_asset.py`

### 지금 구현 시 주의할 점

- 수식 문서와 현재 코드 구현이 완전히 1:1이라고 단정할 수는 없다.
- 예:
  - 문서의 `HIR = SUM(...) / total_activities`
  - 코드의 `weighted_score / weighted_count`
- `PV`, `FGR`, `PI`, `TRG`, `SWR`도 문서 설명보다 단순화된 흔적이 있다.
- 따라서 “새 구현”보다 먼저 해야 할 일은 `공식 수식 기준을 잠그고 코드-문서를 다시 맞추는 일`이다.

## 6. KPI 구현 순서 제안

### 1단계. CRM KPI 계약 먼저 잠그기

- 이유:
  - 11개 지표와 `metric_version`, `rep_monthly_kpi_11`, `monthly_kpi_11`가 이미 공식 자산으로 쓰이고 있다.

### 2단계. CRM 계산식 문서와 엔진 코드 차이 정리

- 대상
  - `data/sample_data/sample_crm/03_metrics-logic-v2.md`
  - `modules/kpi/crm_engine.py`

### 3단계. Result Asset 계약 고정

- 대상
  - `result_assets/crm_result_asset.py`
- 이유
  - 다음 모듈이 재계산 없이 이 자산만 소비해야 하기 때문이다.

### 4단계. Sandbox 공식 KPI와 보조지표 경계 고정

- 공식 KPI 6은 엔진 유지
- payload builder의 평균/상관분석은 “보조 분석”으로 명시
- 대상
  - `modules/kpi/sandbox_engine.py`
  - `modules/sandbox/builders/template_payload_builder.py`

### 5단계. Territory 공식 KPI 목록 먼저 확정

- 현재는 엔진 파일은 있지만 “공식 KPI 목록”이 문서 수준에서 충분히 고정돼 있지 않다.

### 6단계. Prescription 공식 KPI 목록 먼저 확정

- 현재는 흐름/정합성/claim validation 요약은 있으나 “공식 KPI 엔진”으로 고정할 목록이 먼저 필요하다.

### 7단계. validation / Builder / RADAR는 소비 계약만 점검

- 계산식 추가 금지
- Result Asset 기반 평가 / 주입 / 신호 탐지 구조 유지

### 추천 구현 순서 예시

1. 공통 Result Asset 계약
2. CRM 계산식 고정
3. CRM 엔진 검증
4. Sandbox 공식 KPI 6 정리
5. Sandbox 보조지표 경계 정리
6. Territory KPI 목록 확정
7. Territory 엔진 보강
8. Prescription KPI 목록 확정
9. Prescription 엔진 보강
10. RADAR 입력 계약 점검
11. Builder payload 소비 계약 점검

## 7. 실제로 참고해야 할 파일 목록

### 가장 먼저 열어볼 파일

- `modules/kpi/crm_engine.py`
- `result_assets/crm_result_asset.py`
- `modules/crm/service.py`
- `data/sample_data/sample_crm/03_metrics-logic-v2.md`
- `docs/part1/12_CRM_KPI_Governance_Recovery_Plan.md`

### 그 다음 볼 파일

- `modules/kpi/sandbox_engine.py`
- `modules/sandbox/service.py`
- `modules/sandbox/builders/template_payload_builder.py`
- `modules/kpi/territory_engine.py`
- `modules/territory/service.py`
- `modules/kpi/prescription_engine.py`
- `modules/prescription/service.py`

### 경계 확인용 파일

- `modules/builder/service.py`
- `modules/builder/schemas.py`
- `modules/radar/schemas.py`
- `scripts/validate_radar_with_ops.py`
- 원본 validation runtime API
  - `crm_router.py`
  - `sandbox_router.py`
  - `territory_router.py`
  - `prescription_router.py`

### 단계 상태 확인용 문서

- `docs/architecture/12_part2_status_source_of_truth.md`
- `docs/part2/14_Part2_Module_KPI_Engine_Separation_Plan.md`
- `docs/part2/12_Part2_Execution_Plan.md`
- `docs/ai/07_current_phase.md`

## 8. 지금 당장 구현 전에 결정해야 할 것

### 아직 결정 안 된 것

- Territory 공식 KPI 목록
- Prescription 공식 KPI 목록
- Sandbox payload builder 안 보조 계산의 허용 범위
- CRM 수식 문서와 현재 엔진 구현 중 어느 쪽을 최종 기준으로 잠글지

### 먼저 잠가야 하는 계약

- CRM 11 KPI 공식 수식 + 결측 처리 + `metric_version`
- Sandbox 공식 KPI 6과 보조지표의 경계
- Territory / Prescription에서 “공식 KPI”라고 부를 항목 목록
- Result Asset에 어떤 KPI detail / monthly summary를 저장할지

### 바로 구현 가능한 범위

- CRM 엔진 보강과 문서-코드 동기화
- Sandbox 공식 KPI 6 유지 / 보강
- validation / Builder / RADAR에서 재계산 금지 점검

## 9. 문서와 코드 차이

### 문서 경로 차이

- 요청한 `docs/task.md`, `docs/backend_architecture/*`, `docs/archive_*`, `docs/06_backend_api_plan.md`, `docs/07_data_flow.md`는 현재 저장소에서 찾지 못했다.
- 실제 대응 문서는 `docs/architecture/*`, `docs/part1/*`, `docs/part2/*`, `docs/SALES_DATA_OS_DETAIL.md`였다.

### 구조 차이

- 문서상 `Territory KPI Engine`, `Prescription KPI Engine`이라고 부르지만,
  현재 코드상 해당 파일은 “공식 KPI 점수 세트”보다 builder context / summary 계산 성격이 더 강하다.

### Sandbox 차이

- 문서상 공식 KPI는 엔진 단일 소스를 강조한다.
- 실제 코드상 공식 KPI 6은 엔진에 있으나, `modules/sandbox/builders/template_payload_builder.py`에는 평균/상관분석 등 보조 계산이 남아 있다.
- 따라서 현재는 “공식 KPI”와 “표현/보조 분석값”을 분리해서 읽어야 한다.

## 10. 찾지 못한 항목

- `workers/` 폴더는 현재 저장소에 없다.
- `docs/task.md`는 없다.
- `docs/backend_architecture/` 폴더 자체를 찾지 못했다.

