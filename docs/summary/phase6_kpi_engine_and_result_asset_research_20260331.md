# Phase 6 KPI 엔진 / Result Asset 조사 메모

작성일: 2026-03-31

## 1. 한 줄 결론

- `sales_os`의 Phase 6은 먼저 `원본 KPI 엔진 -> 모듈 service -> result asset` 순서로 따라가는 것이 가장 안전하다.
- `templates/`는 계산식의 기준이 아니라, 이미 계산된 값을 어떤 상자 형태로 넘겨야 하는지 확인하는 용도로만 써야 한다.
- 구현 순서는 `CRM -> Sandbox -> Territory/Prescription -> RADAR 참고`가 가장 안정적이다.

## 2. 모듈별 조사 결과

### CRM

- 엔진 파일 경로: `C:\sfe_master_ops\modules\kpi\crm_engine.py`
- service 파일 경로: `C:\sfe_master_ops\modules\crm\service.py`
- result asset 정의: `C:\sfe_master_ops\result_assets\crm_result_asset.py`
- builder payload 연결: `C:\sfe_master_ops\modules\crm\builder_payload.py`
- 저장/검증 스크립트: `C:\sfe_master_ops\scripts\validate_crm_with_ops.py`

입력:

- `CrmStandardActivity` 목록
- `CompanyMasterStandard` 목록

계산 내용:

- `compute_crm_kpi_bundle(...)`
- 담당자 x 월 기준으로 CRM 11개 KPI를 계산한다.
- 확인된 KPI 이름:
  - `HIR`
  - `RTR`
  - `BCR`
  - `PHR`
  - `NAR`
  - `AHS`
  - `PV`
  - `FGR`
  - `PI`
  - `TRG`
  - `SWR`
- 엔진은 `RepMonthAggregate`로 먼저 모으고, 그 뒤 `_finalize_metrics(...)`에서 KPI를 만든다.
- 신뢰도, 품질, 영향도, next action, 행동유형 8축 분포까지 같이 계산한다.

출력:

- `list[RepMonthlyKpi11]`
- `list[MonthlyKpi11Summary]`
- `metric_version`

result asset 생성 위치:

- `build_crm_result_asset(...)` in `C:\sfe_master_ops\modules\crm\service.py`
- 여기서 KPI만 넣는 것이 아니라 아래도 같이 담는다.
  - `behavior_profiles`
  - `monthly_kpi`
  - `activity_context`
  - `mapping_quality`
  - `rep_monthly_kpi_11`
  - `monthly_kpi_11`

builder payload 연결 위치:

- `build_crm_builder_payload(...)` in `C:\sfe_master_ops\modules\crm\service.py`
- 실제 화면용 조립은 `C:\sfe_master_ops\modules\crm\builder_payload.py`
- 이 파일은 KPI를 다시 계산하지 않고 아래처럼 화면용 덩어리로 바꾼다.
  - `kpi_banner`
  - `integrity`
  - `coach_summary`
  - `behavior_axis`
  - `pipeline`
  - `matrix_rows`
  - `trend`
  - `quality_flags`
  - `rep_scope_data`

중요한 해석:

- CRM은 원본에서 가장 모범적인 구조다.
- 계산은 `modules/kpi/crm_engine.py`
- result asset 조립은 `modules/crm/service.py`
- 화면용 변환은 `modules/crm/builder_payload.py`
- 즉 역할 분리가 가장 깔끔하다.

### Sandbox

- 엔진 파일 경로: `C:\sfe_master_ops\modules\kpi\sandbox_engine.py`
- service 파일 경로: `C:\sfe_master_ops\modules\sandbox\service.py`
- result asset 정의: `C:\sfe_master_ops\result_assets\sandbox_result_asset.py`
- builder payload 연결:
  - `C:\sfe_master_ops\modules\sandbox\service.py`
  - `C:\sfe_master_ops\modules\sandbox\builder_payload.py`
  - `C:\sfe_master_ops\modules\sandbox\builders\...`
- Builder 검증 기준 파일: `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`

입력:

- `SandboxInputStandard`
- 내부에는 아래가 들어간다.
  - CRM records
  - sales records
  - target records
  - prescription records

계산 내용:

- 서비스에서 병원 x 월 단위 버킷을 만든다.
- CRM, Sales, Target, Prescription를 병원 기준으로 합친다.
- `compute_sandbox_official_kpi_6(...)`로 공식 KPI 6개를 계산한다.
- `compute_sandbox_layer1_period_metrics(...)`로 월/분기/연 단위 표시용 시계열을 만든다.
- `validate_official_kpi_6_payload(...)`, `validate_layer1_period_metrics_payload(...)`로 계약 검증도 한다.

확인된 공식 KPI 6:

- `monthly_sales`
- `monthly_target`
- `monthly_attainment_rate`
- `quarterly_sales`
- `quarterly_target`
- `annual_attainment_rate`

출력:

- `SandboxResultAsset`
- 내부 핵심 필드:
  - `analysis_summary`
  - `domain_quality`
  - `join_quality`
  - `hospital_records`
  - `handoff_candidates`
  - `dashboard_payload`

result asset 생성 위치:

- `build_sandbox_result_asset(...)` in `C:\sfe_master_ops\modules\sandbox\service.py`

builder payload 연결 위치:

- Sandbox는 다른 모듈과 조금 다르다.
- builder용 정보가 `result asset` 안의 `dashboard_payload.template_payload`와 `block_payload`에 이미 들어간다.
- 즉 Sandbox는 `result asset` 단계에서 화면용 정보도 꽤 많이 같이 준비한다.

중요한 해석:

- Sandbox는 엔진이 무거워지지 않도록 일부를 쪼개놨다.
- 공식 KPI 계산은 `modules/kpi/sandbox_engine.py`
- 실제 병원 조인, handoff 후보 판단, 템플릿 계약 주입은 `modules/sandbox/service.py`
- 화면 블록 조립은 `modules/sandbox/builders/*`
- 이 구조는 “공식 계산”과 “화면용 정리”를 분리하기 위해 나눈 것으로 보인다.

### Territory

- 엔진 파일 경로: `C:\sfe_master_ops\modules\kpi\territory_engine.py`
- service 파일 경로: `C:\sfe_master_ops\modules\territory\service.py`
- result asset 정의: `C:\sfe_master_ops\result_assets\territory_result_asset.py`
- builder payload 연결: `C:\sfe_master_ops\modules\territory\builder_payload.py`
- 저장/검증 스크립트: `C:\sfe_master_ops\scripts\validate_territory_with_ops.py`

입력:

- `SandboxResultAsset.hospital_records`
- 병원 지역/좌표/권역/담당자 매핑
- 선택적으로 `territory_activity_path`

계산 내용:

- 서비스는 병원별 집계에서 지도용 기본 자산을 만든다.
- 확인된 주요 산출물:
  - `markers`
  - `routes`
  - `region_zones`
  - `gaps`
  - `coverage_summary`
  - `optimization_summary`
- `modules/kpi/territory_engine.py`는 여기서 다시 KPI를 재계산한다기보다,
  Builder가 바로 쓸 수 있는 `builder_context`를 만든다.
- 즉 Territory의 `kpi engine`은 숫자 KPI 엔진보다는 `지도/동선/포트폴리오 문맥 생성기`에 더 가깝다.

출력:

- `TerritoryResultAsset`

result asset 생성 위치:

- `build_territory_result_asset(...)` in `C:\sfe_master_ops\modules\territory\service.py`

builder payload 연결 위치:

- `build_territory_builder_payload(...)` in `C:\sfe_master_ops\modules\territory\service.py`
- 실제 화면용 문맥은 `build_territory_builder_context(...)` in `C:\sfe_master_ops\modules\kpi\territory_engine.py`

중요한 해석:

- Territory는 CRM/Sandbox처럼 “공식 KPI 숫자”를 내는 엔진이라기보다,
  Sandbox 결과를 지도와 실행문맥으로 바꾸는 엔진이다.
- 그래서 Phase 6 초반에 Territory까지 깊게 구현할 필요는 낮다.

### Prescription

- 엔진 파일 경로: `C:\sfe_master_ops\modules\kpi\prescription_engine.py`
- service 파일 경로: `C:\sfe_master_ops\modules\prescription\service.py`
- result asset 정의: `C:\sfe_master_ops\result_assets\prescription_result_asset.py`
- builder payload 연결: `C:\sfe_master_ops\modules\prescription\builder_payload.py`
- 저장/검증 스크립트: `C:\sfe_master_ops\scripts\validate_prescription_with_ops.py`

입력:

- `PrescriptionStandardFlow`
- `PrescriptionGapRecord`
- builder payload 단계에서는 아래 DataFrame도 함께 사용
  - `claim_df`
  - `flow_df`
  - `gap_df`
  - `rep_kpi_df`

계산 내용:

- 서비스는 먼저 validation/인계용 요약을 만든다.
- 확인된 핵심 요약:
  - `lineage_summary`
  - `reconciliation_summary`
  - `validation_gap_summary`
  - `mapping_quality`
- `modules/kpi/prescription_engine.py`의 핵심은
  “공식 KPI 숫자”라기보다 Builder가 바로 쓸 처방 흐름 문맥을 만드는 것이다.
- 여기서 아래 같은 값이 생성된다.
  - `flow_series`
  - `flow_series_by_territory`
  - `pipeline_steps`
  - `claims`
  - `hospital_traces`
  - `rep_kpis`
  - `gaps`
  - `detail_asset_manifest`

출력:

- `PrescriptionResultAsset`
- builder용 payload는 별도로 생성된다.

result asset 생성 위치:

- `build_prescription_result_asset(...)` in `C:\sfe_master_ops\modules\prescription\service.py`

builder payload 연결 위치:

- `build_prescription_builder_payload(...)` in `C:\sfe_master_ops\modules\prescription\service.py`
- 실제 문맥 생성은 `build_prescription_builder_context(...)` in `C:\sfe_master_ops\modules\kpi\prescription_engine.py`

중요한 해석:

- Prescription도 Territory와 비슷하게,
  원본에서 엔진이 “리포트가 필요한 설명 데이터”를 많이 만든다.
- 즉 계산과 화면 문맥 생성이 꽤 가까이 붙어 있다.

### RADAR

- 엔진 파일 경로:
  - `C:\sfe_master_ops\modules\radar\signal_engine.py`
  - `C:\sfe_master_ops\modules\radar\priority_engine.py`
  - `C:\sfe_master_ops\modules\radar\option_engine.py`
- service 파일 경로: `C:\sfe_master_ops\modules\radar\service.py`
- result asset export: `C:\sfe_master_ops\result_assets\radar_result_asset.py`
- builder payload 연결: `C:\sfe_master_ops\modules\radar\builder_payload.py`
- 저장/검증 스크립트: `C:\sfe_master_ops\scripts\validate_radar_with_ops.py`

입력:

- `RadarInputStandard`
- 이 입력은 validation 승인 이후 KPI 요약, scope 요약, sandbox 요약을 받는다.

계산 내용:

- `detect_signals(...)`
- `score_signals(...)`
- `attach_decision_options(...)`
- 즉 RADAR는 KPI를 다시 계산하지 않고, KPI 결과 위에서 신호와 우선순위를 만든다.

출력:

- `RadarResultAsset`
- 내부 핵심:
  - `summary`
  - `signals`
  - `kpi_summary`
  - `scope_summaries`
  - `validation_summary`
  - `sandbox_summary`

result asset 생성 위치:

- `build_radar_result_asset(...)` in `C:\sfe_master_ops\modules\radar\service.py`

builder payload 연결 위치:

- `build_radar_builder_payload(...)` in `C:\sfe_master_ops\modules\radar\builder_payload.py`

중요한 해석:

- RADAR는 Phase 6 대상이라기보다 Phase 15 쪽 성격이 더 강하다.
- 지금 당장 `sales_os` Phase 6에서 가져올 우선 대상은 아니다.

## 3. result asset와 payload 차이

### result asset는 무엇인지

- 계산 결과를 다음 단계로 넘기는 공식 상자다.
- validation이 판단할 기준도 이 상자다.
- 예:
  - `crm_result_asset.json`
  - `sandbox_result_asset.json`
  - `territory_result_asset.json`
  - `prescription_result_asset.json`

### payload는 무엇인지

- 화면 템플릿이 바로 읽기 좋게 정리한 상자다.
- 계산 결과를 예쁘게 보여주기 위한 구조다.
- 예:
  - `crm_builder_payload.json`
  - `territory_builder_payload.json`
  - `prescription_builder_payload.json`
- Sandbox는 예외적으로 `result asset.dashboard_payload` 안에 template용 구조가 같이 있다.

### builder는 무엇만 읽어야 하는지

- Builder는 raw를 읽으면 안 된다.
- Builder는 KPI를 다시 계산하면 안 된다.
- Builder는 `validated result asset` 또는 `validated builder payload`만 읽어야 한다.

확인 근거:

- `C:\sfe_master_ops\modules\builder\service.py`
- 파일 첫 설명에 `Builder is render-only and does not recalculate KPI.`라고 적혀 있다.

### validation은 무엇을 기준으로 판단해야 하는지

- validation은 raw가 아니라 `result asset`를 봐야 한다.
- 예:
  - CRM은 `mapping_quality`
  - Sandbox는 `domain_quality`, `join_quality`, `handoff_candidates`
  - Prescription은 `mapping_quality`, `validation_gap_summary`
- 즉 validation은 “계산이 끝난 뒤 이 결과를 다음 단계로 넘겨도 되는가”를 보는 단계다.

## 4. report template 대조

### CRM 템플릿에서 필요해 보이는 값

파일:

- `C:\sales_os\workers\templates\reports\crm_analysis_template.html`

확인된 주요 요구 필드:

- `overview`
- `filters`
- `default_scope_key`
- `scope_asset_manifest`
- `kpi_banner`
- `integrity`
- `coach_summary`
- `behavior_axis`
- `pipeline`
- `matrix_rows`
- `trend`
- `quality_flags`
- `rep_scope_data`

연결 해석:

- 이 값들은 `crm_builder_payload.py`에서 만든 구조와 강하게 맞물린다.
- 즉 CRM은 템플릿을 보고 추측할 필요가 거의 없고, 원본 builder payload 구조를 따르면 된다.

### Sandbox 템플릿에서 필요해 보이는 값

파일:

- `C:\sales_os\workers\templates\reports\sandbox_report_template.html`

확인된 주요 요구 필드:

- `official_kpi_6`
- `layer1`
- `branches`
- `block_payload`
- `branch_summary`
- `branch_member_summary`
- `product_analysis`
- `analysis`
- `correlation`
- `adj_correlation`
- `coach_scenario`
- `coach_action`

연결 해석:

- Sandbox 템플릿은 단순 KPI 숫자만 기대하지 않는다.
- `service.py + builders/*`에서 조립한 풍부한 화면용 구조를 기대한다.
- 따라서 Phase 6 최소 버전에서는 `공식 KPI 6 + 최소 template payload`부터 먼저 구현하는 것이 안전하다.

### Territory 템플릿에서 필요해 보이는 값

파일:

- `C:\sales_os\workers\templates\reports\territory_optimizer_template.html`

확인된 주요 요구 필드:

- `overview`
- `filters.rep_options`
- `default_selection`
- `rep_payloads`
- `portfolio_summary`
- `views`
- `selection.summary`
- `selection.insight_text`

연결 해석:

- Territory 템플릿은 지도 표시용 선택 상태와 rep별 뷰 묶음을 기대한다.
- 이 값은 `build_territory_builder_context(...)`가 만드는 구조와 직접 연결된다.

### Prescription 템플릿에서 필요해 보이는 값

파일:

- `C:\sales_os\workers\templates\reports\prescription_flow_template.html`

확인된 주요 요구 필드:

- `overview`
- `flow_series`
- `flow_series_by_territory`
- `pipeline_steps`
- `claims`
- `hospital_traces`
- `rep_kpis`
- `gaps`
- `detail_asset_manifest`
- `detail_asset_counts`

연결 해석:

- Prescription 템플릿은 “결과 요약 + 상세 테이블을 나중에 로드하는 구조”를 기대한다.
- 그래서 builder payload가 상세 row를 chunk로 나누는 방식까지 같이 필요하다.

### RADAR 템플릿에서 필요해 보이는 값

파일:

- `C:\sales_os\workers\templates\reports\radar_report_template.html`

확인된 주요 요구 필드:

- `report_title`
- `period_label`
- `overall_status`
- `top_issue`
- `top_issue_desc`
- `decision_readiness`
- `validation_status`
- `signal_count`
- `confidence`
- `branch_options`
- `kpi_snapshot`
- `trend_chart`
- `signals`

연결 해석:

- RADAR 템플릿은 signal 기반 결과 화면이다.
- KPI 계산기라기보다 “validation 이후 설명용”에 가깝다.

### 템플릿만 보고 추측하면 위험한 부분

- CRM의 `coach_score`, `integrity`, `behavior_axis`는 단순 표시값이 아니라 원본 엔진/조립 규칙이 있다.
- Sandbox의 `official_kpi_6`, `layer1`, `product_analysis`, `branch_summary`는 계산 규칙과 블록 규약이 함께 있다.
- Prescription의 `pipeline_steps`는 단순 진행률이 아니라 단계별 품질 의미가 붙어 있다.
- Territory의 `insight_text`, `portfolio_summary`는 지도 선택 문맥이 포함된다.

정리:

- 템플릿은 출력 모양의 기준
- 원본 엔진과 service는 계산/구조의 기준

## 5. sales_os 구현 권장 순서

### 꼭 먼저 구현할 모듈

1. CRM
2. Sandbox

이유:

- CRM은 KPI 계산 단일 소스가 가장 분명하다.
- Sandbox는 실제 운영에서 다음 단계 연결의 중심이다.
- 이 둘이 있어야 Phase 7 validation도 제대로 붙일 수 있다.

### 뒤로 미뤄도 되는 모듈

- Territory
- Prescription의 상세 builder payload
- RADAR

이유:

- Territory와 Prescription은 result asset보다 “화면 문맥 조립” 비중이 더 크다.
- RADAR는 validation 이후 모듈이라 지금 바로 붙일 필요가 없다.

### 최소 동작 버전에서 어떤 계산만 먼저 가져오면 되는지

CRM 최소 구현:

- `rep_monthly_kpi_11`
- `monthly_kpi_11`
- `activity_context`
- `mapping_quality`
- `metric_version`

Sandbox 최소 구현:

- `official_kpi_6`
- `analysis_summary`
- `domain_quality`
- `join_quality`
- `handoff_candidates`
- 최소 `dashboard_payload.template_payload`

Prescription 최소 구현:

- `lineage_summary`
- `reconciliation_summary`
- `validation_gap_summary`
- `mapping_quality`

Territory 최소 구현:

- Phase 6에서 꼭 필요하지 않다.
- Sandbox result asset가 안정화된 뒤 Phase 8~9 근처에서 붙여도 된다.

### Phase 6에서 어디까지 하고, validation은 Phase 7로 어떻게 넘길지

Phase 6에서 할 일:

- 정규화 결과를 읽는 `kpi runtime/service` 만들기
- 모듈별 `result asset.json` 생성
- 최소 `latest_kpi_result.json` 또는 모듈별 `_meta` 결과 저장
- Sandbox까지는 다음 단계가 읽을 수 있는 최소 payload seed 생성

Phase 7로 넘길 것:

- `result asset`를 읽고 `WARN/FAIL` 이유를 만드는 로직
- handoff 가능 여부 최종 판단
- 결과 설명 문장
- evidence / 근거 수치 정리

쉽게 말하면:

- Phase 6은 “계산 상자 만들기”
- Phase 7은 “그 상자를 보고 전달 가능 여부와 이유 설명하기”

### Phase 6 최소 구현 우선순위 1, 2, 3

1. CRM KPI 엔진과 CRM result asset 구현
2. Sandbox 공식 KPI 6과 Sandbox result asset 구현
3. Sandbox 최소 template payload seed까지만 구현하고 validation으로 넘기기

## 6. 주의점

### 원본 로직을 그대로 복사하면 안 되는 부분

- 원본은 Python 기반 모듈 구조다.
- `sales_os`는 현재 Next.js/TypeScript 백엔드 구조이므로 파일 구조와 타입 체계가 다르다.
- 그대로 복붙하면 구조만 커지고 유지보수가 어려워질 가능성이 높다.

### 현재 sales_os 구조에 맞게 바꿔야 하는 부분

- `data/standardized/{company}`를 읽는 TypeScript 서비스로 바꿔야 한다.
- 모듈별 result asset 저장 위치를 `sales_os` 규칙으로 다시 정해야 한다.
- worker/template 연결은 나중 단계에서 쓰더라도, Phase 6에서는 먼저 `JSON 계약`부터 고정하는 편이 안전하다.
- Sandbox처럼 화면용 구조가 큰 모듈은 한 번에 다 옮기지 말고,
  `공식 KPI -> 최소 result asset -> 최소 template payload` 순으로 나눠야 한다.

### 이번 조사에서 확인된 중요한 구조 원칙

- 원본은 계산이 과다해질수록 엔진을 한 파일에 몰아넣지 않고 나눴다.
- 특히 Sandbox, Territory, Prescription은 아래처럼 분리돼 있다.
  - 엔진
  - service
  - builder payload
  - template/builders
- 따라서 `sales_os`도 처음부터 큰 한 파일로 만들기보다 모듈을 나눠 시작하는 것이 안전하다.

### 아직 확인 못한 것

- Sandbox `builders/*` 내부 세부 규칙 전체
- Prescription claim validation의 전체 세부 계산식
- Territory의 모든 선택 상태 chunk 규칙

이 항목들은 Phase 6 최소 구현을 시작하는 데는 꼭 필요하지 않다.
하지만 Phase 8~9에서 Builder까지 붙일 때는 다시 확인하는 것이 좋다.
