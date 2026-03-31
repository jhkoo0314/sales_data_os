# 원본 프로젝트 정규화 / Adapter / Staging 조사

작성일: 2026-03-31  
조사 기준:
- 참고 문서: `C:\sales_os\docs\...`
- 실제 근거: 원본 프로젝트 코드베이스 `C:\sfe_master_ops`

## 우리 프로젝트 적용 기준

- 이 문서의 원본 경로 `data/standardized/*`는 우리 프로젝트에서는 `data/standardized/*`로 읽는다.
- 이 문서의 원본 경로 `data/validation/*`는 우리 프로젝트에서는 `data/validation/*`로 읽는다.
- 이 문서의 원본 환경변수 `COMPANY_SOURCE_ROOT`는 우리 프로젝트에서는 `COMPANY_SOURCE_ROOT` 성격의 실행 문맥으로 읽는다.
- 원본 절대경로와 원본 파일명은 조사 근거로만 남기고, 실제 구현 설계에는 `ops` 용어를 사용하지 않는다.

## 1. 한 줄 결론

원본 프로젝트의 정규화는 `raw를 바로 읽는 단순 매핑`이 아니라, `intake가 먼저 자동보정과 실행용 컬럼 보강을 거쳐 _intake_staging을 만들고, 그 staging을 adapter config 주입형 스크립트가 읽어 standardized 표준 파일로 저장하는 구조`로 운영됐다.

## 2. 원본 프로젝트에서 반드시 먼저 봐야 하는 파일 묶음

1. `C:\sfe_master_ops\modules\intake\service.py`
- intake와 정규화 경계가 가장 잘 보이는 핵심 파일이다.
- 어떤 자동보정이 staging 전에 일어났는지 여기서 확인된다.

2. `C:\sfe_master_ops\modules\intake\staging.py`
- `_intake_staging`와 `_onboarding`이 실제 어디에 저장되는지 정의한다.

3. `C:\sfe_master_ops\modules\intake\fixers.py`
- 컬럼 trim, 중복 제거, 날짜/월 형식 정리 같은 자동보정이 여기 있다.

4. `C:\sfe_master_ops\modules\intake\rules.py`
- source별 필수 의미 필드와 alias 규칙이 여기 있다.

5. `C:\sfe_master_ops\modules\intake\runtime.py`
- `_intake_staging`를 실제 실행 source root로 바꾸는 방식이 여기 있다.

6. `C:\sfe_master_ops\scripts\normalize_crm_source.py`
- CRM 정규화의 실제 진입점이다.
- `_intake_staging`를 읽어 `standardized/crm`을 만드는 근거다.

7. `C:\sfe_master_ops\scripts\normalize_sandbox_source.py`
- Sales/Target 정규화 진입점이다.

8. `C:\sfe_master_ops\scripts\normalize_prescription_source.py`
- Prescription 정규화 진입점이다.

9. `C:\sfe_master_ops\scripts\normalize_territory_source.py`
- Territory 정규화 진입점이다.

10. `C:\sfe_master_ops\common\company_profile.py`
- 회사별 컬럼 차이를 어떤 adapter config로 주입했는지 보여준다.

11. `C:\sfe_master_ops\adapters\crm\adapter_config.py`
- 회사별 컬럼 매핑이 config 객체로 들어간다는 가장 직접적인 증거다.

12. `C:\sfe_master_ops\common\company_runtime.py`
- 실행 중 `COMPANY_SOURCE_ROOT`로 `_intake_staging`를 읽게 하는 방식이 여기 있다.

## 3. 정규화 실제 구현 현황

### 위치

정규화는 한 폴더에만 모여 있지 않았다. 실제로는 아래처럼 나뉘어 있었다.

- intake 준비/자동보정: `modules/intake/*`
- adapter 구현: `adapters/*`
- 정규화 실행 스크립트: `scripts/normalize_*_source.py`
- 표준 스키마 정의: `modules/*/schemas.py`
- 회사별 컬럼 설정: `common/company_profile.py` + `adapters/*/adapter_config.py`

즉 정규화는 `modules/normalization` 같은 단일 폴더가 아니라:

1. intake
2. adapter config
3. adapter converter
4. normalize script

이 네 층으로 운영됐다.

### 입력

정규화가 직접 읽는 입력은 raw 원본이 아니라, 실행 시점에는 대부분 `_intake_staging`이었다.

직접 근거:
- `modules/intake/runtime.py`
- `common/company_runtime.py`
- `data/standardized/company_000002/crm/normalization_report.json`

`COMPANY_SOURCE_ROOT` 환경변수가 설정되면:
- `get_company_root(..., "company_source", ...)`는 원래 raw root가 아니라 `_intake_staging`를 반환한다.

즉 normalize script는 코드상 `company_source`를 읽는 것처럼 보이지만, 실제 런타임에서는 `_intake_staging`를 읽었다.

### 핵심 처리

실제 흐름은 아래였다.

1. raw 파일을 `data/company_source/{company_key}/...`에 저장
2. intake가 파일을 읽고 기본 fix 적용
3. source별 의미 필드(alias) 해석
4. 실행용 컬럼 부족 시 canonical column 자동 추가
5. 일부 source는 실행용 표를 자동 조합
6. `_intake_staging`에 실행 준비본 저장
7. normalize script가 `_intake_staging`를 읽음
8. adapter config를 사용해 공통 스키마로 변환
9. `data/standardized/{company_key}/{module}/...`에 저장
10. `normalization_report.json`도 같이 저장

### 출력

모듈별 standardized 출력 예:

- CRM
  - `ops_hospital_master.xlsx`
  - `ops_company_master.xlsx`
  - `ops_crm_activity.xlsx`
  - `unmapped_company_master.xlsx`
  - `unmapped_crm_activity.xlsx`
  - `normalization_report.json`

- Sandbox
  - `ops_sales_records.xlsx`
  - `ops_target_records.xlsx`
  - `failed_sales_rows.xlsx`
  - `failed_target_rows.xlsx`
  - `normalization_report.json`

- Prescription
  - `ops_prescription_standard.xlsx`
  - `failed_prescription_rows.xlsx`
  - `normalization_report.json`

- Territory
  - `ops_territory_activity.xlsx`
  - `unmapped_territory_activity.xlsx`
  - `normalization_report.json`

### 근거 파일

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\modules\intake\runtime.py`
- `C:\sfe_master_ops\scripts\normalize_crm_source.py`
- `C:\sfe_master_ops\scripts\normalize_sandbox_source.py`
- `C:\sfe_master_ops\scripts\normalize_prescription_source.py`
- `C:\sfe_master_ops\scripts\normalize_territory_source.py`

## 4. raw / staging / onboarding / standardized 흐름

### raw 저장 위치

실제 raw 저장 위치:
- `data/company_source/{company_key}/`

실제 예:
- `data/company_source/company_000002/crm/crm_activity_raw.xlsx`
- `data/company_source/company_000002/company/company_assignment_raw.xlsx`
- `data/company_source/company_000002/company/account_master.xlsx`
- `data/company_source/company_000002/sales/sales_raw.xlsx`
- `data/company_source/company_000002/target/target_raw.xlsx`
- `data/company_source/company_000002/company/fact_ship_raw.csv`

monthly raw 저장 위치:
- `data/company_source/{company_key}/monthly_raw/{yyyymm}/...`

누가 생성:
- 업로드 저장 또는 raw generator
- monthly merge는 `modules/intake/merge.py`와 runtime preparation 계층이 사용

용도:
- 원본 보관소
- intake 전 단계 기준 source

### `_intake_staging` 저장 위치

실제 위치:
- `data/company_source/{company_key}/_intake_staging/`

실제 예:
- `data/company_source/company_000002/_intake_staging/crm/crm_activity_raw.xlsx`
- `data/company_source/company_000002/_intake_staging/company/account_master.xlsx`
- `data/company_source/company_000002/_intake_staging/sales/sales_raw.xlsx`

누가 생성:
- `modules/intake/service.py`
  - `stage_intake_dataframe(...)`
- `modules/intake/runtime.py`
  - `prepare_intake_staged_sources(...)`

용도:
- adapter가 바로 읽는 실행 준비본
- intake fix와 실행용 컬럼 보강이 반영된 source root

중요한 점:
- `_intake_staging`은 단순 복사 폴더가 아니었다.
- dataframe fix 결과와 실행용 canonical column이 반영된 “adapter 입력 전용 source root”였다.

### `_onboarding` 저장 위치

실제 위치:
- `data/company_source/{company_key}/_onboarding/`

실제 예:
- `company_onboarding_registry.json`
- `{source_key}_onboarding_package.json`
- `intake_result.latest.json`
- `intake_result_YYYYMMDD_HHMMSS.json`

누가 생성:
- `modules/intake/staging.py`
  - `save_onboarding_package`
  - `save_intake_result_snapshot`
- `common/company_onboarding_registry.py`

용도:
- intake 결과 스냅샷 저장
- source별 resolved mapping 저장
- scenario 기록
- 이후 재사용 가능한 source mapping registry 유지

### standardized 결과 저장 위치

실제 위치:
- `data/standardized/{company_key}/{module}/`

실제 예:
- `data/standardized/company_000002/crm/`
- `data/standardized/company_000002/sandbox/`
- `data/standardized/company_000002/prescription/`
- `data/standardized/company_000002/territory/`

누가 생성:
- 각 `scripts/normalize_*_source.py`

용도:
- KPI/validation 모듈이 읽는 표준 입력 저장소

### validation 결과 저장 위치

실제 위치:
- `data/validation/{company_key}/{module}/`

용도:
- 정규화 이후 result asset / validation summary / builder 결과 저장

### 근거 파일

- `C:\sfe_master_ops\modules\intake\staging.py`
- `C:\sfe_master_ops\modules\intake\runtime.py`
- `C:\sfe_master_ops\common\company_onboarding_registry.py`
- `C:\sfe_master_ops\data\company_source\company_000002\`
- `C:\sfe_master_ops\data\standardized\company_000002\`

## 5. 컬럼 매핑 / 타입 정리 현황

### alias 규칙

source별 의미 필드 alias는 `modules/intake/rules.py`에 있었다.

예:
- `crm_activity.activity_date`
  - `activity_date`, `visit_date`, `방문일`, `활동일`, `실행일`, `date`
- `sales.period`
  - `yyyymm`, `sales_month`, `month`, `매출월`, `기준년월`, `월`
- `prescription.ship_date`
  - `ship_date`, `date`, `출고일`, `납품일`

즉 intake는 “표준 컬럼명 자체”를 먼저 강제한 것이 아니라, “의미 필드”를 찾는 방식으로 출발했다.

### 표준 컬럼명 규칙

실행용 canonical column 보강은 `modules/intake/service.py`의 `_ADAPTER_CANONICAL_COLUMN_MAP`에서 처리됐다.

예:
- CRM 활동
  - `병원명` -> `방문기관`
  - `병원코드` -> `거래처코드`
  - `활동유형` -> `액션유형`
  - `방문일` / `활동일` -> `실행일`

- Sales
  - `병원코드` -> `거래처코드`
  - `매출월` -> `기준년월`
  - `제품명` -> `브랜드명`

- Prescription
  - `출고일` -> `ship_date (출고일)`
  - `약국명` -> `pharmacy_name (약국명)`
  - `출고수량` -> `qty (수량)`

이 단계는 “이름을 바꾸는 것”이 아니라, 원본 컬럼을 남겨둔 채 adapter가 읽는 실행용 컬럼을 옆에 추가하는 방식이었다.

### 날짜 / 월 형식 통일

intake fix 단계:
- `modules/intake/fixers.py`

자동보정:
- month-like 컬럼 -> `YYYYMM`
- date-like 컬럼 -> `YYYY-MM-DD`

판단 기준:
- 컬럼명에 `yyyymm`, `month`, `월`, `기준월`, `매출월`, `목표월` 포함 시 월 컬럼으로 간주
- 컬럼명에 `date`, `일자`, `날짜`, `방문일`, `활동일`, `출고일`, `납품일` 포함 시 날짜 컬럼으로 간주

adapter 단계:
- CRM adapter는 `_parse_date_flexible()`로 여러 날짜 포맷을 파싱
- Sandbox adapter는 `_normalize_metric_month()`로 `YYYY-MM`, `YYYYMM`, Timestamp 등을 `YYYYMM`으로 표준화
- Prescription adapter는 `transaction_date` 또는 `metric_month`를 읽어 `metric_month` 생성

### 자동보정 항목

확인된 자동보정:

1. `trim_column_names`
- 컬럼명 앞뒤 공백 / 중복 공백 정리

2. `deduplicate_headers`
- 중복 컬럼명에 suffix 부여

3. `drop_duplicate_rows`
- 완전히 같은 행 제거

4. `normalize_month_format`
- 월 형식 `YYYYMM`으로 통일

5. `normalize_date_format`
- 날짜 형식 `YYYY-MM-DD`로 통일

6. `canonicalize_adapter_columns`
- adapter 실행용 컬럼 자동 추가

7. `derive_account_assignment_from_crm_activity`
- 거래처 담당 배정표가 부족하면 CRM 활동에서 실행용 배정표 생성

8. `hydrate_company_assignment_from_account_mapping`
- rep master만으로 부족하면 account assignment를 이용해 실행용 CRM master 보강

즉 원본 프로젝트는 “정규화 전 단계에서 가능한 한 살려서 보낸다”는 원칙이 실제로 구현돼 있었다.

### 회사별 컬럼 차이 흡수 방식

실제 회사별 차이는 `adapters/*/adapter_config.py`와 `common/company_profile.py`가 흡수했다.

구조:
- `CompanyOpsProfile`
  - `hospital_adapter_factory`
  - `company_master_adapter_factory`
  - `crm_activity_adapter_factory`
  - `sales_adapter_factory`
  - `target_adapter_factory`
  - `prescription_adapter_factory`
  - `territory_activity_adapter_factory`

즉 normalize script는 회사별 if/else를 직접 길게 갖는 구조가 아니라:

1. 회사 프로필에서 config factory를 받고
2. adapter에 config를 주입하고
3. 공통 schema로 변환하는 구조였다.

### 근거 파일

- `C:\sfe_master_ops\modules\intake\rules.py`
- `C:\sfe_master_ops\modules\intake\fixers.py`
- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\adapters\crm\adapter_config.py`
- `C:\sfe_master_ops\adapters\sandbox\adapter_config.py`
- `C:\sfe_master_ops\adapters\prescription\adapter_config.py`
- `C:\sfe_master_ops\common\company_profile.py`

## 6. 지금 웹 프로젝트에서 재구현할 때 가져와야 할 것

### 그대로 가져올 규칙

1. intake와 normalization을 분리
- intake는 최대한 살리고 정리하는 입구
- normalization은 공통 schema 변환

2. `_intake_staging`를 실제 adapter 입력 root로 유지
- 이 구조가 회사별 예외를 KPI까지 끌고 가지 않게 해준다.

3. source별 의미 필드 alias 규칙 유지
- `rules.py`의 semantic-field 방식은 재사용 가치가 크다.

4. canonical execution column 자동 추가 방식 유지
- 원본 컬럼을 파괴하지 않고 실행용 컬럼을 추가하는 방식이 안전하다.

5. adapter config 주입형 구조 유지
- 회사별 예외를 normalize script 안에 직접 하드코딩하지 않는 것이 중요하다.

6. `standardized` 같은 표준 결과 저장소를 별도로 유지
- KPI/validation이 raw를 다시 알지 않게 만드는 핵심 구조다.

### 새로 계약해야 할 것

1. 표준 결과 경로 이름
- 문서에는 `data/standardized`
- 실제 원본 구현은 `data/standardized`
- 웹에서는 공식 경로를 하나로 잠가야 한다.

2. source mapping registry 저장 방식
- 원본은 `_onboarding/company_onboarding_registry.json`
- 웹에서는 파일로 유지할지 DB로 옮길지 정해야 한다.

3. adapter 실패 행 보관 기준
- 현재는 `failed_*.xlsx`, `unmapped_*.xlsx`가 섞여 있다.
- 웹에서는 실패 유형 분류를 더 명확히 정할 필요가 있다.

4. 회사 프로필 관리 방식
- 지금은 코드 안 `company_profile.py`
- 웹/Supabase에서는 DB 기반 또는 JSON registry 기반으로 바꿀지 정해야 한다.

5. Prescription, Territory의 실행 준비 규칙
- 지금은 intake가 일부 실행용 표를 자동 생성한다.
- 어디까지 자동 생성 허용할지 웹에서는 다시 잠가야 한다.

### 먼저 구현할 순서

1. 저장 경로 계약부터 고정
- raw
- `_intake_staging`
- `_onboarding`
- standardized
- validation

2. intake fix contract 옮기기
- trim / dedupe / month/date normalize / canonical columns

3. source rule / alias contract 옮기기
- `rules.py`

4. onboarding registry contract 옮기기
- `resolved_mapping`
- `last_scenario_key`

5. adapter config 구조 옮기기
- 회사별 column mapping factory

6. normalize script 흐름 재구현
- CRM
- Sandbox
- Prescription
- Territory

7. 마지막에 worker execution과 연결
- `_intake_staging` root activation
- normalization report 저장

## 7. 실제 근거 파일 목록

우선순위 순:

1. `C:\sfe_master_ops\modules\intake\service.py`
2. `C:\sfe_master_ops\modules\intake\staging.py`
3. `C:\sfe_master_ops\modules\intake\fixers.py`
4. `C:\sfe_master_ops\modules\intake\runtime.py`
5. `C:\sfe_master_ops\modules\intake\rules.py`
6. `C:\sfe_master_ops\modules\intake\scenarios.py`
7. `C:\sfe_master_ops\scripts\normalize_crm_source.py`
8. `C:\sfe_master_ops\scripts\normalize_sandbox_source.py`
9. `C:\sfe_master_ops\scripts\normalize_prescription_source.py`
10. `C:\sfe_master_ops\scripts\normalize_territory_source.py`
11. `C:\sfe_master_ops\common\company_profile.py`
12. `C:\sfe_master_ops\common\company_runtime.py`
13. `C:\sfe_master_ops\common\company_onboarding_registry.py`
14. `C:\sfe_master_ops\adapters\crm\adapter_config.py`
15. `C:\sfe_master_ops\adapters\crm\crm_activity_adapter.py`
16. `C:\sfe_master_ops\adapters\sandbox\adapter_config.py`
17. `C:\sfe_master_ops\adapters\sandbox\domain_adapter.py`
18. `C:\sfe_master_ops\adapters\prescription\adapter_config.py`
19. `C:\sfe_master_ops\adapters\prescription\company_prescription_adapter.py`
20. `C:\sfe_master_ops\adapters\territory\adapter_config.py`
21. `C:\sfe_master_ops\data\company_source\company_000002\`
22. `C:\sfe_master_ops\data\standardized\company_000002\`
23. `C:\sfe_master_ops\data\company_source\company_000002\_onboarding\company_onboarding_registry.json`
24. `C:\sfe_master_ops\data\standardized\company_000002\crm\normalization_report.json`
25. `C:\sfe_master_ops\data\standardized\company_000002\sandbox\normalization_report.json`

## 문서와 실제 코드 차이

이번 조사에서 확인된 차이:

1. 문서는 `data/standardized/{company_key}/`를 말한다.
- 실제 원본 구현은 `data/standardized/{company_key}/`였다.

2. 문서는 adapter를 상위 개념으로 말하지만, 실제 구현은:
- `intake fix + staging`
- `adapter config`
- `adapter converter`
- `normalize script`
이 분리된 구조였다.

3. 문서는 `_intake_staging`를 개념적으로 설명한다.
- 실제 코드에서는 `COMPANY_SOURCE_ROOT` 환경변수로 runtime source root를 staging으로 바꿨다.

4. 문서는 “회사별 차이를 intake + adapter가 흡수한다”고 말한다.
- 실제 구현에서도 맞지만, intake가 이미 `canonical execution column` 추가와 `execution-ready dataframe 생성`까지 꽤 많이 담당했다.

즉 웹 프로젝트 재구현 시에는 `정규화 = adapter만 구현`으로 보면 안 되고, `intake 자동보정 -> staging -> adapter config 주입 -> standardized 저장` 전체를 한 단계 체계로 가져와야 한다.

