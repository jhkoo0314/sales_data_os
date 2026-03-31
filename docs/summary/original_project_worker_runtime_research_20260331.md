# 원본 프로젝트 Worker Runtime 조사

작성일: 2026-03-31  
조사 기준:
- 참고 문서: `C:\sales_os\docs\...`
- 실제 근거: 원본 프로젝트 코드베이스 `C:\sfe_master_ops`

## 우리 프로젝트 적용 기준

- 이 문서의 원본 `ops_core/*` 표기는 우리 프로젝트에서는 별도 모듈명이 아니라 `worker runtime + validation / orchestration 책임`으로 읽는다.
- 이 문서의 원본 환경변수 `COMPANY_KEY`, `COMPANY_NAME`는 우리 프로젝트에서는 `company_key`, `company_name` 실행 문맥으로 읽는다.
- 원본 절대경로와 원본 파일명은 조사 근거로만 남기고, 현재 프로젝트 문구에서는 예전 운영체계 용어를 사용하지 않는다.

## 1. 한 줄 결론

원본 프로젝트의 실제 worker runtime은 `별도 workers/run_worker.py가 pending run을 주워가는 구조`가 아니라, `console/UI가 execution_service를 직접 호출해 intake staging -> normalize script -> validation script -> radar -> builder -> run bundle 저장`까지 한 번에 실행하는 동기식 orchestration 구조였다.

## 2. 원본 프로젝트에서 반드시 먼저 봐야 하는 파일 묶음

1. `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
- 실제 실행 본체다.
- 입력 준비, staging 활성화, 단계 실행, 전체 결과 조립이 여기 있다.

2. `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`
- intake 검사, monthly merge, staging source 준비, runtime source root 활성화가 여기 있다.

3. `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
- execution mode별 실제 단계 순서가 여기 고정돼 있다.
- 어떤 script를 어떤 순서로 돌렸는지 가장 직접적으로 확인할 수 있다.

4. `C:\sfe_master_ops\ui\console\runner.py`
- UI가 실행을 어떻게 시작하고, 완료 후 run bundle을 어떻게 저장하는지 보여준다.

5. `C:\sfe_master_ops\common\run_storage\_shared.py`
- run 결과를 Supabase `runs`, `run_steps`, `run_artifacts`, `run_report_context`로 어떻게 옮겼는지 보여준다.

6. `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
- worker 흐름의 마지막 Builder 단계가 실제 어떤 파일을 생성했는지 보여준다.

7. `C:\sfe_master_ops\ops_core\workflow\orchestrator.py`
- 이것은 runtime worker 본체는 아니지만, Validation Layer 전용 orchestrator가 따로 있었다는 점을 보여준다.

8. `C:\sfe_master_ops\data\validation\company_000002\pipeline\pipeline_validation_summary.json`
- 실제 한 run의 단계 순서, 상태, summary 연결을 한 번에 볼 수 있는 증거 파일이다.

## 3. worker 실제 구현 현황

### 위치

원본 프로젝트에서 사용자가 기대한 `workers/run_worker.py`는 실제 코드베이스에 없었다.

실제 위치:
- 실행 본체: 별도 runtime 실행 레이어
- 입력 준비: 별도 runtime 입력 준비 레이어
- 단계 레지스트리: 별도 runtime 단계 레지스트리
- UI 진입점: `ui/console/runner.py`
- 호환 경로: `modules/validation/workflow/*`

중요한 사실:
- `modules/validation/workflow/execution_service.py`
- `modules/validation/workflow/orchestrator.py`
- `modules/validation/workflow/execution_registry.py`
- `modules/validation/workflow/execution_runtime.py`
- `modules/validation/workflow/schemas.py`

이 파일들은 실제 구현이 아니라 모두 예전 runtime workflow 레이어로 넘기는 compatibility bridge였다.

즉 실제 구현 본체는 별도 worker runtime / orchestration workflow 레이어였다.

### 입력

실제 실행 컨텍스트는 `ExecutionContext`였다.

근거: `C:\sfe_master_ops\ops_core\workflow\execution_models.py`

필드:
- `project_root`
- `company_key`
- `company_name`
- `source_targets`

실제 run 결과 모델은 `ExecutionRunResult`였다.

핵심 필드:
- `run_id`
- `execution_mode`
- `execution_mode_label`
- `company_key`
- `company_name`
- `overall_status`
- `steps`
- `summary_by_module`

즉 worker는 실제로 아래 문맥을 유지했다.
- `company_key`
- `run_id`
- `execution_mode`
- `source_targets`

`execution_runtime.prepare_execution_inputs()`는 추가로 아래 입력을 사용했다.
- 세션 업로드 파일 `uploaded`
- monthly raw merge 결과
- intake 결과
- staged source root

### 실행 순서

실제 런타임 순서는 `execution_service.run_runtime_execution_mode()`가 묶었다.

실행 흐름:

1. 환경 변수 설정
- `COMPANY_KEY`
- `COMPANY_NAME`

2. 실행 입력 준비
- `prepare_execution_inputs()`
- monthly raw 자동 병합
- 업로드 파일을 실제 source 경로에 반영
- intake 실행
- `ready_for_adapter`가 아니면 즉시 중단
- `_intake_staging` 준비

3. runtime source root 활성화
- `activate_execution_runtime()`
- Adapter/validation script가 `_intake_staging`를 읽도록 runtime 전환

4. execution mode별 step 실행
- `get_mode_pipeline_steps(execution_mode)`로 step 목록 조회
- 각 step는 실제 `scripts/*.py`의 `main()`을 호출

5. step summary 수집
- 각 모듈의 `*_validation_summary.json`을 읽어 status/score/reasoning_note 구성

6. 전체 결과 계산
- step 상태를 보고 `overall_status` 계산
- `FAIL > WARN > PASS`

7. runtime cleanup
- `cleanup_execution_runtime()`

8. UI가 run 저장
- 로컬 run bundle 저장
- Supabase runs / run_steps / run_artifacts / run_report_context 저장

### execution mode별 실제 step 묶음

근거: `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`

예: `integrated_full`

1. CRM
- `normalize_crm_source.py`
- `validate_crm_with_ops.py`

2. Prescription
- `normalize_prescription_source.py`
- `validate_prescription_with_ops.py`

3. Sandbox
- `normalize_sandbox_source.py`
- `validate_sandbox_with_ops.py`

4. Territory
- `normalize_territory_source.py`
- `validate_territory_with_ops.py`

5. RADAR
- `validate_radar_with_ops.py`

6. Builder
- `validate_builder_with_ops.py`

즉 질문에서 원하신 순서를 실제 코드 기준으로 풀면:

- intake
- intake staging 활성화
- normalize script 실행
- module validation summary 생성
- radar 생성
- builder 생성
- run bundle 저장

중요:
- KPI 계산은 별도 `worker 루프` 파일에서 직접 하지 않았다.
- KPI 계산은 각 `normalize_*` / `validate_*` 스크립트와 모듈 서비스 안에서 실행됐다.

### 출력

실행 결과로 생성되는 대표 출력:

- 모듈별 validation summary
  - `crm_validation_summary.json`
  - `prescription_validation_summary.json`
  - `sandbox_validation_summary.json`
  - `territory_validation_summary.json`
  - `radar_validation_summary.json`
  - `builder_validation_summary.json`

- Builder 결과
  - `*_preview.html`
  - `*_input_standard.json`
  - `*_payload_standard.json`
  - `*_result_asset.json`

- run bundle
  - `pipeline_summary.json`
  - `artifacts.index.json`
  - `report_context.full.json`
  - `report_context.prompt.json`
  - `run_meta.json`
  - `execution_analysis.md`

### 근거 파일

- `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
- `C:\sfe_master_ops\ui\console\runner.py`
- `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`

## 4. 상태 전환 / run step 기록 현황

### 상태 모델

문서 기준 기대:
- `pending -> running -> completed / failed`

실제 원본 코드에서 확인된 상태 모델은 두 층이었다.

1. step 품질 상태
- `PASS`
- `WARN`
- `FAIL`
- `APPROVED`
- `SKIP`

2. run 저장 상태
- 로컬 run meta에서는 `status: success`
- Supabase `runs.run_status`도 `success`로 저장

즉 실제 원본 구현에서는 `pending -> running -> completed / failed`가 완전하게 구현돼 있지 않았다.

근거:
- `ui/console/runner.py`
- `common/run_storage/_shared.py`

### step 기록 방식

step 기록은 `ExecutionStepResult`로 메모리 안에서 먼저 쌓였다.

근거: `C:\sfe_master_ops\ops_core\workflow\execution_models.py`

필드:
- `step`
- `module`
- `status`
- `score`
- `duration_ms`
- `reasoning_note`
- `next_modules`
- `error`
- `summary_path`
- `summary`

실제 step는 `_run_execution_steps()`가 반복문으로 만들었다.

근거:
- `C:\sfe_master_ops\ops_core\workflow\execution_service.py`

실행 방식:
- step runner 실행
- summary json 읽기
- `ExecutionStepResult` 조립
- 실패면 에러 메시지 포함
- FAIL이어도 일부 경우 계속 진행

중요 예외:
- `FAIL`이 나오면 항상 즉시 중단하는 구조가 아니었다.
- `step_result.error`가 있는 “실행 오류”는 중단
- quality FAIL은 `다음 단계 진단을 위해 통합 실행 계속`이 가능했다

직접 근거 문구:
- `ops_core/workflow/execution_service.py`
  - `... 품질은 FAIL이지만, 다음 단계 진단을 위해 통합 실행을 계속 진행했습니다.`

### summary 생성 방식

각 step summary는 각 script가 먼저 파일로 저장하고, execution service가 다시 읽어왔다.

summary 파일 위치 매핑:
- crm -> `crm/crm_validation_summary.json`
- prescription -> `prescription/prescription_validation_summary.json`
- sandbox -> `sandbox/sandbox_validation_summary.json`
- territory -> `territory/territory_validation_summary.json`
- radar -> `radar/radar_validation_summary.json`
- builder -> `builder/builder_validation_summary.json`

근거:
- `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_service.py`

### 실제 저장된 step 상태 예

실제 run 파일 `pipeline_validation_summary.json`에서 확인된 상태:
- CRM: `PASS`
- Prescription: `FAIL`
- Sandbox: `PASS`
- Territory: `WARN`
- RADAR: `APPROVED`
- Builder: `PASS`

즉 step 단위에서는 `APPROVED`도 실제로 사용됐다.

### Supabase run_steps 저장 규칙

근거: `C:\sfe_master_ops\common\run_storage\_shared.py`

매핑:
- `PASS` -> `success`
- `WARN` -> `partial`
- `FAIL` -> `failed`
- `SKIP` -> `skipped`
- 그 외는 기본 `success`

주의:
- `APPROVED`는 별도 분기 없이 기본 `success`로 들어간다.
- `quality_status`는 `pass/warn/fail`만 저장하고 `approved`는 별도 품질 값으로 넣지 않는다.

즉 웹에서 재구현할 때는 `APPROVED` 저장 계약을 새로 분명히 해야 한다.

### 근거 파일

- `C:\sfe_master_ops\ops_core\workflow\execution_models.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
- `C:\sfe_master_ops\common\run_storage\_shared.py`
- `C:\sfe_master_ops\data\validation\company_000002\pipeline\pipeline_validation_summary.json`

## 5. run storage / artifact 저장 현황

### 저장 구조

실제 로컬 저장 구조:

- `data/validation/{company_key}/pipeline/`
- `data/validation/{company_key}/builder/`
- `data/validation/{company_key}/{module}/`
- `data/validation/{company_key}/runs/{run_id}/`

즉 질문에 적힌 `data/validation/{company_key}/runs/{run_id}/`와 완전히 같은 이름은 아니고, 실제 구현은 `data/validation/...`였다.

### run 단위 파일

실제 `runs/{run_id}/` 폴더에 저장된 파일:
- `run_meta.json`
- `pipeline_summary.json`
- `report_context.full.json`
- `report_context.prompt.json`
- `artifacts.index.json`
- `execution_analysis.md`
- `chat/`

실제 확인 경로:
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\`

### 생성 주체

로컬 run bundle 생성:
- `ui/console/runner.py`의 `_write_local_run_bundle()`

Supabase runs / steps / artifacts / report_context 저장:
- `common/run_storage/_shared.py`의 `save_pipeline_run_to_supabase()`

Builder 파일 생성:
- `scripts/validate_builder_with_ops.py`

모듈별 summary 생성:
- 각 `scripts/validate_*_with_ops.py`

### 소비 주체

UI/Console:
- `ui/console/artifacts.py`
- `ui/console/agent/*`
- `ui/console/tabs/*`

Agent 문맥:
- `report_context.full.json`
- `report_context.prompt.json`
- `artifacts.index.json`

Supabase 조회:
- `common/run_storage/_shared.py`
  - `list_successful_runs_from_supabase`
  - `list_run_artifacts_from_supabase`
  - `load_run_contexts_from_supabase`

### artifacts.index 연결 방식

실제 `artifacts.index.json`에는 두 종류가 함께 들어갔다.

1. intermediate
- 각 모듈 validation summary

2. final / evidence
- Builder HTML
- builder input_standard
- builder payload_standard
- builder result_asset

즉 artifact 저장 구조는 “step summary + final report + evidence JSON”을 한 index로 묶는 방식이었다.

### report context 연결 방식

`ui/console/runner.py`가 `report_context.full.json`과 `report_context.prompt.json`을 만들었다.

포함 내용:
- overall status
- executive summary
- key findings
- priority issues
- evidence index
- linked artifacts
- step status map

prompt context에는 추가로:
- `answer_scope: final_report_only`
- `forbidden_actions: ["recalculate_kpi", "raw_rejoin"]`

즉 Agent/UI가 읽기 쉬운 “요약 문맥”도 worker 흐름의 마지막 산출물이었다.

### 근거 파일

- `C:\sfe_master_ops\ui\console\runner.py`
- `C:\sfe_master_ops\common\run_storage\_shared.py`
- `C:\sfe_master_ops\ui\console\artifacts.py`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\artifacts.index.json`
- `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.prompt.json`

## 6. 웹 프로젝트에서 재구현할 때 가져와야 할 것

### 그대로 가져올 실행 규칙

1. `company_key` 문맥 고정
- 모든 source, output, run bundle이 회사 기준으로 묶여야 한다.

2. `execution_mode` 기반 step registry
- 실제 순서를 하드코딩하지 말고 mode별 step registry로 고정하는 방식은 그대로 가져갈 가치가 크다.

3. intake가 먼저 `_intake_staging`을 만들고, 이후 단계는 그 staging을 읽게 하기
- 원본 구조에서 가장 실용적인 부분이다.

4. 각 step는 자기 summary json을 만들고, orchestrator는 그 summary를 읽어 run result를 만든다
- step 경계가 명확해진다.

5. 최종 run bundle을 별도 폴더에 고정 저장
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

6. Builder 결과를 run artifact와 연결
- HTML만 저장하지 말고 input/payload/result_asset까지 같이 남겨야 한다.

### 새로 계약해야 할 것

1. 진짜 background worker 구조
- 문서에는 `pending -> running -> completed/failed` polling worker가 있지만 원본 구현은 아직 직접 실행형이었다.
- 웹에서는 이 차이를 새로 메워야 한다.

2. run 상태 모델
- 원본은 `success` 위주 저장이었다.
- 웹에서는 최소한 아래를 분리해야 한다.
  - `pending`
  - `running`
  - `completed`
  - `failed`
  - 가능하면 `cancelled`

3. step 상태와 quality 상태의 분리
- 현재 원본은 `step_status`와 `quality_status`가 완전히 분리돼 있지 않다.
- `APPROVED` 처리 규칙도 새로 잠가야 한다.

4. 실시간/중간 상태 저장 시점
- 원본은 완료 후 저장 비중이 크다.
- 웹 worker는 step 시작/진행/완료를 중간중간 저장해야 polling이 의미가 생긴다.

5. worker 진입점 파일
- 원본에는 `workers/run_worker.py`가 없다.
- 웹에서는 이 파일을 새로 만들어야 한다.

6. Supabase polling rule
- 어떤 주기로 pending run을 조회할지
- 락을 어떻게 잡을지
- 같은 run 중복 실행을 어떻게 막을지
- 이 부분은 원본 코드에 없다.

### 먼저 구현할 순서

1. `ExecutionContext`와 `ExecutionRunResult` 계약 먼저 고정

2. `execution_registry`를 웹 worker용으로 먼저 옮기기
- mode -> step 목록
- summary path 규칙

3. `prepare_execution_inputs` 계층 옮기기
- monthly merge
- intake
- `_intake_staging`
- runtime source activation

4. `run_executor` 구현
- 현재 별도 runtime 실행 레이어 역할

5. run 상태 저장기 구현
- 현재 문서에만 있는 `status_updater`
- step 시작/완료/실패를 Supabase에 중간 기록

6. run bundle 저장기 구현
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.*.json`

7. 마지막에 웹 polling 연결
- run list / run detail / artifacts / reports

## 7. 실제 근거 파일 목록

우선순위 순:

1. `C:\sfe_master_ops\ops_core\workflow\execution_service.py`
2. `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`
3. `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
4. `C:\sfe_master_ops\ops_core\workflow\execution_models.py`
5. `C:\sfe_master_ops\ui\console\runner.py`
6. `C:\sfe_master_ops\common\run_storage\_shared.py`
7. `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
8. `C:\sfe_master_ops\ui\console\tabs\pipeline_tab.py`
9. `C:\sfe_master_ops\ui\console\artifacts.py`
10. `C:\sfe_master_ops\ops_core\workflow\orchestrator.py`
11. `C:\sfe_master_ops\ops_core\workflow\schemas.py`
12. `C:\sfe_master_ops\ops_core\api\pipeline_router.py`
13. `C:\sfe_master_ops\modules\intake\staging.py`
14. `C:\sfe_master_ops\data\validation\company_000002\pipeline\pipeline_validation_summary.json`
15. `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\artifacts.index.json`
16. `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\report_context.prompt.json`
17. `C:\sales_os\docs\task.md`
18. `C:\sales_os\docs\06_backend_api_plan.md`
19. `C:\sales_os\docs\07_data_flow.md`

## 문서와 실제 코드 차이

이번 조사에서 확인된 핵심 차이:

1. 문서는 `workers/run_worker.py`, `workers/services/status_updater.py`를 전제로 한다.
- 실제 원본 코드베이스에는 `workers/` 폴더 자체가 없다.

2. 문서는 `pending -> running -> completed/failed` polling worker를 전제로 한다.
- 실제 원본 구현은 Streamlit console이 `run_actual_pipeline()`을 직접 호출하는 동기식 실행 구조였다.

3. 문서는 Supabase가 먼저 run을 받고 worker가 가져가는 구조를 상정한다.
- 실제 원본 구현은 실행 완료 후 `save_pipeline_run_to_supabase()`로 결과를 저장하는 후행 저장 구조가 더 강하다.

4. 문서는 `data/validation/{company_key}/runs/{run_id}/`를 말한다.
- 실제 원본 구현은 `data/validation/{company_key}/runs/{run_id}/`였다.

즉 웹 프로젝트 재구현 시에는 `문서의 target 구조`를 그대로 믿기보다, `원본 코드의 execution_service + run bundle + artifact index 구조`를 먼저 가져오고, 그 위에 `진짜 background polling worker`를 새로 얹는 방식이 맞다.

