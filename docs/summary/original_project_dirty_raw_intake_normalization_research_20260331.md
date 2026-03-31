# 원본 프로젝트 dirty raw intake/normalization 조사

조사 대상: `C:\sfe_master_ops`  
조사 일자: 2026-03-31  
주의: 이번 문서는 `C:\sales_os`를 기준으로 추측하지 않고, 원본 코드와 문서에서 직접 확인한 내용만 먼저 정리했다.

## 실제 확인한 핵심 결론

원본 프로젝트는 더러운 raw를 주로 `adapter` 안에서 해결한 것이 아니었다.  
핵심은 **`modules/intake`에서 먼저 정리하고, `_intake_staging`에 실행용 파일을 다시 만들어서 adapter로 넘기는 구조**였다.

흐름을 아주 쉽게 말하면 이렇다.

`회사 raw -> intake gate -> onboarding -> _intake_staging -> adapter -> 기존 계산 파이프라인`

즉 원본은:

- raw를 받자마자 기본 정리
- 컬럼 의미 추정
- 자동 보정 가능한 것은 바로 수정
- 애매한 것은 제안 문구로 남김
- 실행에 꼭 필요한 컬럼은 intake에서 실행용으로 덧붙임
- 그래도 부족하면 `needs_review` 또는 `blocked`

이 방식이었다.

중요한 포인트는 하나 더 있다.

원본의 회사별 실제 파일 구조는 지금 `sales_os`처럼 이미 깔끔하게 통일된 구조가 아니었다.  
예를 들어 `crm_rep_master`, `crm_account_assignment`, `prescription`, `target` 경로도 지금과 달랐다.  
그런데도 원본은 **앞단 intake + staging + adapter canonicalization**으로 그 차이를 흡수했다.

## dirty raw 대응 로직이 들어 있는 실제 파일

### 1. Intake 진입과 전체 조립

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`

여기가 제일 중요했다.  
실제 intake 결과를 만들고, `ready / ready_with_fixes / needs_review / blocked`를 정하고, staging 파일을 만들고, adapter로 넘길지 말지를 결정한다.

### 2. 자동 보정

- `C:\sfe_master_ops\modules\intake\fixers.py`

여기서 실제로 한 일:

- 컬럼명 앞뒤 공백 정리
- 중복 헤더 이름 구분
- 완전히 같은 행 제거
- 월 형식 `YYYYMM` 맞춤
- 날짜 형식 `YYYY-MM-DD` 맞춤

### 3. 컬럼 의미 규칙

- `C:\sfe_master_ops\modules\intake\rules.py`

여기서 source별로:

- 어떤 의미 컬럼이 필수인지
- 어떤 별칭(alias)을 같은 뜻으로 볼지
- 어떤 항목은 필수는 아니지만 검토하면 좋은지

를 정의했다.

### 4. 후보 추천과 사람 검토 문구

- `C:\sfe_master_ops\modules\intake\suggestions.py`
- `C:\sfe_master_ops\tests\test_intake\test_intake_suggestions.py`

여기서는 컬럼명이 애매할 때:

- 가장 그럴듯한 후보를 뽑고
- “이 컬럼이 맞는지만 확인해 주세요” 같은 문구를 만들고
- 언제 `mapping_review_required`로 올릴지 결정했다.

### 5. staging / onboarding 저장

- `C:\sfe_master_ops\modules\intake\staging.py`
- `C:\sfe_master_ops\common\company_onboarding_registry.py`

여기서:

- `_intake_staging`에 정리된 실행용 파일 저장
- `_onboarding`에 source별 onboarding package 저장
- `company_onboarding_registry.json`에 확정된 매핑 저장

을 했다.

### 6. 월별 파일 병합

- `C:\sfe_master_ops\modules\intake\merge.py`

월별 raw가 여러 개로 들어온 경우 먼저 합쳐서 intake가 보게 했다.

### 7. adapter 쪽 2차 정리

- `C:\sfe_master_ops\adapters\crm\adapter_config.py`
- `C:\sfe_master_ops\adapters\sandbox\domain_adapter.py`
- `C:\sfe_master_ops\adapters\prescription\company_prescription_adapter.py`

원본은 intake에서 1차 정리를 끝낸 뒤에도, adapter 안에서 domain별 보정을 조금 더 했다.

예:

- prescription 날짜 포맷 여러 형태 파싱
- sandbox에서 병원 ID가 없으면 병원명으로 fallback
- adapter config에서 회사별 컬럼명 차이 흡수

## 단계별 처리 흐름

원본의 실제 단계 흐름은 아래처럼 보는 게 맞다.

### 1. 파일 수집

실행 진입점:

- `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`
- `C:\sfe_master_ops\scripts\validate_full_pipeline.py`

실행 전에:

- 업로드 파일을 source 위치에 반영하고
- 월별 raw가 있으면 먼저 병합하고
- 그 다음 intake를 호출했다.

### 2. intake 기본 보정

`modules/intake/fixers.py`에서:

- 컬럼명 trim
- 중복 컬럼명 정리
- 중복 행 제거
- 날짜/월 포맷 정리

를 먼저 했다.

### 3. 의미 매핑 추정

`modules/intake/service.py` + `modules/intake/rules.py` + `modules/intake/suggestions.py`에서:

- 이 컬럼이 담당자용인지
- 거래처용인지
- 제품용인지
- 금액/수량/월/날짜용인지

를 추정했다.

### 4. 실행용 컬럼 자동 추가

`C:\sfe_master_ops\modules\intake\service.py`

여기서 `_ADAPTER_CANONICAL_COLUMN_MAP`를 써서 원본 컬럼 옆에 **adapter가 바로 읽을 수 있는 실행용 컬럼명**을 자동으로 추가했다.

예:

- `병원명` -> `방문기관`
- `방문일` / `활동일` -> `실행일`
- `목표금액` -> `계획금액`
- `출고일` -> `ship_date (출고일)`

이 단계가 매우 중요했다.  
원본은 adapter를 회사마다 계속 고치기보다, intake 쪽에서 adapter가 좋아하는 이름으로 미리 한 번 더 맞췄다.

### 5. 부족한 운영 필수 파일 보강

`C:\sfe_master_ops\modules\intake\service.py`

여기서 두 가지를 실제로 만들었다.

- `_build_execution_ready_crm_account_assignment(...)`
- `_build_execution_ready_crm_rep_master(...)`

쉽게 말하면:

- 거래처 담당 배정표가 모자라면 CRM 활동 파일과 다른 master를 이용해 실행용 배정표를 보강
- 담당자/조직 마스터가 모자라면 배정표를 이용해 실행용 마스터를 보강

즉 원본은 **필수 소스가 조금 부족해도 그냥 실패시키지 않고, 실행 가능한 수준까지 복원하려고 시도**했다.

### 6. staging 저장

`C:\sfe_master_ops\modules\intake\staging.py`

여기서 정리된 데이터프레임을 `_intake_staging`에 저장하고, onboarding package와 latest snapshot도 같이 남겼다.

### 7. adapter 실행

`C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`

`intake_result.ready_for_adapter`가 `True`일 때만 `_intake_staging` 경로를 adapter 입력 루트로 활성화했다.

즉 원본은 **원본 raw를 바로 adapter에 태우는 구조가 아니라, intake가 다시 만든 staging 파일을 adapter가 읽는 구조**였다.

## 자동 보정 규칙

실제 확인한 자동 보정은 아래다.

### intake 기본 보정

출처:

- `C:\sfe_master_ops\modules\intake\fixers.py`

확인한 내용:

- 컬럼명 앞뒤 공백 제거
- 컬럼명 내부 중복 공백 정리
- 중복 헤더를 `_2`, `_3` 식으로 구분
- 완전히 동일한 행 삭제
- `2025-01`, `2025/01`, `2025.01` 같은 월 값을 `202501`로 맞춤
- 날짜를 `YYYY-MM-DD`로 맞춤

### 의미 컬럼 alias 매핑

출처:

- `C:\sfe_master_ops\modules\intake\rules.py`

확인한 내용:

- `crm_activity`
  - `방문일`, `방문일자`, `활동일`, `실행일` 등을 같은 뜻으로 봄
- `sales`
  - `제품명`, `브랜드명`, `브랜드코드` 등을 제품 의미 후보로 봄
- `target`
  - `목표금액`, `계획금액` 등을 같은 뜻으로 봄
- `prescription`
  - `ship_date출고일`, `brand브랜드`, `skusku`처럼 정규화된 문자열까지 alias로 포함

즉 원본은 단순 정확 일치가 아니라, 흔들린 이름을 꽤 넓게 받아줬다.

### 실행용 컬럼명 자동 추가

출처:

- `C:\sfe_master_ops\modules\intake\service.py`

확인한 내용:

- adapter가 좋아하는 컬럼명을 새로 복사 생성
- 원본 컬럼을 지우지 않고 옆에 추가
- 이 작업은 `canonicalize_adapter_columns`라는 fix로 기록

### 운영 필수 source 보강

출처:

- `C:\sfe_master_ops\modules\intake\service.py`

확인한 내용:

- `crm_account_assignment`가 부족하면 다른 source로 실행용 컬럼을 만들어 보강
- `crm_rep_master`가 부족하면 assignment 기반으로 실행용 마스터를 보강

### 월별 파일 병합

출처:

- `C:\sfe_master_ops\modules\intake\merge.py`

확인한 내용:

- source별 월별 raw를 먼저 합쳐 하나의 intake 입력으로 맞춤

### adapter 내부 추가 보정

출처:

- `C:\sfe_master_ops\adapters\prescription\company_prescription_adapter.py`
- `C:\sfe_master_ops\adapters\sandbox\domain_adapter.py`

확인한 내용:

- prescription 날짜를 여러 포맷으로 해석
- 병원 ID가 없으면 병원명 기준으로 매칭 시도
- 실패한 행은 `_fail_reason`과 함께 따로 관리

## 사람 검토로 넘기는 규칙

원본은 “애매하면 무조건 막는 방식”이 아니었다.

### 1. 바로 통과 `ready`

조건:

- 필수 의미 컬럼이 거의 다 잡힘
- 큰 문제 없음
- advisory만 있어도 실행 가능

근거:

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\tests\test_intake\test_intake_relaxed_gate.py`

실제 테스트에서, 후보 추천이 붙어도 `ready_for_adapter`가 `True`로 유지되는 케이스를 확인했다.

### 2. 자동 고친 뒤 통과 `ready_with_fixes`

조건:

- 컬럼 trim, 날짜 정리, canonical 컬럼 추가 같은 자동 수정이 있었음
- 하지만 adapter 실행에는 문제 없음

근거:

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\modules\intake\fixers.py`

### 3. 사람 확인 필요 `needs_review`

조건:

- 필수 의미 컬럼을 아직 확정 못함
- `mapping_review_required` 제안이 생김
- intake 기본 검사는 통과했지만 adapter 실행용 필수 컬럼이 아직 부족함

근거:

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\modules\intake\suggestions.py`

쉽게 말하면:

- “후보는 보이는데 확정이 어려움”
- “계산 돌리기 전 사람이 한번 봐야 안전함”

이 상태다.

### 4. 차단 `blocked`

조건:

- required source 자체가 없음
- 업로드도 없고 기존 source 경로에도 파일이 없음

근거:

- `C:\sfe_master_ops\modules\intake\service.py`

## 운영 필수 source를 원본에서 어떻게 다뤘는지

### 실제 source 경로 정의

출처:

- `C:\sfe_master_ops\common\company_profile.py`

원본의 표준 source 경로는 아래처럼 잡혀 있었다.

- `crm_activity` -> `crm/crm_activity_raw.xlsx`
- `crm_rep_master` -> `company/company_assignment_raw.xlsx`
- `crm_account_assignment` -> `company/account_master.xlsx`
- `crm_rules` -> `company/crm_rules_raw.xlsx`
- `sales` -> `sales/sales_raw.xlsx`
- `target` -> `target/target_raw.xlsx`
- `prescription` -> `company/fact_ship_raw.csv`

즉 지금 `sales_os`와 파일 구조가 다르다.  
원본은 이 차이를 그냥 adapter로 넘기지 않고 intake에서 흡수했다.

### 필수인지 선택인지

출처:

- `C:\sfe_master_ops\ops_core\workflow\execution_registry.py`
- `C:\sfe_master_ops\modules\intake\scenarios.py`

확인한 내용:

- 실행 모드별 required uploads가 따로 있었다.
- 예를 들어 `integrated_full`은 `crm_activity`, `crm_rep_master`, `crm_account_assignment`, `sales`, `target`, `prescription`을 요구했다.
- `crm_rules`는 시나리오 source에는 포함되지만, 실행 필수 업로드 목록과는 분리되어 보인다.

쉽게 말하면:

- 어떤 파일은 모듈 실행에 꼭 필요했고
- 어떤 파일은 intake/onboarding 품질과 설명력 보강용으로도 함께 다뤄졌다.

### 다음 단계 입력으로 어떻게 바꿨는지

출처:

- `C:\sfe_master_ops\modules\intake\service.py`
- `C:\sfe_master_ops\modules\intake\staging.py`

확인한 내용:

- 원본 raw를 그대로 넘기지 않고
- canonical 컬럼을 붙이고
- 부족한 master/assignment를 보강하고
- `_intake_staging`에 실행용 파일로 다시 저장한 뒤
- adapter는 그 staging 파일을 읽었다.

## 원본의 단계별 실행 진입점

### 전체 실행 진입

- `C:\sfe_master_ops\scripts\validate_full_pipeline.py`

이 스크립트가 실행 모드 `integrated_full`을 호출한다.

### 실행 전 준비

- `C:\sfe_master_ops\ops_core\workflow\execution_runtime.py`

여기서:

- 업로드 반영
- 월별 병합
- intake 검사
- adapter 전달 가능 여부 확인
- staging 경로 활성화

를 한다.

### normalize 관련 스크립트

- `C:\sfe_master_ops\scripts\normalize_crm_source.py`
- `C:\sfe_master_ops\scripts\normalize_sandbox_source.py`
- `C:\sfe_master_ops\scripts\normalize_prescription_source.py`
- `C:\sfe_master_ops\scripts\normalize_territory_source.py`

이 스크립트들은 adapter를 직접 태우는 normalize 진입점 역할을 했다.

### 공통 구조

실제 코드에서 보이는 공통 구조는 아래다.

- `scenario`: `modules/intake/scenarios.py`
- `rules`: `modules/intake/rules.py`
- `fixers`: `modules/intake/fixers.py`
- `suggestions`: `modules/intake/suggestions.py`
- `engine/service`: `modules/intake/service.py`
- `staging`: `modules/intake/staging.py`

즉 문서에만 있는 아이디어가 아니라, 실제 코드 구조도 이 분리 방식을 따르고 있었다.

## 테스트로 확인된 방식

### 자동 매핑 테스트

- `C:\sfe_master_ops\tests\test_intake\test_intake_auto_mapping.py`

확인한 내용:

- 현실적인 CRM 컬럼명
- daon 스타일 CRM 컬럼명
- 현실적인 sales/target 컬럼명
- 현실적인 prescription 컬럼명

을 넣고 `_resolve_mapping(...)`이 제대로 잡는지 테스트했다.

### 후보 경고는 바로 차단하지 않는 테스트

- `C:\sfe_master_ops\tests\test_intake\test_intake_relaxed_gate.py`

확인한 내용:

- 후보 컬럼 추천이 붙어도, 치명적이지 않으면 `ready_for_adapter=True`를 유지한다.

### 기간 정렬 테스트

- `C:\sfe_master_ops\tests\test_intake\test_intake_period_alignment.py`

확인한 내용:

- source 간 공통 분석 구간과 기간 차이 경고를 테스트했다.

## `C:\sales_os`에 바로 가져와야 할 것

우선순위 높음:

1. `intake`를 `파일 존재 확인` 수준에서 끝내지 말고, 원본처럼 **fixers + rules + suggestions + staging** 구조로 분리
2. 원본의 `apply_basic_intake_fixes` 수준 자동 보정 도입
3. `_ADAPTER_CANONICAL_COLUMN_MAP` 같은 **실행용 컬럼 자동 추가 레이어** 도입
4. `crm_account_assignment`, `crm_rep_master`를 필요하면 **실행용으로 보강하는 복원 로직** 도입
5. `_intake_staging`와 `_onboarding`를 단순 결과 폴더가 아니라 **공식 intake 산출물**로 사용
6. `ready / ready_with_fixes / needs_review / blocked` 판정을 지금보다 더 명확히 분리
7. candidate는 advisory로 남기고, 정말 막아야 할 경우만 `needs_review` 또는 `blocked`로 올리는 원칙 반영

## `C:\sales_os`에서 새로 만들어야 할 것

원본을 그대로 복사하면 안 되고, 현재 웹 구조에 맞춰 새로 만들어야 하는 것도 있다.

1. `source-schema.ts`와 별도로 `dirty raw intake rule` 계층
2. `column fixer` 유틸
3. `candidate suggestion` 계층
4. `execution-ready canonical column builder`
5. `account_master`, `crm_rep_master`, `crm_account_assignment` 관계를 이용한 보강 로직
6. intake 결과를 저장하는 onboarding registry 구조
7. 단계별 테스트 세트
8. “자동 수정됨”, “사람 검토 필요”, “실행 차단”을 사용자가 쉽게 이해하는 설명 문구

## 지금 `sales_os`에서 먼저 가져와야 할 로직 / 나중에 가져와도 되는 로직

### 지금 먼저

- 컬럼명/값 기본 정리
- alias 매핑 확장
- candidate suggestion
- canonical 실행용 컬럼 복사
- master/assignment 보강
- `_intake_staging` 기준 재실행

이 다섯 가지는 지금 dirty raw 대응을 만들려면 바로 필요하다.

### 나중에 가져와도 되는 것

- source 간 기간 차이 요약 문구 고도화
- onboarding registry의 장기 이력 관리
- raw generator 계열
- 각 adapter 내부의 세부 fallback 고도화

## 확인한 내용과 추측을 분리

### 실제 확인한 내용

- 원본은 `modules/intake`를 중심으로 dirty raw를 처리했다.
- `_intake_staging`에 정리된 파일을 저장하고 adapter는 그 경로를 사용했다.
- `fixers.py`에서 공백/중복 헤더/중복 행/날짜/월 보정을 했다.
- `rules.py`와 `suggestions.py`에서 alias와 후보 추천을 관리했다.
- `service.py`에서 canonical 컬럼 자동 추가와 실행용 source 보강을 했다.
- `execution_runtime.py`에서 intake 결과가 adapter 전달 가능하지 않으면 실행을 막았다.
- 테스트 코드가 실제로 존재했고, 현실적인 dirty 컬럼명을 기준으로 매핑을 검증했다.

### 추측 또는 해석

- `crm_rules`는 원본에서 실행 필수 업로드보다는 시나리오 연결과 설명 품질 쪽 비중이 더 커 보인다.
- 원본의 intake/onboarding 설계는 결국 “회사별 adapter 수정 최소화”가 제일 큰 목표였다고 해석된다.
- 현재 `sales_os`는 좋은 raw는 통과시키기 시작했지만, 원본 수준의 dirty raw 대응은 아직 `modules/intake/service.py` 정도의 다층 구조가 부족하다.

이 세 문장은 코드와 문서를 바탕으로 한 해석이다.  
앞의 “실제 확인한 내용”보다 한 단계 높은 추론으로 보면 된다.
