# 원본 프로젝트 `company_000002` 해결 조사 메모

작성일: 2026-03-31

## 1. 요약

- 원본 `C:\sfe_master_ops`에서는 `company_000002`를 “완벽한 raw로 고쳐서 통과”시킨 것이 아니라, intake 단계에서 최대한 자동보정한 뒤 `_intake_staging` 정리본을 만들어 다음 단계로 넘기는 방식으로 해결했다.
- 핵심은 `alias 규칙 + 후보 추천 + canonical column 자동 추가 + CRM 실행용 staging 합성`이었다.
- 월/기간 계산은 파일 경로 숫자를 읽는 방식이 아니라 실제 컬럼값을 `YYYYMM`으로 정리해서 계산했다.
- `company_000002`는 원본에서 실제로 `_intake_staging`, `data/ops_standard/company_000002`, `data/ops_validation/company_000002`까지 생성된 흔적이 남아 있다.
- 즉 원본의 해결 방식은 “차단”보다 “실행 가능한 정리본 생성”에 더 가깝다.

## 2. 찾은 근거

- 파일: `C:\sfe_master_ops\docs\architecture\12_part2_status_source_of_truth.md`
  - 중요한 이유: 원본 프로젝트의 공식 진행 기록 문서다.
  - 관련성: `company_000002` 지저분한 raw 자동보정 검증 완료, `_intake_staging` 생성, 전체 파이프라인 연결 확인이 직접 적혀 있다.

- 파일: `C:\sfe_master_ops\docs\ai\07_current_phase.md`
  - 중요한 이유: 위 공식 문서를 요약한 현재 상태 안내 문서다.
  - 관련성: `company_000002`를 “보정테스트제약 기준 지저분한 raw 검증 완료”라고 다시 확인해 준다.

- 파일: `C:\sfe_master_ops\data\company_source\company_000002\_onboarding\intake_result.latest.json`
  - 중요한 이유: 실제 intake 최신 결과 파일이다.
  - 관련성: 상태가 `ready_with_fixes`, 공통 분석 구간이 `202504 ~ 202506`, 해결된 매핑과 자동보정 내역이 직접 들어 있다.

- 파일: `C:\sfe_master_ops\data\company_source\company_000002\_onboarding\company_onboarding_registry.json`
  - 중요한 이유: 회사별로 확정된 매핑을 저장한 파일이다.
  - 관련성: `target_value -> 계획금액`, `pharmacy -> pharmacy_account_id (약국거래처ID)`, `quantity -> qty (수량)` 같은 확정 결과가 남아 있다.

- 파일: `C:\sfe_master_ops\modules\intake\rules.py`
  - 중요한 이유: source별 필수 의미 컬럼과 alias 규칙의 중심 파일이다.
  - 관련성: `target_value`, `pharmacy`, `quantity`, `account`가 어떤 실제 컬럼 이름들과 연결되는지 정의돼 있다.

- 파일: `C:\sfe_master_ops\modules\intake\service.py`
  - 중요한 이유: 실제 해결 로직이 가장 많이 들어 있다.
  - 관련성: `_apply_adapter_canonical_columns`, `_build_execution_ready_crm_account_assignment`, `_build_execution_ready_crm_rep_master`, `_build_period_coverage`, `build_intake_result`가 `company_000002` 해결 방식의 핵심이다.

- 파일: `C:\sfe_master_ops\modules\intake\fixers.py`
  - 중요한 이유: 지저분한 raw의 형식 보정 로직이 있다.
  - 관련성: 컬럼명 공백 정리, 월 형식 정리, 날짜 형식 정리, 중복 행 제거가 여기서 처리된다.

- 파일: `C:\sfe_master_ops\modules\intake\merge.py`
  - 중요한 이유: 월별 raw 병합 로직이 있다.
  - 관련성: `monthly_raw/YYYYMM/`를 읽어 source별 merged raw를 만드는 공식 방식이다.

- 파일: `C:\sfe_master_ops\tests\test_intake\test_intake_auto_mapping.py`
  - 중요한 이유: 자동 매핑 기대값을 고정한 테스트다.
  - 관련성: `target_value -> 계획금액`, `pharmacy -> pharmacy_account_id (약국거래처ID)` 또는 `pharmacy_name (약국명)`, `quantity -> 출고수량` 또는 `qty (수량)`가 테스트로 박혀 있다.

- 파일: `C:\sfe_master_ops\tests\test_intake\test_intake_period_alignment.py`
  - 중요한 이유: 기간 계산 기준을 검증한 테스트다.
  - 관련성: 기간은 파일 경로가 아니라 데이터 컬럼값에서 읽어 공통 분석 구간을 계산하는 구조임을 보여준다.

- 파일: `C:\sfe_master_ops\data\ops_standard\company_000002\`
  - 중요한 이유: 실제 표준화 산출물 폴더다.
  - 관련성: CRM, Sandbox, Prescription, Territory까지 실제 표준화 결과가 생성된 흔적이 있다.

- 파일: `C:\sfe_master_ops\data\ops_validation\company_000002\pipeline\pipeline_validation_summary.json`
  - 중요한 이유: 실제 전체 파이프라인 실행 결과다.
  - 관련성: Prescription가 `FAIL`이어도 통합 실행은 계속 진행했고, Builder까지 6종 결과물을 만들었다는 증거다.

## 3. 해결 방식 정리

### 컬럼명 흔들림 해결 방식

- 확인된 사실:
  - `modules/intake/rules.py`에서 source별 `required_fields`, `field_aliases`를 따로 잡았다.
  - `target.target_value` alias:
    - `target_amount`, `target_qty`, `목표금액`, `목표수량`, `계획금액`, `목표`
  - `prescription.pharmacy` alias:
    - `pharmacy_name`, `약국명`, `약국`, `customer_name`, `pharmacy_account_id`
  - `prescription.quantity` alias:
    - `qty`, `quantity`, `수량`, `출고수량`
  - `crm_account_assignment.account` alias:
    - `hospital_id`, `hospital_name`, `account_id`, `병원코드`, `병원명`, `거래처명`, `거래처코드`

- 확인된 사실:
  - `modules/intake/fixers.py`에서
    - 컬럼명 앞뒤 공백 정리
    - 중복 공백 정리
    - 중복 헤더 정리
    - 완전 중복 행 제거
    를 먼저 했다.

- 확인된 사실:
  - `modules/intake/service.py`의 `_apply_adapter_canonical_columns`가 원본 컬럼 옆에 실행용 표준 컬럼을 자동으로 추가했다.
  - 문서와 실제 결과에서 나온 예:
    - `병원코드 -> 거래처코드`
    - `병원명 -> 방문기관`
    - `목표월 -> 기준년월`
    - `출고일 -> ship_date (출고일)`

- 확인된 사실:
  - `company_onboarding_registry.json`에 회사별 확정 매핑을 저장해 다음부터 재사용했다.

### 월/기간 계산 해결 방식

- 확인된 사실:
  - 원본은 `modules/intake/service.py`의 `_build_period_coverage`에서 실제 데이터 컬럼을 읽어 기간을 계산했다.
  - `dataframe[period_column].map(_normalize_month_value)` 방식이다.
  - 즉 파일 경로나 회사 코드 숫자를 월로 읽지 않았다.

- 확인된 사실:
  - `tests/test_intake/test_intake_period_alignment.py`도 같은 철학을 검증한다.
  - 예시 데이터의 `yyyymm`, 날짜 컬럼으로 `analysis_start_month`, `analysis_end_month`, `analysis_month_count`를 만든다.

- 확인된 사실:
  - `company_000002`의 실제 intake 결과 파일에서는
    - `crm_activity`: `202504 ~ 202506`
    - `sales`: `202504 ~ 202506`
    - `target`: `202504 ~ 202506`
    - `prescription`: `202504 ~ 202506`
    로 정상 계산돼 있다.

- 해석:
  - 현재 `sales_os`의 `000002 ~ 000002` 문제는 원본처럼 “컬럼값 중심 기간 계산”으로 바꾸면 바로 줄어들 가능성이 높다.

### monthly merge 처리 방식

- 확인된 사실:
  - 원본은 `modules/intake/merge.py`에서 `monthly_raw` 경로를 찾는다.
  - `get_monthly_raw_root()`는 회사 루트 아래 `monthly_raw` 폴더를 잡는다.
  - `inspect_monthly_raw()`와 `merge_monthly_raw_sources()`가 실제 병합 진입점이다.

- 확인된 사실:
  - `company_000002` 원본 데이터에는 `monthly_raw/202504`, `202505`, `202506`가 실제로 있고,
    각 월 아래에 `crm_activity_raw`, `sales_raw`, `target_raw`, `fact_ship_raw`가 있다.

- 확인된 사실:
  - 원본 `company_000002`는 `prescription_raw.csv`가 아니라 `fact_ship_raw.csv`를 prescription 원천으로 썼다.

- 해석:
  - 현재 `sales_os`는 prescription 공식 파일명을 `prescription_raw.csv`로 보고 있는데,
    원본 흐름은 `fact_ship_raw.csv`를 약국/출고 원천으로 다뤘다.
  - 이 차이는 그대로 두면 원본과 같은 자동보정 결과가 안 나올 수 있다.

### intake -> staging 연결 방식

- 확인된 사실:
  - 원본은 `_intake_staging`을 “다음 단계가 실제로 읽는 실행용 정리본”으로 썼다.
  - 관련 파일:
    - `modules/intake/staging.py`
    - `modules/intake/runtime.py`
    - `common/company_runtime.py`

- 확인된 사실:
  - `company_000002` 원본 폴더에는 실제로 아래 정리본이 남아 있다.
    - `_intake_staging/company/account_master.xlsx`
    - `_intake_staging/company/company_assignment_raw.xlsx`
    - `_intake_staging/company/fact_ship_raw.csv`
    - `_intake_staging/crm/crm_activity_raw.xlsx`
    - `_intake_staging/sales/sales_raw.xlsx`
    - `_intake_staging/target/target_raw.xlsx`

- 확인된 사실:
  - `modules/intake/service.py`의
    - `_build_execution_ready_crm_account_assignment`
    - `_build_execution_ready_crm_rep_master`
    가 원본 부족분을 보강해 실행용 CRM staging을 만들었다.
  - 실제 intake 결과에도 다음 fix가 남아 있다.
    - `derive_account_assignment_from_crm_activity`
    - `hydrate_company_assignment_from_account_mapping`

- 해석:
  - 원본은 `account_id`가 직접 없어도 “실행 가능한 배정표/마스터를 합성해서 다음 단계로 넘기는 방식”을 썼다.

### normalization 연결 방식

- 확인된 사실:
  - 원본은 `_intake_staging` 이후에 adapter + normalize 스크립트로 표준화했다.
  - 문서와 코드 근거:
    - `docs/intake_column_dictionary_intake_normalization_audit_20260331.md`
    - `scripts/normalize_crm_source.py`
    - `scripts/normalize_sandbox_source.py`
    - `scripts/normalize_prescription_source.py`
    - `scripts/normalize_territory_source.py`

- 확인된 사실:
  - 결과는 `data/standardized/`가 아니라 `data/ops_standard/`에 쌓였다.
  - `company_000002` 실제 결과:
    - `crm/ops_crm_activity.xlsx`
    - `crm/ops_company_master.xlsx`
    - `crm/ops_hospital_master.xlsx`
    - `sandbox/ops_sales_records.xlsx`
    - `sandbox/ops_target_records.xlsx`
    - `prescription/ops_prescription_standard.xlsx`
    - `territory/ops_territory_activity.xlsx`

- 확인된 사실:
  - `pipeline_validation_summary.json` 기준으로 전체 실행은 끝까지 갔다.
  - 전체 상태는 `FAIL`이지만, 이유는 주로 Prescription 품질 때문이었다.
  - Builder는 `PASS`였고 보고서 6종을 만들었다.

- 해석:
  - 원본은 “모든 모듈이 완벽해야만 다음 단계로 감”이 아니라,
    일부 모듈이 `FAIL/WARN`이어도 통합 진단과 Builder 생성은 계속 가는 구조였다.

### 테스트/검증 방식

- 확인된 사실:
  - 자동 매핑 테스트:
    - `tests/test_intake/test_intake_auto_mapping.py`
  - 기간 계산 테스트:
    - `tests/test_intake/test_intake_period_alignment.py`
  - candidate가 있어도 intake를 막지 않는 테스트:
    - `tests/test_intake/test_intake_relaxed_gate.py`
  - 전체 파이프라인 검증 진입:
    - `tests/test_scripts/test_validate_full_pipeline.py`

- 확인된 사실:
  - 운영 문서에도 `company_000002`를 실검증 회사로 고정해 뒀다.
  - `docs/architecture/12_part2_status_source_of_truth.md`
  - `docs/ai/07_current_phase.md`

## 4. `sales_os`에 옮겨야 할 것

### 꼭 가져와야 하는 규칙

- 기간 계산은 파일 경로 숫자가 아니라 실제 period/date 컬럼값으로 계산해야 한다.
- source별 alias 규칙은 원본처럼 더 넓게 가져와야 한다.
  - 특히 `target_value`, `pharmacy`, `quantity`, `account`
- intake에서 canonical column을 자동 추가해야 한다.
- `crm_account_assignment`, `crm_rep_master`는 원본처럼 “부족하면 실행용 staging을 합성”하는 보강 규칙이 필요하다.
- `_intake_staging`은 단순 저장본이 아니라 다음 단계의 공식 입력으로 써야 한다.

### 있으면 좋은 규칙

- 회사별 확정 매핑 registry 저장 및 재사용
- candidate 추천 점수화 로직
- Prescription `FAIL`을 전체 실행 즉시 중단 대신 경고성 계속 진행으로 다루는 정책
- normalization 결과에 `unmapped_*` 파일을 같이 남기는 방식

### 지금 버그를 바로 해결하는 데 직접 필요한 규칙

- `sales_os`의 월 추출 버그 수정
  - 원본처럼 `period_column` 기반 계산으로 바꿔야 한다.
- `target_value` alias 확장
  - `계획금액`, `목표금액`, `목표수량`, `목표`
- `pharmacy`, `quantity` alias 확장
  - `pharmacy_account_id`, `pharmacy_name`, `출고수량`, `qty`
- `account_id` 직접 탐지 실패 시
  - 원본처럼 `crm_activity`와 다른 CRM source를 조합해 실행용 assignment/master를 만드는 보강 로직이 필요하다.
- prescription 원천 파일명 차이 점검
  - 원본은 `fact_ship_raw.csv`를 썼다.

## 5. 주의점

- 확인된 사실:
  - 원본의 표준화 경로는 `data/ops_standard`, 검증 경로는 `data/ops_validation`이다.
  - 현재 `sales_os`의 `data/standardized` 구조와 그대로 같지 않다.

- 확인된 사실:
  - 원본은 Python 기반 intake/normalize 파이프라인이다.
  - 현재 `sales_os`는 TypeScript/Node 서비스로 옮기는 중이다.

- 따라서 그대로 복사하면 안 되는 부분:
  - Python adapter/normalize 전체 구조를 경로까지 그대로 복사하는 것
  - 원본의 `fact_ship_raw.csv`와 현재 `prescription_raw.csv` 규칙 차이를 무시하는 것
  - 원본의 `ops_standard/ops_validation` 경로를 현재 저장 구조에 그대로 박는 것

- 현재 `sales_os` 구조에 맞게 바꿔야 하는 부분:
  - alias 규칙과 period 계산 철학만 가져오기
  - `_intake_staging` 역할은 유지하되 현재 JSON 기반 표준화 저장 구조에 맞추기
  - CRM 실행용 보강 로직은 TypeScript 서비스 함수로 다시 옮기기
  - “candidate가 있어도 바로 막지 않는다”는 intake 판정 철학은 유지하되,
    현재 `ready / ready_with_fixes / needs_review / blocked` 체계에 맞게 연결하기

## 메모

- 확인된 사실:
  - 원본은 `company_000002`를 실제로 해결했다.
  - 증거는 `_intake_staging`, `ops_standard`, `ops_validation`, Builder 결과물, intake 결과 스냅샷이 모두 남아 있다는 점이다.

- 아직 못 찾은 것:
  - “정확히 어떤 한 번의 커밋”에서 해결됐는지까지는 이번 조사에서 특정하지 않았다.
  - 하지만 해결 방식 자체는 문서, 코드, 테스트, 실제 산출물 네 군데에서 서로 일치한다.
