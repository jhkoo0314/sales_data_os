# 원본 프로젝트 Builder 운영 조사

작성일: 2026-03-31  
기준: `C:\sales_os\docs\...` 문서는 참고 기준으로만 읽고, 실제 근거는 원본 프로젝트 코드베이스 `C:\sfe_master_ops`에서 확인

## 우리 프로젝트 적용 기준

- 이 문서의 원본 경로 `data/validation/*`는 우리 프로젝트에서는 `data/validation/*`로 읽는다.
- HTML 안의 예전 전역 변수명이나 원본 파일명에 과거 용어가 남아 있어도, 우리 프로젝트 설명과 구현 계약에서는 `validation` 기준으로 정리한다.
- 원본 절대경로는 조사 근거로만 남기고, 현재 프로젝트 용어는 `Builder`, `payload`, `validation`, `runs` 기준으로 통일한다.

## 1. 한 줄 결론

원본 프로젝트의 Builder는 `계산기`가 아니라 `검증 통과된 result asset / builder payload를 템플릿에 주입해 HTML·preview asset·run bundle 메타를 만드는 render-only 레이어`로 운영됐다.

## 2. 원본 프로젝트에서 반드시 먼저 봐야 하는 파일 묶음

1. `modules/builder/service.py`
- Builder의 실제 중심 파일이다.
- 어떤 입력을 받고 어떤 HTML 파일 이름으로 내보내는지, chunk asset을 어떻게 만드는지가 여기 있다.

2. `scripts/validate_builder_with_ops.py`
- Builder 결과물을 실제로 파일로 저장하는 실행 스크립트다.
- `*_preview.html`, `*_input_standard.json`, `*_payload_standard.json`, `*_result_asset.json`, `builder_validation_summary.json`, `total_valid_preview.html` 생성 흐름이 여기 있다.

3. `modules/builder/schemas.py`
- Builder 입력 표준, payload 표준, HTML result asset 표준이 여기 정의돼 있다.
- 웹에서 다시 만들 때 가장 먼저 옮겨야 할 계약 파일이다.

4. `ui/console/runner.py`
- Builder 산출물이 run bundle에 어떻게 연결되는지 보여준다.
- `artifacts.index.json`, `report_context.full.json`, `report_context.prompt.json`, `pipeline_summary.json` 연결 근거가 있다.

5. `common/run_storage/_shared.py`
- run artifact와 report context를 로컬 저장 구조와 Supabase 저장 구조로 어떻게 변환했는지 보여준다.

6. 모듈별 payload 조립 파일
- `modules/crm/builder_payload.py`
- `modules/sandbox/builders/template_payload_builder.py`
- `modules/territory/builder_payload.py`
- `modules/prescription/builder_payload.py`
- `modules/radar/builder_payload.py`
- Builder가 직접 계산하지 않고, 모듈별로 화면용 payload를 넘겨받았다는 근거다.

7. 실제 템플릿 파일
- `templates/crm_analysis_template.html`
- `templates/report_template.html`
- `templates/territory_optimizer_template.html`
- `templates/prescription_flow_template.html`
- `templates/radar_report_template.html`
- `templates/total_valid_templates.html`

## 3. Builder 실제 구현 현황

### 위치

- 실제 Builder 코드는 `modules/builder/`에 있었다.
- 템플릿은 `templates/` 아래에 있었다.
- 실행 저장은 `scripts/validate_builder_with_ops.py`와 `ui/console/runner.py`가 이어서 처리했다.

### 입력

Builder가 직접 받는 공통 입력 규격은 `BuilderInputStandard`였다.

근거: `modules/builder/schemas.py`

핵심 필드:
- `template_key`
- `template_path`
- `report_title`
- `executive_summary`
- `source_references`
- `source_versions`
- `payload_seed`
- `source_modules`

즉 Builder는 raw 파일을 읽지 않고, 이미 정리된 `payload_seed`를 받았다.

모듈별 실제 입력 방식:

- Sandbox
  - 입력: `SandboxResultAsset`
  - Builder는 `asset.dashboard_payload.template_payload`를 사용
  - 근거: `modules/builder/service.py`의 `build_sandbox_template_input`

- CRM
  - 입력: `crm_builder_payload.json`
  - Builder는 저장된 payload JSON을 다시 읽어 템플릿 입력으로 바꿈
  - 근거: `modules/builder/service.py`의 `build_crm_template_input`

- Territory
  - 입력: `territory_builder_payload.json`
  - 근거: `modules/builder/service.py`의 `build_territory_template_input`

- Prescription
  - 입력: `prescription_builder_payload.json`
  - 근거: `modules/builder/service.py`의 `build_prescription_template_input`

- RADAR
  - 입력: `RadarResultAsset`
  - Builder 직전 단계에서 `build_radar_builder_payload(asset)`로 payload 생성
  - 근거: `modules/builder/service.py`, `modules/radar/builder_payload.py`

### 핵심 처리

실제 Builder 처리 순서는 아래였다.

1. 모듈별 입력을 `BuilderInputStandard`로 맞춤
2. `build_template_payload()`로 `BuilderPayloadStandard` 생성
3. 필요하면 chunk asset 준비
4. `render_builder_html()`로 HTML 문자열 렌더
5. `build_html_builder_asset()`로 HTML result asset 생성
6. 스크립트가 HTML / JSON 파일들을 실제 저장

근거:
- `modules/builder/service.py`
- `scripts/validate_builder_with_ops.py`

### 출력

모듈별 기본 출력 이름은 `modules/builder/service.py`에 고정돼 있다.

- Sandbox: `sandbox_report_preview.html`
- Territory: `territory_map_preview.html`
- Prescription: `prescription_flow_preview.html`
- CRM: `crm_analysis_preview.html`
- RADAR: `radar_report_preview.html`

실제 저장 파일 묶음은 `scripts/validate_builder_with_ops.py`의 `write_builder_output()`가 만들었다.

저장 파일 종류:
- `{name}.html`
- `{name}_input_standard.json`
- `{name}_payload_standard.json`
- `{name}_result_asset.json`

실제 생성 흔적:
- `data/validation/company_000002/builder/`

확인된 파일 예:
- `sandbox_report_preview.html`
- `sandbox_report_preview_input_standard.json`
- `sandbox_report_preview_payload_standard.json`
- `sandbox_report_preview_result_asset.json`
- `crm_analysis_preview.html`
- `territory_map_preview.html`
- `prescription_flow_preview.html`
- `radar_report_preview.html`
- `builder_validation_summary.json`
- `total_valid_preview.html`

## 4. 템플릿 / payload 매핑 현황

### CRM

- 템플릿 파일: `templates/crm_analysis_template.html`
- 입력 payload:
  - `crm_builder_payload.json`
  - 내부적으로는 `window.__CRM_DATA__ = ...` 방식으로 주입
- 생성 결과물:
  - `crm_analysis_preview.html`
  - `crm_analysis_preview_input_standard.json`
  - `crm_analysis_preview_payload_standard.json`
  - `crm_analysis_preview_result_asset.json`
  - 필요 시 `crm_analysis_preview_assets/*.js`
- 근거 파일:
  - `modules/builder/service.py`
  - `modules/crm/builder_payload.py`
  - `scripts/validate_builder_with_ops.py`

CRM payload 내용 특징:
- `overview`
- `activity_context`
- `mapping_quality`
- `logic_reference`
- `filters`
- `scope_data`

중요 근거 문구:
- `modules/crm/builder_payload.py`
  - `Builder는 KPI를 다시 계산하지 않고 crm_result_asset에 이미 들어 있는 결과를 화면용 구조로 조립한다.`
  - `Builder is rendering-only. KPI source: crm_result_asset (rep_monthly_kpi_11/monthly_kpi_11).`

### Sandbox

- 템플릿 파일: `templates/report_template.html`
- 입력 payload:
  - `SandboxResultAsset.dashboard_payload.template_payload`
  - 렌더 시 `const db = ...` 로 HTML 안에 주입
- 생성 결과물:
  - `sandbox_report_preview.html`
  - `sandbox_report_preview_input_standard.json`
  - `sandbox_report_preview_payload_standard.json`
  - `sandbox_report_preview_result_asset.json`
  - `sandbox_report_preview_assets/*.js`
- 근거 파일:
  - `modules/builder/service.py`
  - `modules/sandbox/service.py`
  - `modules/sandbox/builders/template_payload_builder.py`
  - `scripts/validate_builder_with_ops.py`

Sandbox payload 내용 특징:
- `official_kpi_6`
- `branches`
- `products`
- `total_prod_analysis`
- `total`
- `data_health`
- `missing_data`
- `block_payload`

주의:
- Sandbox payload 조립 파일은 `template_payload_builder.py` 안에서 일부 추가 계산을 포함한다.
- 즉 원본 프로젝트에서는 “Builder 서비스”는 render-only였지만, Sandbox의 “payload 조립 단계”는 화면용 요약 계산을 일부 수행했다.
- 이 부분은 웹 재구현 시 `payload assembler`와 `KPI engine` 경계를 다시 분리해서 볼 필요가 있다.

### Territory

- 템플릿 파일: `templates/territory_optimizer_template.html`
- 입력 payload:
  - `territory_builder_payload.json`
  - 렌더 시 `window.__TERRITORY_DATA__ = ...`
- 생성 결과물:
  - `territory_map_preview.html`
  - `territory_map_preview_input_standard.json`
  - `territory_map_preview_payload_standard.json`
  - `territory_map_preview_result_asset.json`
  - `territory_map_preview_assets/*.js`
  - `territory_map_preview_assets/leaflet/*`
- 근거 파일:
  - `modules/builder/service.py`
  - `modules/territory/builder_payload.py`
  - `scripts/validate_builder_with_ops.py`

Territory 특수 처리:
- `prepare_territory_chunk_assets()`가 `templates/vendor/leaflet`를 preview asset 폴더로 복사했다.
- 즉 Territory는 일반 HTML만이 아니라 지도용 정적 자산까지 같이 복사했다.

### Prescription

- 템플릿 파일: `templates/prescription_flow_template.html`
- 입력 payload:
  - `prescription_builder_payload.json`
  - 렌더 시 `window.__PRESCRIPTION_DATA__ = ...`
- 생성 결과물:
  - `prescription_flow_preview.html`
  - `prescription_flow_preview_input_standard.json`
  - `prescription_flow_preview_payload_standard.json`
  - `prescription_flow_preview_result_asset.json`
  - `prescription_flow_preview_assets/*.js`
- 근거 파일:
  - `modules/builder/service.py`
  - `modules/prescription/builder_payload.py`
  - `scripts/validate_builder_with_ops.py`

Prescription payload 내용 특징:
- `build_prescription_builder_context(...)` 결과를 그대로 사용
- 세부 데이터는 chunk asset으로 분리 가능
- bucket 예:
  - `claims`
  - `gaps`
  - `hospital_traces`
  - `rep_kpis`

### RADAR

- 템플릿 파일: `templates/radar_report_template.html`
- 입력 payload:
  - `RadarResultAsset`에서 `build_radar_builder_payload()`로 생성된 dict
  - 렌더 시 `window.__RADAR_DATA__ = ...`
- 생성 결과물:
  - `radar_report_preview.html`
  - `radar_report_preview_input_standard.json`
  - `radar_report_preview_payload_standard.json`
  - `radar_report_preview_result_asset.json`
- 근거 파일:
  - `modules/builder/service.py`
  - `modules/radar/builder_payload.py`
  - `scripts/validate_builder_with_ops.py`

### Total Validation

- 템플릿 파일: `templates/total_valid_templates.html`
- 입력 payload:
  - 모듈별 preview HTML 경로를 모은 `reports_payload`
  - HTML 안에는 total validation 데이터를 담는 전역 payload 형태로 주입
- 생성 결과물:
  - `total_valid_preview.html`
- 근거 파일:
  - `scripts/validate_builder_with_ops.py`의 `write_total_valid_output`

Total Validation의 실제 역할:
- 각 모듈 preview HTML을 iframe 형태로 묶는 “허브 화면” 역할
- 다시 계산하지 않고, 이미 만들어진 각 HTML을 연결만 했다

## 5. artifact / report context / bundle 현황

### 어떤 파일이 생성됐는가

Builder와 run bundle 단계에서 확인된 파일:

- builder 폴더
  - `builder_validation_summary.json`
  - `*_preview.html`
  - `*_input_standard.json`
  - `*_payload_standard.json`
  - `*_result_asset.json`
  - `*_preview_assets/*.js`
  - `territory_map_preview_assets/leaflet/*`

- run 폴더
  - `pipeline_summary.json`
  - `artifacts.index.json`
  - `report_context.full.json`
  - `report_context.prompt.json`
  - `run_meta.json`
  - `execution_analysis.md`

실제 run 폴더 확인:
- `data/validation/company_000002/runs/7fe0fd89-ed90-43a9-9001-482178f9e7ec/`

### 어디에 저장됐는가

회사 기준 저장:
- `data/validation/{company_key}/builder/`
- `data/validation/{company_key}/runs/{run_id}/`
- `data/validation/{company_key}/pipeline/`

실제 확인 경로 예:
- `data/validation/company_000002/builder/`
- `data/validation/company_000002/runs/7fe0fd89-ed90-43a9-9001-482178f9e7ec/`

### 누가 만들었는가

- Builder preview 파일
  - 생성 주체: `scripts/validate_builder_with_ops.py`

- run bundle 파일
  - 생성 주체: `ui/console/runner.py`의 `_write_local_run_bundle`

- Supabase용 artifact row / report context row
  - 생성 주체: `common/run_storage/_shared.py`

### 어떤 화면이나 기능이 소비했는가

- `artifacts.index.json`
  - run artifact 목록 조회
  - report HTML / payload / result asset 연결

- `report_context.full.json`
  - Agent가 충분한 배경 문맥을 읽는 용도

- `report_context.prompt.json`
  - Agent가 짧은 답변 문맥을 읽는 용도

- `total_valid_preview.html`
  - 모듈별 결과를 한 화면에서 모아보는 허브 화면

### Builder와 run 저장의 실제 연결 방식

`ui/console/runner.py`의 `_build_local_run_artifacts_index()`는 Builder 결과를 아래 artifact type으로 등록했다.

- `report_html`
- `report_input_standard`
- `report_payload_standard`
- `report_result_asset`

`artifact_role`에는 아래 report key가 들어갔다.

- `crm_analysis`
- `sandbox_report`
- `territory_map`
- `prescription_flow`
- `radar_report`
- `total_valid`

즉 Builder 결과는 “파일만 생성”하고 끝난 것이 아니라, run 중심 메타 구조 안에 다시 등록됐다.

## 6. Builder 역할 경계 근거

### Builder가 하지 않은 일

원본 프로젝트 기준으로 Builder가 하지 않은 일:

- KPI 계산
- validation 판정
- raw 직접 해석
- 회사별 업로드 파일 직접 join

### payload 소비 전용이었다는 근거

직접 근거 문구:

- `modules/builder/service.py`
  - `Builder is render-only and does not recalculate KPI.`
  - `Builder consumes validated payloads only.`

- `modules/builder/schemas.py`
  - `Validation-approved Result Asset → HTML 렌더링을 위한 표준 페이로드.`
  - `Builder는 이 객체를 받아 HTML을 생성한다.`

- `modules/radar/builder_payload.py`
  - `Builder remains render-only and consumes this payload.`

- `modules/crm/builder_payload.py`
  - `Builder는 KPI를 다시 계산하지 않고 crm_result_asset에 이미 들어 있는 결과를 화면용 구조로 조립한다.`

### 재계산 금지 근거

- `modules/builder/service.py`는 템플릿에 payload를 문자열로 주입하거나 window 변수로 넣는 역할만 한다.
- `render_builder_html()`에는 KPI 계산 함수가 없고, 템플릿 치환만 있다.
- `build_template_payload()`도 입력 payload를 output 이름과 render mode에 맞춰 감싸는 역할만 한다.

### 예외적으로 봐야 하는 부분

- Sandbox의 `modules/sandbox/builders/template_payload_builder.py`는 Builder 서비스가 아니라, “Builder용 payload 조립기”에 가깝다.
- 이 파일은 공식 KPI 6을 다시 만드는 파일은 아니지만, branch/member/product 분석용 추가 요약 계산을 많이 포함한다.
- 따라서 웹 재구현에서는 이 레이어를 `builder`로 그대로 합치지 말고, `module payload assembler` 또는 `presentation prep layer`로 분리하는 편이 안전하다.

## 7. 지금 웹 프로젝트에서 재구현할 때 가져와야 할 것

### 그대로 가져올 규칙

1. Builder는 render-only로 유지
- 원본 프로젝트의 가장 중요한 운영 원칙이다.

2. Builder 입력을 표준 계약으로 고정
- `BuilderInputStandard`
- `BuilderPayloadStandard`
- `HtmlBuilderResultAsset`

3. 모듈별 payload 조립과 Builder 렌더를 분리
- CRM / Territory / Prescription / RADAR는 이 분리가 비교적 잘 되어 있었다.

4. HTML 외에도 `input_standard`, `payload_standard`, `result_asset`를 같이 남기기
- 디버깅과 run 추적에 매우 유용했다.

5. Builder 결과를 run bundle 메타와 반드시 연결
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`
- `pipeline_summary.json`

6. 무거운 데이터는 chunk asset 구조 유지
- Sandbox branch
- CRM scope
- Territory rep/month
- Prescription detail rows

### 웹에 맞게 새로 계약해야 할 것

1. 템플릿 위치
- 현재 기준 템플릿 경로는 `templates/`
- 과거 문서의 `workers/templates/reports/` 표기는 레거시 표기다
- 웹 프로젝트에서는 `templates/` 기준으로 유지한다

2. 템플릿 엔진 방식
- 참고 문서는 `jinja2` + `playwright`를 말하지만, 원본 코드의 실제 HTML 주입은 `정규식 치환 + inline script/window 변수`였다.
- 어떤 방식을 공식으로 잠글지 새로 결정해야 한다.

3. Sandbox payload 조립 경계
- 현재 원본 구현은 payload builder 안에 화면용 추가 분석이 많다.
- 웹에서는 `공식 KPI`와 `화면용 가공`을 더 명확히 나눠야 한다.

4. Total Validation 허브의 표현 방식
- 원본은 단일 HTML 허브였다.
- 웹에서는 iframe hub로 유지할지, 탭/라우트 기반으로 바꿀지 정해야 한다.

5. Builder 저장 위치 계약
- 로컬 파일 저장 중심을 유지할지
- Supabase Storage / DB 메타 중심으로 갈지
- 둘 다 병행할지 정해야 한다.

### 먼저 구현할 순서

1. Builder 계약부터 고정
- `BuilderInputStandard`
- `BuilderPayloadStandard`
- `HtmlBuilderResultAsset`

2. run artifact 계약 고정
- `report_html`
- `report_input_standard`
- `report_payload_standard`
- `report_result_asset`

3. 공통 템플릿 주입기 구현
- `template_key`
- `render_mode`
- output naming 규칙

4. CRM / Territory / Prescription / RADAR payload 연결 구현
- 이 4개는 원본 구조를 비교적 그대로 가져오기 쉽다.

5. Sandbox payload 조립 계층 재정리 후 연결
- 가장 복잡한 부분이므로 나중에 붙이는 편이 안전하다.

6. Total Validation 허브 구현
- 마지막에 report link만 묶는 방식으로 붙이면 된다.

## 8. 실제 근거 파일 목록

우선순위 순:

1. `C:\sfe_master_ops\modules\builder\service.py`
2. `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`
3. `C:\sfe_master_ops\modules\builder\schemas.py`
4. `C:\sfe_master_ops\ui\console\runner.py`
5. `C:\sfe_master_ops\common\run_storage\_shared.py`
6. `C:\sfe_master_ops\modules\crm\builder_payload.py`
7. `C:\sfe_master_ops\modules\sandbox\service.py`
8. `C:\sfe_master_ops\modules\sandbox\builders\template_payload_builder.py`
9. `C:\sfe_master_ops\modules\territory\builder_payload.py`
10. `C:\sfe_master_ops\modules\prescription\builder_payload.py`
11. `C:\sfe_master_ops\modules\radar\builder_payload.py`
12. `C:\sfe_master_ops\templates\crm_analysis_template.html`
13. `C:\sfe_master_ops\templates\report_template.html`
14. `C:\sfe_master_ops\templates\territory_optimizer_template.html`
15. `C:\sfe_master_ops\templates\prescription_flow_template.html`
16. `C:\sfe_master_ops\templates\radar_report_template.html`
17. `C:\sfe_master_ops\templates\total_valid_templates.html`
18. `C:\sfe_master_ops\data\validation\company_000002\builder\`
19. `C:\sfe_master_ops\data\validation\company_000002\runs\7fe0fd89-ed90-43a9-9001-482178f9e7ec\`
20. `C:\sales_os\docs\12_report_template_dependencies.md`
21. `C:\sales_os\docs\07_data_flow.md`

## 문서와 실제 코드 차이

이번 조사에서 확인된 차이:

1. 템플릿 위치 차이
- 과거 참고 문서: `workers/templates/reports/`
- 현재/원본 구현: `templates/`

2. 템플릿 이름 차이
- 참고 문서에는 `sandbox_report_template.html`
- 실제 원본 구현 파일은 `templates/report_template.html`

3. 렌더 방식 차이
- 참고 문서에는 `jinja2`, `playwright` 중심 설명이 있다.
- 실제 원본 구현은 `modules/builder/service.py`에서 정규식으로 데이터 스크립트를 주입하는 방식이 확인된다.

즉 웹 프로젝트 재구현 시에는 `문서의 이상적 설계`보다 `원본 코드의 실제 운영 구조`를 먼저 가져오는 것이 맞다.

