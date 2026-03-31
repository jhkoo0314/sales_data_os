# 원본 프로젝트 raw 생성 / 병합 / 전체 파이프라인 조사

조사 대상: `C:\sfe_master_ops`  
조사 일자: 2026-03-31  
주의: 이번 문서는 원본 프로젝트의 실제 코드와 문서를 기준으로 정리했다. 원본 폴더는 수정하지 않았다.

## 실제 확인한 핵심 결론

원본 프로젝트는 아래 4개가 **실제로 코드로 구현**되어 있었다.

1. 테스트용/검증용 raw 생성
2. 월별 raw 생성
3. 월별 raw 병합
4. intake -> staging -> normalize -> validate -> builder까지 이어지는 실행 파이프라인

즉 원본은 단순 문서 계획만 있었던 것이 아니다.  
특히 `monthly_merge_pharma` 같은 검증용 회사는:

- 월별 raw를 실제로 생성하고
- 같은 내용을 merged 파일로도 만들고
- 실행 시에는 `monthly_raw`를 먼저 병합해 표준 source 파일로 만들고
- 그 뒤 intake / staging / normalize / validate로 이어지는 구조였다.

쉽게 말하면:

`raw 만들기 -> monthly_raw 만들기 -> merged raw 만들기 -> intake에서 staging -> normalize -> validation -> builder`

이 흐름이 실제 코드로 있었다.

## raw 생성 스크립트 목록

### 1. 메인 raw 생성 진입점

- `C:\sfe_master_ops\scripts\generate_source_raw.py`

역할:

- 현재 활성 회사(`company_key`)를 읽고
- 그 회사에 맞는 raw generation config를 찾고
- 실제 raw 생성 엔진을 실행한다

### 2. raw generation 설정

- `C:\sfe_master_ops\scripts\raw_generators\configs.py`

여기서 회사별로 아래를 정했다.

- 회사 키
- 회사명
- 템플릿 종류
- 시작월 / 종료월
- 지점 수
- 의원 담당자 수
- 종합병원 담당자 수
- 포트폴리오 소스
- 출력 방식

실제 등록된 회사:

- `daon_pharma`
- `hangyeol_pharma`
- `monthly_merge_pharma`
- `tera_pharma`

중요:

- `daon_pharma`, `hangyeol_pharma`, `tera_pharma`는 `merged_only`
- `monthly_merge_pharma`는 `monthly_and_merged`

즉 `monthly_merge_pharma`는 애초에 월별 병합 검증용으로 설계된 raw 생성 대상이었다.

### 3. raw generation 엔진

- `C:\sfe_master_ops\scripts\raw_generators\engine.py`

역할:

- config의 `template_type`에 따라 템플릿 모듈 선택
- `output_mode`가 `monthly_and_merged`면 월별+병합용 함수 실행
- 아니면 일반 merged raw 생성 함수 실행

### 4. 템플릿 구현

- `C:\sfe_master_ops\scripts\raw_generators\templates\daon_like.py`
- `C:\sfe_master_ops\scripts\raw_generators\templates\hangyeol_like.py`
- 보조 함수
  - `C:\sfe_master_ops\scripts\raw_generators\templates\daon_like_helpers.py`
  - `C:\sfe_master_ops\scripts\raw_generators\templates\hangyeol_like_helpers.py`

역할:

- rep master 생성
- account master 생성
- company assignment 생성
- CRM raw 생성
- sales / target raw 생성
- fact_ship raw 생성

즉 샘플 파일 몇 개만 만드는 수준이 아니라, 회사 운영 입력 구조 전체를 생성했다.

### 5. 파일 쓰기 유틸

- `C:\sfe_master_ops\scripts\raw_generators\writers.py`

역할:

- source별 merged 파일 쓰기
- 월별 파일 쓰기
- json 요약 저장
- csv 요약표 저장

## raw 병합 스크립트 목록

### 1. 월별 raw 생성 + merged raw 동시 생성

- `C:\sfe_master_ops\scripts\raw_generators\templates\daon_like.py`
  - `run_monthly_and_merged_template(...)`

이 함수는 실제로 아래를 했다.

- `monthly_raw/YYYYMM/` 폴더마다 월별 파일 생성
- 각 월별 CRM / target / sales / prescription 파일 생성
- 생성된 월별 데이터를 메모리에서 다시 합쳐 merged raw도 생성
- 월별 합계와 merged 합계가 같은지 요약 파일로 검증

즉 병합 테스트용 raw를 만드는 코드가 실제로 있었다.

### 2. 실행 시 월별 raw 자동 병합

- `C:\sfe_master_ops\modules\intake\merge.py`

여기가 실제 월별 병합 엔진이다.

실제로 한 일:

- `data/company_source/{company_key}/monthly_raw/` 존재 확인
- 월 폴더 목록 확인
- 병합 대상 파일 읽기
- 세로로 합치기
- 표준 source 파일 위치에 다시 저장

병합 대상 source:

- `crm_activity`
- `sales`
- `target`
- `prescription`

월별 파일명 규칙:

- `crm_activity_raw.xlsx`
- `sales_raw.xlsx`
- `target_raw.xlsx`
- `fact_ship_raw.csv`

### 3. 병합 결과를 어디에 썼는지

출처:

- `C:\sfe_master_ops\modules\intake\merge.py`

병합 결과는 별도 특수 폴더가 아니라, **원래 source_targets가 가리키는 표준 source 경로**에 썼다.

쉽게 말하면:

- 월별 파일은 보조 입력
- 병합 후에는 원래 raw 자리로 다시 써서
- 이후 파이프라인은 평소처럼 merged raw를 읽는다

## 파일명 / 폴더명 규칙

### 원본의 표준 source 경로

출처:

- `C:\sfe_master_ops\common\company_profile.py`

원본 기준 표준 경로는 아래였다.

- `crm_activity` -> `crm/crm_activity_raw.xlsx`
- `crm_rep_master` -> `company/company_assignment_raw.xlsx`
- `crm_account_assignment` -> `company/account_master.xlsx`
- `crm_rules` -> `company/crm_rules_raw.xlsx`
- `sales` -> `sales/sales_raw.xlsx`
- `target` -> `target/target_raw.xlsx`
- `prescription` -> `company/fact_ship_raw.csv`
- `rep_master` -> `company/rep_master.xlsx`

중요:

이 구조는 지금 `sales_os`와 다르다.  
원본은 이 구조를 그대로 두고 intake와 adapter에서 흡수했다.

### 월별 폴더 규칙

출처:

- `C:\sfe_master_ops\docs\architecture\18_real_company_raw_input_flow.md`
- `C:\sfe_master_ops\modules\intake\merge.py`
- `C:\sfe_master_ops\scripts\raw_generators\writers.py`

월별 raw는 아래에 있었다.

```text
data/company_source/{company_key}/monthly_raw/YYYYMM/
```

예:

```text
data/company_source/monthly_merge_pharma/monthly_raw/202501/
data/company_source/monthly_merge_pharma/monthly_raw/202502/
```

### 파일명 이관 스크립트

- `C:\sfe_master_ops\scripts\migrate_company_source_filenames.py`

역할:

- 예전 `hangyeol_*` 파일명을 표준 파일명으로 바꿈

예:

- `hangyeol_crm_activity_raw.xlsx` -> `crm_activity_raw.xlsx`
- `hangyeol_sales_raw.xlsx` -> `sales_raw.xlsx`
- `hangyeol_fact_ship_raw.csv` -> `fact_ship_raw.csv`

즉 raw 생성만 있던 것이 아니라, **기존 파일명을 표준 이름으로 옮기는 준비 스크립트도 실제로 있었다.**

## intake 이전 준비 스크립트 / 로직

원본은 “normalize 전에 바로 adapter 실행”이 아니었다.  
중간 준비 단계가 실제로 있었다.

### 1. 파일명 정리

- `C:\sfe_master_ops\scripts\migrate_company_source_filenames.py`

### 2. 업로드 반영 / 월별 병합 / intake 검사

- `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`

실제 순서:

1. 업로드 파일을 source 경로에 반영
2. `monthly_raw`가 있으면 자동 병합
3. intake 검사 실행
4. adapter 전달 가능 여부 확인
5. `_intake_staging` 경로 준비

### 3. intake / onboarding / staging

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\modules\intake\staging.py`
- `C:\sfe_master_ops\modules\intake\runtime.py`

실제로 한 일:

- 컬럼 구조 점검
- 자동 보정
- candidate 추천
- 실행용 canonical 컬럼 추가
- `_intake_staging`에 정리본 저장
- `_onboarding`에 intake snapshot 저장

즉 normalize 전에 이미 한번 정리된 파일을 따로 만들었다.

## normalization 진입 스크립트 목록

### CRM

- `C:\sfe_master_ops\scripts\normalize_crm_source.py`

입력:

- `crm_account_assignment`
- `crm_rep_master`
- `crm_activity`

출력:

- `ops_hospital_master.xlsx`
- `ops_company_master.xlsx`
- `ops_crm_activity.xlsx`
- `unmapped_*`
- `normalization_report.json`

설명:

원본 CRM raw를 adapter로 읽어서 OPS 표준 CRM 파일로 바꾼다.

### Sandbox

- `C:\sfe_master_ops\scripts\normalize_sandbox_source.py`

입력:

- `sales`
- `target`
- `crm_account_assignment`

출력:

- `ops_sales_records.xlsx`
- `ops_target_records.xlsx`
- `failed_*`
- `normalization_report.json`

설명:

sales/target raw를 표준 sales/target records로 바꾼다.  
중간에 병원 ID가 안 맞으면 account master를 보고 다시 맞추는 보정도 들어 있다.

### Prescription

- `C:\sfe_master_ops\scripts\normalize_prescription_source.py`

입력:

- `prescription` raw

출력:

- `ops_prescription_standard.xlsx`
- `failed_prescription_rows.xlsx`
- `normalization_report.json`

설명:

fact_ship raw를 표준 처방 흐름 입력으로 바꾼다.

### Territory

- `C:\sfe_master_ops\scripts\normalize_territory_source.py`

입력:

- CRM 표준화 결과 `ops_crm_activity.xlsx`
- `crm_account_assignment`

출력:

- `ops_territory_activity.xlsx`
- `unmapped_territory_activity.xlsx`
- `normalization_report.json`

설명:

territory는 raw를 직접 읽기보다, **CRM 표준화 결과를 다시 이용하는 구조**였다.

## 전체 파이프라인 진입 스크립트 목록

### 통합 실행

- `C:\sfe_master_ops\scripts\validate_full_pipeline.py`

역할:

- 실행 모드 `integrated_full` 호출
- 전체 단계를 순서대로 실행
- 최종 pipeline summary 저장

### 개별 validate 스크립트

- `C:\sfe_master_ops\scripts\validate_crm_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_prescription_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_sandbox_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_territory_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_radar_with_ops.py`
- `C:\sfe_master_ops\scripts\validate_builder_with_ops.py`

역할:

- 각 모듈별 validation 결과와 summary 생성
- 일부는 builder payload까지 생성

## 단계별 실행 흐름

원본 전체 흐름은 아래처럼 이해하면 된다.

### 1. raw 만들기

출처:

- `scripts/generate_source_raw.py`
- `scripts/raw_generators/*`

테스트/검증용 회사를 선택하면 회사별 raw가 생성된다.

### 2. 파일명 표준화

출처:

- `scripts/migrate_company_source_filenames.py`

예전 이름 파일을 현재 표준 이름으로 정리한다.

### 3. 실행 시작

출처:

- `scripts/validate_full_pipeline.py`
- `ops_core/workflow/execution_service.py`

실행 모드에 맞는 전체 단계를 시작한다.

### 4. 업로드 반영과 월별 병합

출처:

- `ops_core/workflow/execution_runtime.py`
- `modules/intake/merge.py`

업로드 파일이 있으면 source에 반영하고, `monthly_raw`가 있으면 merged raw를 다시 만든다.

### 5. intake / staging

출처:

- `modules/intake/service.py`
- `modules/intake/staging.py`
- `modules/intake/runtime.py`

raw를 검사하고, 자동 보정하고, `_intake_staging`에 adapter용 정리본을 만든다.

### 6. normalize

출처:

- `scripts/normalize_*.py`

module별 adapter가 `_intake_staging` 기준 source root를 읽어 OPS 표준 데이터로 바꾼다.

중요:

병합 결과는 원래 source 경로에 먼저 써지고,  
adapter는 최종적으로 `_intake_staging`을 입력 루트로 쓰는 구조였다.

### 7. validate

출처:

- `scripts/validate_*_with_ops.py`

표준화 결과를 validation layer로 평가해 quality 상태와 점수를 만든다.

### 8. radar / builder

출처:

- `scripts/validate_radar_with_ops.py`
- `scripts/validate_builder_with_ops.py`

validation 결과를 바탕으로 신호를 만들고 보고서를 렌더링한다.

## 특히 확인한 질문에 대한 답

### 원본에는 월별 raw 병합 스크립트가 실제로 있었는지

있었다.

실제 코드:

- `C:\sfe_master_ops\modules\intake\merge.py`

### 있었다면 어디에 있었는지

- 실행 단계 쪽: `modules/intake/merge.py`
- 테스트용 월별 생성 쪽: `scripts/raw_generators/templates/daon_like.py`

즉:

- 하나는 월별 raw를 **만드는 코드**
- 하나는 월별 raw를 **실행 전에 합치는 코드**

였다.

### 단순 문서 계획인지, 실제 코드 구현인지

실제 코드 구현이었다.

근거:

- `merge_monthly_raw_sources(...)` 함수가 실제로 존재
- `run_monthly_and_merged_template(...)` 함수가 실제로 존재
- `execution_runtime.py`에서 병합 함수를 실제로 호출

### 병합 결과를 adapter가 바로 읽었는지, `_intake_staging`을 거쳤는지

둘 다 있었다.

정확히는:

1. 월별 raw를 먼저 표준 source 파일 위치에 병합 저장
2. intake가 그 source를 읽고 `_intake_staging` 정리본 생성
3. adapter는 `_intake_staging`를 입력 루트로 사용

즉 **월별 병합 직후 바로 adapter**가 아니라, 보통은 **병합 -> intake staging -> adapter** 흐름이었다.

### 샘플/테스트용 raw를 만드는 스크립트와 실제 운영용 실행 스크립트가 어떻게 달랐는지

샘플/테스트용:

- `scripts/generate_source_raw.py`
- `scripts/raw_generators/*`

역할:

- 데이터를 만들어 넣는 쪽

실제 운영 실행용:

- `scripts/validate_full_pipeline.py`
- `scripts/normalize_*.py`
- `scripts/validate_*_with_ops.py`
- `ops_core/workflow/execution_service.py`
- `ops_core/workflow/execution_runtime.py`

역할:

- 이미 있는 raw를 읽고
- 병합하고
- intake 하고
- normalize 하고
- validate 하고
- builder까지 넘기는 쪽

쉽게 말하면:

- raw generator = 시험용 입력 만들기
- execution pipeline = 실제 입력을 돌려 결과 만들기

## `C:\sales_os`에 바로 가져와야 할 것

우선순위 높음:

1. 월별 raw 병합 엔진
2. 병합 전용 파일명 규칙
3. 실행 시작 전에 `monthly_raw` 자동 감지 후 병합
4. 병합 후 intake -> `_intake_staging` -> normalize 흐름
5. raw generator까지는 아니어도, 병합 검증용 fixture 생성 구조

특히 지금 `sales_os`에는 “월별 폴더는 읽지만 자동 병합해서 본파일로 만드는 엔진”이 비어 있거나 약한 상태일 가능성이 높다.  
이 부분은 원본에서 바로 가져올 가치가 크다.

## 지금 `C:\sales_os`에 없는 것

원본과 비교해 현재 없는 것으로 보이는 것:

1. `monthly_raw` 실제 병합 구현
2. 검증용 `monthly_and_merged` raw 생성 구조
3. 파일명 이관 스크립트 같은 사전 정리 도구
4. raw 생성 / 병합 / intake / normalize / validate를 한 흐름으로 보는 실행 구조

## 확인한 내용과 추측을 구분

### 실제 확인한 내용

- `scripts/generate_source_raw.py`가 실제 raw generator 진입점이다.
- `scripts/raw_generators/configs.py`에 회사별 생성 설정이 있다.
- `monthly_merge_pharma`는 `monthly_and_merged` 모드로 등록돼 있다.
- `scripts/raw_generators/templates/daon_like.py`에 `run_monthly_and_merged_template(...)`가 있다.
- `modules/intake/merge.py`에 월별 raw 병합 코드가 있다.
- `ops_core/workflow/execution_runtime.py`에서 병합을 실제 호출한다.
- `scripts/normalize_*.py`가 모듈별 normalize 진입점이다.
- `scripts/validate_full_pipeline.py`가 통합 실행 진입점이다.
- `execution_service.py`와 `execution_registry.py`가 실행 순서를 실제로 구성한다.

### 추측 또는 해석

- 현재 `sales_os`는 원본의 월별 병합 구조를 아직 충분히 옮기지 못한 상태로 보인다.
- raw generator 전체를 그대로 가져오기보다, 먼저 `monthly_raw -> merged raw -> intake_staging` 흐름만 옮기는 것이 더 실용적이다.
- `sales_os`에서 당장 필요한 것은 “데이터 생성기”보다 “실제 월별 병합 엔진”이다.

위 세 문장은 조사 내용을 바탕으로 한 해석이다.  
앞의 “실제 확인한 내용”보다 한 단계 높은 판단으로 보면 된다.
