# 원본 프로젝트 result asset / payload / artifact 구조 조사

## 조사 전제

## 우리 프로젝트 적용 기준

- 이 문서의 원본 경로 `data/validation/*`는 우리 프로젝트에서는 `data/validation/*`로 읽는다.
- 이 문서의 예전 평가 표현은 우리 프로젝트에서는 `validation 평가` 또는 `validation summary`로 읽는다.
- 원본 절대경로와 원본 파일명은 조사 근거로만 남기고, 현재 프로젝트 설계 문구에는 예전 운영체계 용어를 쓰지 않는다.

- 이번 조사는 `C:\sales_os`의 현재 웹앱 구현 상태를 답으로 삼지 않았다.
- 먼저 `C:\sales_os\docs\...` 문서를 읽어 무엇을 찾아야 하는지 기준을 잡았다.
- 그 다음 실제 코드와 실제 저장 산출물을 추적했다.
- 결론적으로, 문서에서 말하는 `modules/*`, `result_assets/*`, `common/run_storage/*`, `data/validation/*` 구조의 실제 구현 흔적은 `C:\sales_os` 안에서는 확인되지 않았고, 원본 구현은 `C:\sfe_master_ops` 쪽에 남아 있었다.
- 따라서 아래의 "실제 근거"는 `C:\sfe_master_ops` 코드와 `C:\sfe_master_ops\data\validation\...` 실산출물을 기준으로 정리한다.

---

## 1. 한 줄 결론

원본 프로젝트는 `모듈별 result asset 생성 -> validation 평가 요약 -> 모듈별 builder payload 생성 -> Builder input/payload/result_asset/html 생성 -> run bundle(pipeline_summary / artifacts.index / report_context)` 순서로 운영했고, 저장도 `company별 validation 폴더`와 그 아래 `runs/<run_id>` 구조로 나눠서 남겼다.

---

## 2. 원본 프로젝트에서 반드시 먼저 봐야 하는 파일 묶음

1. `C:\sfe_master_ops\ui\console\runner.py`
- 실제 run bundle을 로컬 파일로 쓰는 파일이다. `pipeline_summary.json`, `report_context.full.json`, `report_context.prompt.json`, `artifacts.index.json` 생성 위치가 여기서 확정된다.

2. `C:\sfe_master_ops\common\run_storage\_shared.py`
- run artifact를 Supabase와 run bundle 양쪽에서 어떻게 읽고 정리하는지 모여 있다. Agent가 무엇을 artifact로 보는지도 여기서 결정된다.

3. `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
- Builder가 실제로 어떤 파일을 쓰는지 가장 직접적으로 보여준다. `*_input_standard.json`, `*_payload_standard.json`, `*_result_asset.json`, `*.html` 생성이 여기 있다.

4. `C:\sfe_master_ops\scripts\validate_crm_with_ops.py`
- CRM result asset과 CRM builder payload를 실제로 만드는 파일이다.

5. `C:\sfe_master_ops\scripts\validate_prescription_with_ops.py`
- Prescription result asset, validation summary, 엑셀 산출물, builder payload를 실제로 쓰는 파일이다.

6. `C:\sfe_master_ops\scripts\validate_territory_with_ops.py`
- Territory result asset, builder payload, chunk asset, validation summary를 실제로 쓴다.

7. `C:\sfe_master_ops\scripts\validate_radar_with_ops.py`
- Radar input standard, radar result asset, radar validation summary를 실제로 쓴다.

8. `C:\sfe_master_ops\modules\builder\service.py`
- Builder가 result asset을 직접 계산하지 않고, payload를 받아 HTML로 바꾸는 방식과 chunk asset 복사 방식을 보여준다.

9. `C:\sfe_master_ops\result_assets\*.py`
- 각 모듈 result asset의 공식 JSON 구조가 정의되어 있다.

10. `C:\sfe_master_ops\data\validation\hangyeol_pharma\...`
- 실제 산출물 폴더 예시다. 문서가 아니라 실파일 구조를 확인할 수 있다.

보조 기준 문서:

- `C:\sales_os\docs\13_backend_logic_request_prompt.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
- `C:\sales_os\docs\07_data_flow.md`
- `C:\sales_os\docs\12_report_template_dependencies.md`

이 문서들은 흐름을 설명하지만, 실제 생성 코드는 아니다.

---

## 3. result asset 실제 구현 현황

### 공통 운영 방식

- result asset은 모듈 계산 결과를 다음 단계로 넘기는 공식 JSON 상자다.
- 각 모듈 service가 메모리 안에서 result asset 객체를 만들고,
- 각 `scripts/validate_*_with_ops.py`가 그것을 `data/validation/<company>/<module>/<module>_result_asset.json`으로 저장한다.

### CRM

- 생성 함수
  - `C:\sfe_master_ops\modules\crm\service.py`
  - `build_crm_result_asset(...)`
- 실제 저장 파일
  - `C:\sfe_master_ops\scripts\validate_crm_with_ops.py`
  - `(OUTPUT_ROOT / "crm_result_asset.json").write_text(...)`
- 입력
  - `CrmStandardActivity`
  - `CompanyMasterStandard`
- 출력
  - `CrmResultAsset`
  - 내부에 `activity_context`, `mapping_quality`, `rep_monthly_kpi_11`, `monthly_kpi_11`, `metric_version`
- 다음 소비자
  - Sandbox
  - Builder용 CRM payload 조립
  - run artifact 인덱싱

### Sandbox

- 생성 함수
  - `C:\sfe_master_ops\modules\sandbox\service.py`
  - `build_sandbox_result_asset(...)`
- 실제 저장 흔적
  - `C:\sfe_master_ops\data\validation\<company>\sandbox\sandbox_result_asset.json`
  - 코드 검색 기준으로 Sandbox result asset은 validation 흐름과 builder 검증 스크립트에서 소비된다.
- 입력
  - `SandboxInputStandard`
  - 내부에서 CRM, Sales, Target, Prescription 표준 입력 결합
- 출력
  - `SandboxResultAsset`
  - 내부에 `analysis_summary`, `domain_quality`, `join_quality`, `hospital_records`, `handoff_candidates`, `dashboard_payload`
- 다음 소비자
  - Territory
  - RADAR
  - Builder용 Sandbox template input

### Territory

- 생성 함수
  - `C:\sfe_master_ops\modules\territory\service.py`
  - `build_territory_result_asset(...)`
- 실제 저장 파일
  - `C:\sfe_master_ops\scripts\validate_territory_with_ops.py`
  - `(OUTPUT_ROOT / "territory_result_asset.json").write_text(...)`
- 입력
  - Sandbox의 `hospital_records`
  - 병원 지역/좌표/담당자 매핑
- 출력
  - `TerritoryResultAsset`
  - 내부에 `markers`, `routes`, `region_zones`, `gaps`, `coverage_summary`, `optimization_summary`
- 다음 소비자
  - Builder territory payload
  - territory validation evaluation

### Prescription

- 생성 함수
  - `C:\sfe_master_ops\modules\prescription\service.py`
  - `build_prescription_result_asset(...)`
- 실제 저장 파일
  - `C:\sfe_master_ops\scripts\validate_prescription_with_ops.py`
  - `(OUTPUT_ROOT / "prescription_result_asset.json").write_text(...)`
- 입력
  - `PrescriptionStandardFlow`
  - `PrescriptionGapRecord`
- 출력
  - `PrescriptionResultAsset`
  - 내부에 `lineage_summary`, `reconciliation_summary`, `validation_gap_summary`, `mapping_quality`
- 다음 소비자
  - Builder prescription payload
  - prescription validation evaluation
  - Sandbox와의 연결 판단 근거

### RADAR

- 생성 함수
  - `C:\sfe_master_ops\modules\radar\service.py`
  - `build_radar_result_asset(...)`
- 실제 저장 파일
  - `C:\sfe_master_ops\scripts\validate_radar_with_ops.py`
  - `(OUTPUT_ROOT / "radar_result_asset.json").write_text(...)`
- 입력
  - `RadarInputStandard`
  - 이 입력은 Sandbox result asset과 CRM result asset 기반으로 조립된다.
- 출력
  - `RadarResultAsset`
  - 내부에 `summary`, `signals`, `decision options`
- 다음 소비자
  - Builder radar payload
  - run artifact 인덱스

### 문서와 실제 코드 차이

- `C:\sales_os\docs\...`는 result asset 구조를 설명하지만, `C:\sales_os` 안에서 그것을 실제로 생성하는 `modules/*` 코드는 확인되지 않았다.
- 실제 생성 코드와 실제 파일 산출은 `C:\sfe_master_ops` 쪽에 있다.

---

## 4. builder payload 실제 구현 현황

### payload 조립 파일

- CRM
  - `C:\sfe_master_ops\modules\crm\builder_payload.py`
  - `build_crm_builder_payload(...)`
  - 주석에 `Builder는 KPI를 다시 계산하지 않고 crm_result_asset에 이미 들어 있는 결과를 화면용 구조로 조립한다.` 라고 직접 적혀 있다.

- Sandbox
  - `C:\sfe_master_ops\modules\sandbox\service.py`
  - `_build_report_template_payload(...)`
  - `_build_dashboard_block_payload(...)`
  - `dashboard_payload.template_payload`, `dashboard_payload.block_payload` 형태로 result asset 안에 포함된다.

- Territory
  - `C:\sfe_master_ops\modules\territory\builder_payload.py`
  - `build_territory_builder_payload(...)`

- Prescription
  - `C:\sfe_master_ops\modules\prescription\builder_payload.py`
  - `build_prescription_builder_payload(...)`

- RADAR
  - `C:\sfe_master_ops\modules\radar\builder_payload.py`
  - `build_radar_builder_payload(...)`

### Builder가 실제로 읽는 것

- Builder는 raw를 읽지 않는다.
- `C:\sfe_master_ops\modules\builder\service.py` 기준으로:
  - Sandbox는 `SandboxResultAsset.dashboard_payload.template_payload`
  - CRM / Territory / Prescription은 미리 저장된 `*_builder_payload.json`
  - RADAR는 `RadarResultAsset`에서 builder payload를 다시 조립
- 그 다음 공통 구조로 바꾼다.
  - `BuilderInputStandard`
  - `BuilderPayloadStandard`
  - `HtmlBuilderResultAsset`

### 템플릿 연결 방식

- `C:\sfe_master_ops\modules\builder\service.py`
  - `build_crm_template_input(...)`
  - `build_sandbox_template_input(...)`
  - `build_territory_template_input(...)`
  - `build_prescription_template_input(...)`
  - `build_radar_template_input(...)`
- 각 함수가
  - 어떤 템플릿을 쓸지
  - 어떤 source asset에서 왔는지
  - 어떤 payload seed를 템플릿에 넣을지
  를 `BuilderInputStandard`로 고정한다.

### result asset과 payload의 차이

- result asset
  - 다음 단계 전달용 공식 계산 결과
  - 품질 평가와 handoff 판단의 기준
  - 예: `crm_result_asset.json`, `sandbox_result_asset.json`

- builder payload
  - 화면 렌더용 정리 상자
  - 템플릿이 바로 읽을 수 있게 만든 표현 데이터
  - 예: `crm_builder_payload.json`, `territory_builder_payload.json`

- Builder 결과물
  - 최종 HTML과 Builder 전용 표준 파일
  - 예: `crm_analysis_preview_input_standard.json`, `crm_analysis_preview_payload_standard.json`, `crm_analysis_preview_result_asset.json`, `crm_analysis_preview.html`

### 실제 생성 파일

- `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
  - `write_builder_output(...)`
  - 생성:
    - `*_input_standard.json`
    - `*_payload_standard.json`
    - `*_result_asset.json`
    - `*.html`

---

## 5. artifact / report context / run 저장 현황

### A. company 기준 기본 저장 구조

실제 루트:

- `C:\sfe_master_ops\data\validation\<company_key>\crm`
- `C:\sfe_master_ops\data\validation\<company_key>\prescription`
- `C:\sfe_master_ops\data\validation\<company_key>\sandbox`
- `C:\sfe_master_ops\data\validation\<company_key>\territory`
- `C:\sfe_master_ops\data\validation\<company_key>\radar`
- `C:\sfe_master_ops\data\validation\<company_key>\builder`
- `C:\sfe_master_ops\data\validation\<company_key>\pipeline`
- `C:\sfe_master_ops\data\validation\<company_key>\runs\<run_id>`

### B. 모듈 산출물 저장

- CRM
  - `crm_result_asset.json`
  - `crm_builder_payload.json`
  - `crm_validation_summary.json`
  - `crm_ops_evaluation.json`
  - `crm_builder_payload_assets/*.js`

- Prescription
  - `prescription_result_asset.json`
  - `prescription_builder_payload.json`
  - `prescription_validation_summary.json`
  - `prescription_ops_evaluation.json`
  - 부가 xlsx 산출물 여러 개

- Territory
  - `territory_result_asset.json`
  - `territory_builder_payload.json`
  - `territory_validation_summary.json`
  - `territory_ops_evaluation.json`
  - `territory_builder_payload_assets/*.js`

- RADAR
  - `radar_input_standard.json`
  - `radar_result_asset.json`
  - `radar_validation_summary.json`

- Builder
  - `*_preview_input_standard.json`
  - `*_preview_payload_standard.json`
  - `*_preview_result_asset.json`
  - `*_preview.html`
  - `*_preview_assets/*.js`
  - `builder_validation_summary.json`
  - `total_valid_preview.html`

### C. pipeline_summary / artifacts.index / report_context 저장

생성 주체:

- `C:\sfe_master_ops\ui\console\runner.py`
  - `_write_local_run_bundle(...)`

실제 생성 파일:

- `run_meta.json`
- `pipeline_summary.json`
- `report_context.full.json`
- `report_context.prompt.json`
- `artifacts.index.json`
- `execution_analysis.md`

실제 저장 위치:

- `C:\sfe_master_ops\data\validation\<company_key>\runs\<run_id>\...`

### D. pipeline 레벨 요약 저장

생성 주체:

- `C:\sfe_master_ops\scripts\validate_full_pipeline.py`
  - `(output_root / "pipeline_validation_summary.json").write_text(...)`

저장 위치:

- `C:\sfe_master_ops\data\validation\<company_key>\pipeline\pipeline_validation_summary.json`

같은 폴더의 추가 파일:

- `console_run_history.jsonl`
- `latest_execution_analysis.md`
- `execution_analysis_<run_id>.md`

### E. artifacts.index.json 안에 무엇이 들어가는가

생성 주체:

- `C:\sfe_master_ops\ui\console\runner.py`
  - `_build_local_run_artifacts_index(...)`

구성 방식:

- 각 step의 `summary_path`를 읽어 validation summary artifact로 등록
- builder 단계의 각 report에 대해
  - `html`
  - `input_standard`
  - `payload_standard`
  - `result_asset`
  를 artifact row로 등록

즉, 실제 artifact index는 "모듈 validation 요약 + builder 산출물 묶음" 구조다.

### F. report_context는 어디서 조립되는가

- `C:\sfe_master_ops\ui\console\runner.py`
  - `_build_local_run_contexts(...)`
- `C:\sfe_master_ops\common\run_storage\_shared.py`
  - `_build_report_contexts_from_pipeline_summary(...)`
  - `_resolve_report_contexts(...)`

full / prompt 차이:

- `report_context.full.json`
  - step status, evidence_index, linked_artifacts, key_findings 같이 더 많은 근거

- `report_context.prompt.json`
  - Agent 질의에 바로 쓰기 위한 축약 컨텍스트
  - `forbidden_actions: ["recalculate_kpi", "raw_rejoin"]`가 들어간다.

### G. Supabase 저장

생성 주체:

- `C:\sfe_master_ops\common\run_storage\_shared.py`
  - `save_pipeline_run_to_supabase(...)`

저장 테이블:

- `runs`
- `run_steps`
- `run_artifacts`
- `run_report_context`
- `agent_chat_logs`

즉, 로컬 파일 저장과 Supabase 저장을 둘 다 운영했다.

---

## 6. 지금 웹 프로젝트에서 재구현할 때 가져와야 할 것

### 그대로 가져올 규칙

1. `result asset -> builder payload -> builder input/payload/result_asset/html`의 2단 분리
- 계산 결과와 화면용 표현 데이터를 섞지 않는 구조라서 그대로 가져갈 가치가 크다.

2. `company별 validation 폴더`와 `runs/<run_id>` 분리
- 회사 기준 장기 보관과 실행 기준 추적을 동시에 만족한다.

3. run bundle 4종
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`
- Agent, Run Detail, Artifact 탭을 만들 때 바로 재사용 가능하다.

4. Builder render-only 원칙
- 실제 코드도 이 원칙으로 짜여 있다.
- Builder는 payload만 읽고 KPI를 다시 계산하지 않는다.

5. chunk asset 구조
- 큰 payload를 `*_assets/*.js`로 나누어 HTML 초기 로딩 부담을 줄이는 방식이다.
- CRM, Sandbox, Territory, Prescription에 모두 실제로 사용됐다.

### 웹에 맞게 새로 계약해야 할 것

1. `C:\sales_os` 기준 API 경로와 현재 원본 코드 경로의 연결 계약
- 문서는 `/api/companies/.../runs/...`를 말하지만, 원본 구현은 파일/스크립트 중심이다.
- 웹에서는 이 파일 산출물을 API 응답 모델로 다시 고정해야 한다.

2. result asset 저장 주체
- 원본은 `validate_*_with_ops.py` 스크립트가 파일을 썼다.
- 웹에서는 worker/job 기반으로 바꿔야 한다.

3. builder 실행 주체
- 원본은 파일 기반 템플릿 렌더였다.
- 웹에서는 재렌더 요청, 상태 추적, 다운로드 링크를 API 계약으로 묶어야 한다.

4. legacy fallback 범위
- 원본은 `pipeline_validation_summary.json`만 있는 legacy fallback도 지원한다.
- 웹에서는 이 fallback을 어디까지 유지할지 결정이 필요하다.

### 먼저 구현할 순서

1. 모듈별 result asset JSON 계약 고정
2. 모듈별 builder payload JSON 계약 고정
3. Builder output 4종 계약 고정
   - `input_standard`
   - `payload_standard`
   - `result_asset`
   - `html`
4. run bundle 4종 계약 고정
   - `pipeline_summary`
   - `artifacts.index`
   - `report_context.full`
   - `report_context.prompt`
5. company 저장 경로와 run 저장 경로를 API/DB 구조로 옮기기
6. 마지막에 Agent / Run Detail / Artifacts UI 연결

---

## 7. 구현 상태와 재사용 가능성 판단

### 지금 바로 재사용 가능한 것

- `result_assets/*.py`의 모듈 결과 구조
- `modules/*/builder_payload.py`의 화면용 payload 구조
- `modules/builder/service.py`의 Builder 입력/출력 표준
- `ui/console/runner.py`의 run bundle 생성 방식
- `common/run_storage/_shared.py`의 artifact index / report context 조립 규칙

### 이름만 있고 `C:\sales_os` 안에 실제 구현이 없는 것

- `modules/*`
- `result_assets/*`
- `common/run_storage/*`
- `pipeline_summary.json`, `artifacts.index.json`, `report_context.*.json` 생성 코드

즉, `C:\sales_os` 문서 안에서 설명한 구조는 개념 기준으로는 맞지만, 그 폴더 안에서 실행 코드까지 이어진 것은 확인되지 않았다.

### 새로 계약해야 하는 것

- 웹 API 응답 형태
- worker/job 상태 모델
- 파일 기반 산출물을 DB/Storage와 어떻게 병행 보관할지
- Builder 재실행과 run 재조회 권한/상태 모델

---

## 8. 실제 근거 파일 목록

### 기준 문서

- `C:\sales_os\docs\13_backend_logic_request_prompt.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
- `C:\sales_os\docs\backend_architecture\SALES_DATA_OS_FRONTEND_API_TABLE.md`
- `C:\sales_os\docs\archive_part2_status_source_of_truth.md`
- `C:\sales_os\docs\07_data_flow.md`
- `C:\sales_os\docs\12_report_template_dependencies.md`
- `C:\sales_os\docs\task.md`

### 실제 구현 코드

- `C:\sfe_master_ops\ui\console\runner.py`
- `C:\sfe_master_ops\common\run_storage\_shared.py`
- `C:\sfe_master_ops\common\run_storage\report_context.py`
- `C:\sfe_master_ops\common\run_storage\runs.py`
- `C:\sfe_master_ops\modules\crm\service.py`
- `C:\sfe_master_ops\modules\sandbox\service.py`
- `C:\sfe_master_ops\modules\territory\service.py`
- `C:\sfe_master_ops\modules\prescription\service.py`
- `C:\sfe_master_ops\modules\radar\service.py`
- `C:\sfe_master_ops\modules\crm\builder_payload.py`
- `C:\sfe_master_ops\modules\sandbox\builder_payload.py`
- `C:\sfe_master_ops\modules\territory\builder_payload.py`
- `C:\sfe_master_ops\modules\prescription\builder_payload.py`
- `C:\sfe_master_ops\modules\radar\builder_payload.py`
- `C:\sfe_master_ops\modules\builder\service.py`
- `C:\sfe_master_ops\result_assets\crm_result_asset.py`
- `C:\sfe_master_ops\result_assets\sandbox_result_asset.py`
- `C:\sfe_master_ops\result_assets\territory_result_asset.py`
- `C:\sfe_master_ops\result_assets\prescription_result_asset.py`
- `C:\sfe_master_ops\result_assets\radar_result_asset.py`
- `C:\sfe_master_ops\scripts\validate_crm_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_prescription_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_territory_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_radar_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_full_pipeline.py`

### 실제 산출물 폴더 예시

- `C:\sfe_master_ops\data\validation\hangyeol_pharma\crm`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\prescription`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\territory`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\radar`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\builder`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\pipeline`
- `C:\sfe_master_ops\data\validation\hangyeol_pharma\runs`

---

## 최종 정리

- `C:\sales_os`는 이번 조사에서 "무엇을 만들어야 하는지"를 설명하는 문서 기준 저장소였다.
- 실제 원본 구현 근거는 `C:\sfe_master_ops`에 남아 있었다.
- 원본 운영 방식의 핵심은 `모듈 결과(result asset)`와 `화면 주입용 payload`를 분리하고,
- 마지막에 `run bundle`을 따로 만들어 Agent/Run Detail/Artifacts가 그것을 읽게 한 구조였다.
- 웹 프로젝트도 이 분리를 그대로 가져가는 것이 가장 안전하다.

