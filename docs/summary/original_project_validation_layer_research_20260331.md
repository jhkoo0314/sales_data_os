# 원본 프로젝트 validation 레이어 조사

## 조사 전제

## 우리 프로젝트 적용 기준

- 이 문서의 원본 `ops_core/*` 표기는 우리 프로젝트에서는 별도 모듈명으로 쓰지 않고 `validation / orchestration runtime` 책임으로 읽는다.
- 원본 절대경로와 원본 파일명은 조사 근거로만 남기고, 현재 프로젝트 문구는 `validation`으로 통일한다.

- 이번 조사는 `C:\sales_os` 안의 현재 웹앱 구현을 답으로 삼지 않았다.
- `C:\sales_os\docs\...`는 "무엇을 찾아야 하는지"를 알려주는 기준으로만 읽었다.
- 실제 근거는 원본 프로젝트 코드와 실제 산출물에서 찾았다.
- 조사 결과, 문서에서 말하는 `modules/validation`은 실제로 존재하지만 본체가 아니라 bridge였고, 실제 validation 구현 본체는 별도 `validation / orchestration runtime` 레이어에 남아 있었다.

---

## 1. 한 줄 결론

원본 프로젝트의 validation은 `result asset을 받아 quality gate를 적용하고 PASS/WARN/FAIL/APPROVED/SKIP 상태와 reasoning note를 만든 뒤, validation summary와 run step 기록으로 남기고 다음 단계 handoff 여부를 정하는 운영 판단 레이어`로 실제 운영되었다.

---

## 2. 원본 프로젝트에서 반드시 먼저 봐야 하는 파일 묶음

1. `C:\sfe_master_ops\ops_core\api\crm_router.py`
- CRM validation이 어떤 입력을 받고 어떤 gate로 PASS/WARN/FAIL을 만드는지 가장 직접적으로 보여준다.

2. `C:\sfe_master_ops\ops_core\api\prescription_router.py`
- Prescription FAIL/WARN 기준과 next_modules가 실제로 어떻게 정해지는지 확인할 수 있다.

3. `C:\sfe_master_ops\ops_core\api\sandbox_router.py`
- Sandbox validation이 조인율, 병원 수, 월 수, handoff 후보를 어떻게 판정하는지 나온다.

4. `C:\sfe_master_ops\ops_core\api\territory_router.py`
- Territory WARN가 실행 실패가 아니라 운영 경고라는 점을 코드로 확인할 수 있다.

5. `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
- 실제 실행 경로에서 step 상태, reasoning_note, summary_path를 어떻게 조립하는지 나온다.

6. `C:\sfe_master_ops\ops_core\workflow\orchestrator.py`
- validation 전용 파이프라인 오케스트레이터가 PASS/WARN/FAIL/SKIP을 어떻게 쓰는지 확인할 수 있다.

7. `C:\sfe_master_ops\ops_core\workflow\schemas.py`
- `StepResult`, `PipelineRunResult`, `PipelineStatusSummary` 같은 validation 상태 모델의 공식 구조다.

8. `C:\sfe_master_ops\ui\console\runner.py`
- 실제 실행 결과를 `pipeline_summary.json`, `report_context.*`, `artifacts.index.json`으로 묶는 파일이다.

9. `C:\sfe_master_ops\ui\console\analysis_explainer.py`
- reasoning_note를 사람이 읽는 해석과 evidence 목록으로 바꾸는 규칙이 있다.

10. `C:\sfe_master_ops\common\run_storage\_shared.py`
- run 저장과 artifact/report_context 연결을 실제로 읽고 저장하는 공통 코드다.

11. 실제 산출물 예시
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\pipeline_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\artifacts.index.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.full.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.prompt.json`

보조 기준 문서:

- `C:\sales_os\docs\13_backend_logic_request_prompt.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_FRONTEND_API_TABLE.md`
- `C:\sales_os\docs\archive_part2_status_source_of_truth.md`

---

## 3. validation 실제 구현 현황

### 위치

- 공식 경로
  - `C:\sfe_master_ops\modules\validation\...`
- 실제 본체
  - 원본 runtime 구현 레이어

### `modules/validation/`이 실제로 하는 일

- `C:\sfe_master_ops\modules\validation\api\crm_router.py`
- `C:\sfe_master_ops\modules\validation\api\sandbox_router.py`
- `C:\sfe_master_ops\modules\validation\api\territory_router.py`
- `C:\sfe_master_ops\modules\validation\api\prescription_router.py`
- `C:\sfe_master_ops\modules\validation\api\pipeline_router.py`

이 파일들은 전부 예전 runtime 구현 레이어로 넘기는 bridge였다.

즉:

- 새 기준 import 주소는 `modules.validation`
- 실제 구현 본체는 별도 `validation / orchestration runtime`
- 문서의 "modules/validation이 기본, 별도 runtime 레이어는 호환 경로" 설명과 실제 코드가 일치한다.

### validation / orchestration runtime이 실제로 하는 일

- validation runtime API 레이어
  - 모듈별 result asset 평가
- orchestration workflow 레이어
  - step 구성
  - 실행 흐름 제어
  - pipeline 결과 집계

### validation 입력

validation은 raw를 받지 않았다. 실제 입력은 아래였다.

- CRM
  - `CrmResultAsset`
  - 근거: `ops_core/api/crm_router.py`

- Prescription
  - `PrescriptionResultAsset`
  - 근거: `ops_core/api/prescription_router.py`

- Sandbox
  - `SandboxResultAsset`
  - 근거: `ops_core/api/sandbox_router.py`

- Territory
  - `TerritoryResultAsset`
  - 근거: `ops_core/api/territory_router.py`

추가 입력 정보:

- 각 result asset 안의 `mapping_quality`, `activity_context`, `join_quality`, `coverage_summary` 같은 요약 정보
- 각 모듈 validation summary JSON
- runtime execution에서는 `summary_path`와 `summary`가 step에 같이 붙음
- run context와 연결될 때는 `pipeline_summary.json` 안 `steps[]`, `summary_by_module`, `recommended_actions`로 들어감

### 핵심 처리

validation은 공통적으로 아래만 했다.

1. result asset 내부 요약값 읽기
2. quality gate 통과 여부 판단
3. `quality_status`, `quality_score`, `reasoning_note`, `next_modules`, `gate_details` 생성
4. 그 결과를 validation summary 파일과 run step 상태에 반영

### 출력

모듈별 공통 출력:

- `quality_status`
- `quality_score`
- `reasoning_note`
- `next_modules`
- `gate_details`
- `evaluated_at`

그 다음 실제 파일로는:

- `crm_validation_summary.json`
- `prescription_validation_summary.json`
- `sandbox_validation_summary.json`
- `territory_validation_summary.json`
- `radar_validation_summary.json`
- `builder_validation_summary.json`

### 다음 전달 대상

- CRM validation 통과 결과
  - Prescription, Sandbox
- Prescription validation 통과 결과
  - Sandbox
- Sandbox validation 통과 결과
  - Territory, Builder
- Territory validation 통과 결과
  - Builder
- RADAR
  - Builder 승인 입력

근거:

- `ops_core/api/crm_router.py`
- `ops_core/api/prescription_router.py`
- `ops_core/api/sandbox_router.py`
- `ops_core/api/territory_router.py`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\pipeline_summary.json`

---

## 4. validation 상태 모델 현황

상태 모델 공식 구조:

- `C:\sfe_master_ops\ops_core\workflow\schemas.py`
- `StepResult.status`
- `PipelineRunResult.overall_status`

### PASS

의미:

- quality gate를 통과했고 다음 단계 handoff가 가능함

근거:

- `ops_core/api/crm_router.py`
  - 매핑률, 담당자, 병원 존재 등 통과 시 `PASS`
- `ops_core/api/sandbox_router.py`
  - 조인율/월수/기본 입력이 통과하면 `PASS`
- `ops_core/api/territory_router.py`
  - 커버리지, marker, gap 비율이 기준 안이면 `PASS`

실파일 예:

- `company_000002` run에서 CRM `PASS`
- `hangyeol_pharma` run에서 CRM/Prescription/Sandbox/Territory/Builder `PASS`

### WARN

의미:

- 실행은 가능하지만 사람이 봐야 할 운영 경고가 있음
- 차단은 아님

근거:

- `ops_core/api/crm_router.py`
  - 매핑률 50% 이상 70% 미만이면 WARN
- `ops_core/api/sandbox_router.py`
  - 병원 수 부족, 조인율이 권장 미달이면 WARN
- `ops_core/api/territory_router.py`
  - 커버리지 부족, 미커버 병원 비율 높음, 담당자 불균형이면 WARN
- `archive_part2_status_source_of_truth.md`
  - `Territory는 실행 실패가 아니라 운영 품질 WARN으로 분류`

실파일 예:

- `company_000002` run
  - Territory `WARN`
  - reasoning: 품질 WARN / 점수 87.0

### FAIL

의미:

- quality gate 기준상 다음 단계 전달에 문제가 있는 상태
- 다만 "실행 전체를 무조건 중단"과는 같지 않았다

근거:

- `ops_core/api/prescription_router.py`
  - `flow_completion_rate < 0.4`면 FAIL
- `ops_core/api/crm_router.py`
  - 필수 병원/담당자/매핑률 부족이면 FAIL
- `ops_core/workflow/orchestrator.py`
  - CRM/Sandbox FAIL은 `stop_on_fail=True`면 중단 가능
  - Prescription FAIL은 `선택적 모듈`로 취급해 계속 진행한다고 명시
  - 코드:
    - `Prescription은 선택적 모듈 → FAIL이어도 계속 진행`

즉 중요한 사실:

- Prescription FAIL은 항상 전체 차단이 아니었다.
- 실제로는 FAIL로 기록되지만, 통합 진단을 위해 다음 단계 진행이 가능했다.

실파일 예:

- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\pipeline_summary.json`
  - Prescription step `FAIL`
  - `recommended_actions`에
    - `PRESCRIPTION 단계 품질은 FAIL이지만, 다음 단계 진단을 위해 통합 실행을 계속 진행했습니다.`

### APPROVED

의미:

- 주로 RADAR처럼 "활용 승인" 의미로 사용됨
- 단순 PASS보다 "Intelligence 사용 승인"에 가까운 상태

근거:

- 문서 기준
  - `APPROVED`: 승인 완료 / 인텔리전스 활용 승인
- 실제 코드
  - `ops_core/api` 라우터의 `QualityGateStatus` enum에는 APPROVED가 없지만,
  - runtime execution은 모듈 summary의 `quality_status`를 그대로 대문자로 올려 step status로 사용한다.
  - `ops_core/workflow/execution_service.py`
    - `status = str(summary_payload.get("quality_status", "warn")).upper()`

그래서 RADAR summary가 `approved`면 step status가 `APPROVED`가 된다.

실파일 예:

- `company_000002` run step 5
  - `module: radar`
  - `status: APPROVED`

### SKIP

의미:

- 이번 실행 모드에서 생략됨
- 또는 이전 단계에서 handoff 조건이 안 맞아 건너뜀

근거:

- `ops_core/workflow/orchestrator.py`
  - Territory handoff 조건 미충족이면 skip 성격 문장을 남김
- `ui/console/runner.py`
  - mock pipeline에서 `SKIP` 상태를 실제 사용
- `C:\sales_os\docs\...`
  - 문서에서는 공식 상태 집합에 `SKIP` 포함

주의:

- 실제 runtime run 예시 파일에서는 `SKIP`보다 `WARN + 건너뜀 설명`이 더 많이 보였다.
- 즉 문서상 공식 상태지만, 실운영 기록에서는 `SKIP`보다 `WARN` 문장형 처리 비중이 더 높았다.

---

## 5. reason / evidence / summary 현황

### validation summary

실제 생성 파일:

- CRM: `scripts/validate_crm_with_ops.py`
  - `crm_validation_summary.json`
- Prescription: `scripts/validate_prescription_with_ops.py`
  - `prescription_validation_summary.json`
- Territory: `scripts/validate_territory_with_ops.py`
  - `territory_validation_summary.json`
- RADAR: `scripts/validate_radar_with_ops.py`
  - `radar_validation_summary.json`
- Builder: `scripts/validate_builder_with_ops.py`
  - `builder_validation_summary.json`

이 summary는 보통 아래를 담는다.

- record count
- 주요 품질 수치
- `quality_status`
- `quality_score`
- `next_modules`

### reasoning note

누가 만드나:

- 1차 생성
  - 각 validation router
  - 예: `ops_core/api/crm_router.py`, `ops_core/api/prescription_router.py`
  - 여기서 사람 읽는 문장 `reasoning_note`를 직접 만든다.

- 2차 생성
  - runtime execution path
  - `ops_core/workflow/execution_service.py`
  - step summary를 읽어서
    - `"{label} 완료. 품질 {status} / 점수 {score}"`
    - 또는 builder용
    - `"생성 보고서 N건"`
  로 run step용 reasoning_note를 만든다.

즉 reasoning note는 두 층이 있었다.

1. 모듈 validation 판단 문장
2. 실행 step 기록 문장

### interpreted reason

누가 만드나:

- `C:\sfe_master_ops\ui\console\analysis_explainer.py`

역할:

- step summary와 status를 받아
- 운영자가 이해하기 쉬운 해석 문장으로 다시 바꾼다.

예:

- Territory WARN이면
  - "실행 불가가 아니라 현업 배분 상태를 재점검하라는 의미"
- Prescription FAIL + connected hospital 0이면
  - "원본은 읽혔지만 병원 연결이 1건도 성사되지 않음"

### evidence

누가 만드나:

- `ui/console/analysis_explainer.py`

형태:

- 파일 경로가 아니라 우선 숫자/상태 근거 목록
- 예:
  - `company_unmapped_count=146`
  - `flow_completion_rate=0.0`
  - `coverage_rate=1.0`
  - `top_issue=RTR weakness detected`

이 evidence는 UI에서 step 해석 옆에 보여준다.

근거:

- `ui/console/tabs/artifacts_tab.py`
  - `explanation = explain_module_result(...)`
  - `evidence = explanation.get("evidence", [])`

### 어떤 파일로 남았는가

1. 모듈별 validation summary JSON
2. `pipeline_summary.json` 안 `steps[].reasoning_note`
3. `artifacts.index.json` 안 validation summary artifact row
4. `report_context.full.json` 안 `step_status_map`, `key_findings`, `priority_issues`
5. `execution_analysis.md` 안
   - `reasoning_note`
   - `interpreted_reason`
   - `evidence`

근거:

- `ui/console/runner.py`
  - `_build_execution_analysis_markdown(...)`

---

## 6. run 저장과 연결 구조

### pipeline_summary

생성 주체:

- `ui/console/runner.py`
  - `_write_local_run_bundle(...)`

실제 내용:

- `overall_status`
- `overall_score`
- `steps[]`
- `summary_by_module`
- `recommended_actions`

실파일 예:

- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\pipeline_summary.json`

### run step 상태

공식 구조:

- `ops_core/workflow/execution_models.py`
  - `ExecutionStepResult`
- `ops_core/workflow/schemas.py`
  - `StepResult`

실제 step 항목:

- `step`
- `module`
- `status`
- `score`
- `duration_ms`
- `reasoning_note`
- `next_modules`
- `summary_path`
- `summary`

### artifacts.index

생성 주체:

- `ui/console/runner.py`
  - `_build_local_run_artifacts_index(...)`

실제 연결 방식:

- 각 step의 `summary_path`를 validation summary artifact로 등록
- builder 단계 산출물은
  - html
  - input_standard
  - payload_standard
  - result_asset
  로 artifact 등록

실파일 예:

- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\artifacts.index.json`

### report_context

생성 주체:

- `ui/console/runner.py`
  - `_build_local_run_contexts(...)`

역할:

- validation 결과를 Agent/Run Detail에서 쉽게 쓰도록 요약

full:

- `validation_summary`
- `executive_summary`
- `key_findings`
- `priority_issues`
- `evidence_index`
- `step_status_map`

prompt:

- 더 짧은 질의 문맥
- `forbidden_actions`
  - `recalculate_kpi`
  - `raw_rejoin`

이 금지 항목은 validation 이후 단계가 계산을 다시 하지 않는다는 원칙의 강한 근거다.

### validation 결과와 run 저장 연결

연결 순서:

1. 각 모듈 validation summary 생성
2. execution service가 summary를 읽어 step result 생성
3. runner가 전체 `pipeline_summary.json` 생성
4. runner가 `artifacts.index.json` 생성
5. runner가 `report_context.full.json`, `report_context.prompt.json` 생성
6. `common/run_storage/_shared.py`가 이것을 다시 Agent / Supabase / Artifacts UI에서 읽는다

---

## 7. 역할 경계

### validation이 하지 않았던 일

1. KPI 계산
- 근거:
  - `C:\sales_os\docs\backend_architecture\CRM_KPI_FORMULA_SPEC.md`
  - `Builder, validation, Agent는 이 계산을 다시 하지 않는다`
  - 실제 코드상 validation router는 이미 계산된 result asset의 요약값만 읽는다.

2. Builder 렌더
- validation router와 workflow는 HTML 생성 함수를 호출하지 않는다.
- Builder는 별도 스크립트
  - `scripts/validate_builder_with_ops.py`

3. raw 직접 해석
- validation router 입력 타입이 모두 `ResultAsset`
- raw 파일 adapter/normalization은 `scripts/normalize_*`가 담당

즉 validation은 계산기나 렌더러가 아니라, "전달 판단자"였다.

---

## 8. 지금 웹 프로젝트에서 재구현할 때 가져와야 할 것

### 그대로 가져올 규칙

1. `modules.validation`은 공식 주소, 별도 runtime 레이어는 호환 경로로 두는 이중 구조
- 하드 rename 충격을 줄이는 방식으로 이미 검증된 패턴이다.

2. validation 입력은 raw가 아니라 result asset
- 웹에서도 validation API는 result asset 기준으로 설계하는 것이 맞다.

3. 상태 모델
- `PASS`
- `WARN`
- `FAIL`
- `APPROVED`
- `SKIP`
- 단, 실운영에서는 `WARN + 설명` 방식이 `SKIP`보다 많이 쓰였다는 점을 같이 반영해야 한다.

4. step 결과 구조
- `status`
- `score`
- `reasoning_note`
- `next_modules`
- `summary_path`
- `summary`

5. run bundle 4종
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

### 새로 계약해야 할 것

1. `APPROVED`를 enum에 정식 포함할지
- 현재 `QualityGateStatus` enum에는 `APPROVED`가 없는데, 실제 step status에는 등장한다.
- 웹에서는 enum과 실제 저장값을 맞춰야 한다.

2. `SKIP`의 실제 사용 방식
- 문서에는 공식 상태지만, 실제 run 기록에서는 `WARN + 건너뜀 설명`도 많이 쓴다.
- 웹에서는 둘 중 하나로 표준화가 필요하다.

3. validation summary 공통 계약
- 현재는 모듈마다 키 이름이 다르다.
- 웹에서는 공통 헤더와 모듈별 detail을 구분해 API 계약을 정해야 한다.

4. evidence 구조
- 현재는 숫자 리스트와 artifact path가 분리돼 있다.
- 웹에서는
  - `metric_evidence`
  - `artifact_evidence`
  로 나누는 계약이 더 명확하다.

### 먼저 구현할 순서

1. step status model 고정
   - `PASS/WARN/FAIL/APPROVED/SKIP`
   - overall_status 규칙 포함

2. validation step result contract 고정
   - `reasoning_note`
   - `score`
   - `next_modules`
   - `summary_ref`

3. validation summary contract 고정
   - 공통 필드 + 모듈별 detail

4. run bundle contract 고정
   - `pipeline_summary`
   - `artifacts.index`
   - `report_context.full`
   - `report_context.prompt`

5. UI용 interpreted reason / evidence adapter 추가
   - `analysis_explainer.py` 역할을 웹 API 또는 server helper로 옮기기

6. 마지막에 validation API와 run detail API 연결

---

## 9. 실제 근거 파일 목록

### 기준 문서

- `C:\sales_os\docs\13_backend_logic_request_prompt.md`
- `C:\sales_os\docs\task.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_PLANNER_SUMMARY.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_FRONTEND_API_TABLE.md`
- `C:\sales_os\docs\archive_part2_status_source_of_truth.md`
- `C:\sales_os\docs\archive_SALES_DATA_OS_DETAIL.md`
- `C:\sales_os\docs\07_data_flow.md`
- `C:\sales_os\docs\06_backend_api_plan.md`

### 실제 validation 구현

- `C:\sfe_master_ops\modules\validation\api\crm_router.py`
- `C:\sfe_master_ops\modules\validation\api\sandbox_router.py`
- `C:\sfe_master_ops\modules\validation\api\territory_router.py`
- `C:\sfe_master_ops\modules\validation\api\prescription_router.py`
- `C:\sfe_master_ops\modules\validation\api\pipeline_router.py`
- `C:\sfe_master_ops\ops_core\api\crm_router.py`
- `C:\sfe_master_ops\ops_core\api\sandbox_router.py`
- `C:\sfe_master_ops\ops_core\api\territory_router.py`
- `C:\sfe_master_ops\ops_core\api\prescription_router.py`
- `C:\sfe_master_ops\ops_core\api\pipeline_router.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_models.py`
- `C:\sfe_master_ops\ops_core\workflow\schemas.py`
- `C:\sfe_master_ops\ops_core\workflow\orchestrator.py`
- `C:\sfe_master_ops\common\types.py`

### reason / evidence / run storage

- `C:\sfe_master_ops\ui\console\analysis_explainer.py`
- `C:\sfe_master_ops\ui\console\runner.py`
- `C:\sfe_master_ops\ui\console\tabs\artifacts_tab.py`
- `C:\sfe_master_ops\ui\console\agent\artifacts.py`
- `C:\sfe_master_ops\common\run_storage\_shared.py`
- `C:\sfe_master_ops\common\run_storage\runs.py`
- `C:\sfe_master_ops\common\run_storage\report_context.py`

### 실제 산출물 예시

- `C:\sfe_master_ops\data\validation\company_000002\crm\crm_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\prescription\prescription_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\sandbox\sandbox_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\territory\territory_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\radar\radar_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\builder\builder_validation_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\pipeline_summary.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\artifacts.index.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.full.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.prompt.json`

---

## 최종 정리

- 문서 기준 설명은 `modules/validation`이 맞지만, 실제 구현 본체는 별도 runtime 레이어였다.
- validation은 raw나 KPI를 다시 만지지 않았고, 이미 계산된 result asset을 받아 quality gate만 수행했다.
- `reasoning_note`, `summary`, `step status`, `artifact index`, `report_context`가 한 묶음으로 운영됐고,
- 웹에서 validation을 다시 만들 때도 이 묶음을 함께 옮겨야 한다.

