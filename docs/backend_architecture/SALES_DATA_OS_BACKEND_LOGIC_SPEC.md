# Sales Data OS 백엔드 설계 문서 01. 운영 로직 명세

작성일: 2026-03-31  
문서 구분: 백엔드 설계 문서  
대상: 운영 로직과 백엔드 흐름을 먼저 정리해야 하는 설계/정리 세션  
작성 기준: 현재 저장소 구현 + 루트/아키텍처 문서 기준

## 문서 목적

이 문서는 `Sales Data OS Web` 화면 설명이 아니라,  
뒤에서 실제로 어떤 입력을 받고 어떤 판단을 거쳐 어떤 결과를 다음 단계로 넘기는지 정리한 운영 로직 문서다.

중요:

- 이 프로젝트는 단순 웹앱이 아니라 `Sales Data OS 운영 체계`다.
- 시스템 전체 이름은 반드시 `Sales Data OS`다.
- `validation`은 시스템 전체 이름이 아니라 `Validation / Orchestration Layer`다.
- 공식 흐름은 아래를 기준으로 본다.

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

조금 더 실제 저장소 구조에 맞게 풀어 쓰면 아래와 같다.

`raw 입력 -> intake 검증/보정 -> adapter 정규화 -> module/kpi 계산 -> validation -> result asset / builder payload -> builder`

현재 기준 모듈 구조는 아래 9개다.

- `crm`
- `sandbox`
- `territory`
- `prescription`
- `radar`
- `kpi`
- `intake`
- `builder`
- `validation`

---

## 01_input_spec

### 1. 입력으로 받는 파일 종류

현재 운영 기준으로 받는 주요 입력은 아래다.

- `crm_activity`
  - 영업 활동 원본
- `crm_rep_master`
  - 담당자/조직 마스터
- `crm_account_assignment`
  - 병원-담당자 배정 정보
- `crm_rules`
  - CRM 규칙/KPI 설정
- `sales`
  - 실적 데이터
- `target`
  - 목표 데이터
- `prescription`
  - 처방/출고 흐름 데이터

### 2. 파일별 역할

- `crm_activity`
  - 누가, 언제, 어떤 병원에서, 어떤 활동을 했는지 보여주는 출발 데이터
- `crm_rep_master`
  - 담당자와 조직 구조를 고정하는 기준표
- `crm_account_assignment`
  - 어떤 병원이 누구 담당인지 연결하는 기준표
- `crm_rules`
  - CRM KPI 해석에 쓰는 설정성 데이터
- `sales`
  - 실적 결과 데이터
- `target`
  - 목표 기준 데이터
- `prescription`
  - 도매-약국-병원 흐름 또는 출고 흐름 검증에 쓰는 데이터

### 3. 필수 파일 / 선택 파일

실행모드에 따라 다르지만 운영 관점에서는 아래처럼 보면 된다.

- 기본 CRM 계열 필수
  - `crm_activity`
  - `crm_rep_master`
  - `crm_account_assignment`
- CRM 보조
  - `crm_rules`
  - 없어도 기본 실행은 가능할 수 있지만, 규칙 해석 품질은 낮아질 수 있다
- Sandbox/성과 관점 필수
  - `sales`
  - `target`
- Prescription 관점 필수
  - `prescription`

쉽게 말하면:

- `CRM만 볼 때`는 CRM 입력 세트가 우선이다
- `Sandbox/통합 실행`은 `sales`, `target`이 사실상 필요하다
- `Prescription 보고서`를 만들려면 `prescription`이 필요하다

### 4. 회사별 파일 형식 차이

있다. 이 프로젝트는 그 차이를 전제로 설계되어 있다.

대표 차이:

- 파일명 차이
- 컬럼명 차이
- 병원/담당자/제품 식별 방식 차이
- 날짜/월 표기 차이

이 차이는 validation 레이어가 직접 해결하지 않는다.  
먼저 `company_key + intake + adapter`가 흡수한다.

### 5. 파일별 필수 컬럼

아래는 현재 `modules/intake/rules.py` 기준 핵심 필수 컬럼이다.

#### `crm_activity`

- `activity_date`
- `rep`
- `account`
- `activity_type`

대표 별칭 예:

- `activity_date`: `방문일`, `활동일`, `실행일`
- `rep`: `담당자명`, `사원명`, `영업사원명`
- `account`: `병원코드`, `병원명`, `거래처명`
- `activity_type`: `활동유형`, `액션유형`, `call_type`

#### `crm_rep_master`

- `rep`
- `organization`

#### `crm_account_assignment`

- `account`
- `rep`

#### `crm_rules`

- 필수 컬럼 없음
- 다만 검토용 컬럼으로 `rule_name`, `rule_value`를 본다

#### `sales`

- `account`
- `product`
- `amount`
- `period`

#### `target`

- `period`
- `target_value`

#### `prescription`

- `ship_date`
- `pharmacy`
- `product`
- `quantity`

---

## 02_prevalidation_rules

여기서 말하는 `검증`은 앞단 검증이다.  
즉 KPI 계산 전, 입력 파일이 다음 단계로 갈 수 있는 상태인지 점검하는 단계다.

### 1. 진행 가능 기준

아래 조건이면 진행 가능으로 본다.

- 실행모드에 필요한 파일이 존재함
- 필수 컬럼이 모두 있거나, 별칭 매핑으로 해석 가능함
- 기본 형식 보정 후 Adapter가 읽을 수 있는 구조로 정리 가능함
- 공통 분석 구간이 계산 가능하거나, 최소한 실행에 필요한 핵심 source는 연결 가능함

현재 intake 결과 상태는 보통 아래 중 하나다.

- `ready`
- `ready_with_fixes`
- `needs_review`
- `blocked`

운영 의미는 간단히 이렇게 본다.

- `ready`
  - 바로 다음 단계로 전달 가능
- `ready_with_fixes`
  - 자동 보정이 있었지만 전달 가능
- `needs_review`
  - 사람 확인이 필요해 보류
- `blocked`
  - 치명적 문제로 진행 불가

### 2. WARN로 보는 경우

아래는 `막을 정도는 아니지만 주의가 필요한 경우`다.

- 후보 컬럼은 찾아졌지만 100% 확신은 없는 경우
- 일부 source의 기간이 서로 다르지만 공통 분석 구간은 계산되는 경우
- 일부 값 누락이 있지만 핵심 처리에는 치명적이지 않은 경우
- 자동 수정 후 실행은 가능하지만 사람이 한 번 보는 게 좋은 경우

예:

- `sales`는 `2026-01 ~ 2026-06`
- `prescription`은 `2025-01 ~ 2025-12`

이 경우 바로 실패로 끝내지 않고,  
`공통 분석 구간 2026-01 ~ 2026-06 기준으로는 검증 가능`처럼 안내할 수 있다.

### 3. FAIL 또는 진행 불가로 보는 경우

아래는 보통 `blocked` 또는 실제 실행 불가에 해당한다.

- 필수 파일 자체가 없음
- 필수 컬럼을 해석할 수 없음
- 날짜/월/수치 형식이 너무 깨져 자동 보정이 불가능함
- staging을 만들 수 없을 정도로 데이터 구조가 맞지 않음

### 4. 자동 수정 가능한 항목

현재 intake가 자동 수정 대상으로 보는 대표 항목은 아래다.

- 컬럼명 공백/trim 정리
- 날짜 형식 흔들림 정리
- 월 형식 정리
  - 예: `2025-1`, `202501`, `2025/01` 등을 표준 월 토큰으로 맞춤
- 중복 행 제거
- 표준 컬럼명으로 1차 재정렬

즉 intake는 단순 검사기라기보다,  
`다음 단계가 읽을 수 있게 입구를 정리하는 엔진`에 가깝다.

### 5. 사람 확인이 필요한 항목

- 후보 컬럼은 있으나 의미가 애매한 매핑
- 기간 차이가 큰 source 조합
- source는 있으나 해석상 이상한 값 분포
- 자동 수정은 했지만 운영상 의미가 맞는지 확신하기 어려운 경우

이런 항목은 실행을 무조건 막기보다 `advisory`나 `needs_review`로 남길 수 있다.

### 6. 기간 차이 / 공통 분석 구간 판단

현재 intake는 source별 기간 범위를 계산한다.

그리고 아래를 함께 만든다.

- `analysis_basis_sources`
- `analysis_start_month`
- `analysis_end_month`
- `analysis_month_count`
- `analysis_summary_message`
- `proceed_confirmation_message`

운영 의미:

- source마다 기간이 다를 수 있다
- 그중 공통으로 겹치는 구간이 있으면 그 범위를 `공통 분석 구간`으로 본다
- 기간 차이가 있어도 공통 구간 기준으로는 진행 가능할 수 있다
- 차이가 크면 사용자에게 계속 진행 여부를 설명하고 확인받는다

---

## 03_normalization_schema

여기서 말하는 `정규화`는 raw를 모듈이 공통으로 이해할 수 있는 형태로 바꾸는 단계다.

### 1. 정규화 목적

- 회사마다 다른 컬럼명을 같은 의미로 묶기
- 날짜/월/수치 타입을 통일하기
- 이후 KPI 엔진과 모듈이 회사별 예외를 직접 처리하지 않게 만들기

### 2. 정규화 흐름

실제 흐름은 아래처럼 이해하면 된다.

- raw 저장
- intake가 파일 상태 점검/보정
- `_intake_staging`에 실행용 정리본 저장
- adapter가 회사별 raw를 표준 스키마로 변환
- 표준 결과 저장소 아래에 모듈별 표준 결과 저장

### 3. 컬럼명 매핑 규칙

컬럼명은 고정 원본 이름을 기대하지 않는다.  
대신 `별칭 묶음`으로 해석한다.

예:

- `activity_date`
  - `방문일`, `활동일`, `실행일`, `date`
- `period`
  - `yyyymm`, `매출월`, `목표월`, `기준년월`, `월`
- `product`
  - `product_id`, `product_name`, `품목명`, `제품명`, `brand`, `sku`

즉 `같은 뜻이면 다른 이름도 받아들인다`가 현재 원칙이다.

### 4. 타입 정리 규칙

- 날짜는 날짜 컬럼으로 정리
- 월은 `YYYYMM` 또는 동등한 표준 월 토큰으로 정리
- 금액/수량은 숫자형으로 정리
- 문자열은 앞뒤 공백 제거

### 5. 날짜 / 월 형식 통일 규칙

대표 원칙:

- 날짜는 실제 날짜형으로 읽을 수 있어야 한다
- 월은 비교 가능한 같은 포맷으로 맞춘다
- source별 종료월/시작월을 계산할 수 있어야 한다

### 6. 정규화 후 저장 구조

운영 기준 저장 구조는 아래다.

- 원본 raw
  - `data/company_source/{company_key}/`
- intake staging
  - `data/company_source/{company_key}/_intake_staging/`
- onboarding 참고 결과
  - `data/company_source/{company_key}/_onboarding/`
- adapter 표준 결과
  - `data/standardized/{company_key}/`
- validation 및 결과 자산
  - `data/validation/{company_key}/`

즉 정규화는 메모리 안에서만 끝나지 않고,  
다음 단계가 읽을 수 있는 파일 구조로 저장된다.

---

## 04_module_responsibility_and_io

이 섹션은 9개 모듈을 운영 로직 관점에서 설명한다.

### 1. `intake`

- 역할
  - 입력 파일을 처음 받아 상태를 점검하고, 자동 수정하고, 실행용 staging을 만드는 입구 레이어
- 이전 단계 입력
  - 업로드 파일 또는 `data/company_source/{company_key}/`의 raw 파일
- 핵심 처리
  - 필수 파일/컬럼 점검
  - 컬럼 의미 추정
  - 날짜/월/중복 보정
  - 기간 범위 계산
  - advisory / needs_review / blocked 판단
  - `_intake_staging` 저장
- 출력
  - intake 결과 요약
  - source별 package 결과
  - staging 파일
- 다음 단계 전달
  - Adapter가 읽을 수 있는 정리본

### 2. `kpi`

- 역할
  - 공식 KPI 계산의 단일 소스
- 이전 단계 입력
  - 각 모듈이 정규화한 표준 데이터
- 핵심 처리
  - CRM, Sandbox, Territory, Prescription KPI 계산
- 출력
  - KPI 계산 결과 구조체/요약
- 다음 단계 전달
  - 각 모듈의 result asset 조립 재료

### 3. `crm`

- 역할
  - 영업 활동 데이터를 행동 KPI 자산으로 바꾸는 출발 모듈
- 이전 단계 입력
  - CRM 표준 활동, 병원/담당자 기준, 회사 공통 기준
- 핵심 처리
  - 활동 표준화 결과 읽기
  - `modules/kpi/crm_engine.py` 호출
  - CRM result asset 조립
  - CRM builder payload 조립
- 출력
  - `crm_result_asset`
  - `crm_builder_payload`
- 다음 단계 전달
  - Validation Layer
  - Sandbox / Prescription / Builder

### 4. `sandbox`

- 역할
  - CRM, 실적, 목표, 필요 시 처방 자산을 결합해 통합 분석 자산을 만드는 모듈
- 이전 단계 입력
  - `crm_result_asset`
  - `sales`
  - `target`
  - 필요 시 `prescription_result_asset`
- 핵심 처리
  - 통합 분석용 기준 축 구성
  - Sandbox KPI 계산 또는 KPI 소비
  - 지점/담당자/품목 관점 분석 자산 조립
- 출력
  - `sandbox_result_asset`
  - Sandbox 보고서용 payload
- 다음 단계 전달
  - Validation Layer
  - Territory
  - RADAR
  - Builder

### 5. `territory`

- 역할
  - 활동과 공간/권역 정보를 결합해 권역 실행 자산을 만드는 모듈
- 이전 단계 입력
  - `sandbox_result_asset`
  - Territory 기준 정보
  - 표준 활동 파일
- 핵심 처리
  - Territory KPI 계산 또는 KPI 소비
  - 담당자/월 단위 지도 자산 조립
- 출력
  - `territory_result_asset`
  - `territory_builder_payload`
- 다음 단계 전달
  - Validation Layer
  - RADAR
  - Builder

### 6. `prescription`

- 역할
  - 처방/출고 흐름을 검증 자산으로 만드는 모듈
- 이전 단계 입력
  - 처방 raw의 표준화 결과
  - 필요 시 CRM 공통축
- 핵심 처리
  - 처방 흐름 정리
  - `modules/kpi/prescription_engine.py` 호출
  - result asset과 builder payload 조립
- 출력
  - `prescription_result_asset`
  - `prescription_builder_payload`
- 다음 단계 전달
  - Validation Layer
  - Sandbox 참고 입력
  - Builder

### 7. `validation`

- 역할
  - KPI 계산 이후 결과 품질을 보고 다음 단계로 넘길지 판단하는 운영 통제 레이어
- 이전 단계 입력
  - 각 모듈의 result asset
  - summary
  - mapping/quality 정보
- 핵심 처리
  - 품질 점검
  - 전달 가능 여부 판단
  - run 상태 기록
  - 단계별 PASS/WARN/FAIL/APPROVED 정리
- 출력
  - validation summary
  - reasoning note
  - 전달 승인 결과
- 다음 단계 전달
  - RADAR
  - Builder
  - run 저장

### 8. `radar`

- 역할
  - 검증 승인된 KPI/요약을 받아 신호 탐지와 우선순위 정리를 하는 Intelligence 모듈
- 이전 단계 입력
  - validation 승인 자산
  - KPI engine output
  - sandbox summary metrics
- 핵심 처리
  - signal detection
  - issue prioritization
  - decision option template 생성
- 출력
  - `radar_result_asset`
  - `radar_builder_payload`
- 다음 단계 전달
  - Builder
  - Agent 문맥

### 9. `builder`

- 역할
  - 승인된 payload를 읽어 HTML 결과물을 만드는 표현 레이어
- 이전 단계 입력
  - `builder_input_standard`
  - `builder_payload_standard`
  - 모듈별 builder payload
- 핵심 처리
  - 템플릿 선택
  - payload 주입
  - 필요 시 무거운 데이터를 asset 파일로 분리
  - HTML 및 실행 산출물 저장
- 출력
  - `*_preview.html`
  - `html_builder_result_asset`
  - report context / artifacts index
- 다음 단계 전달
  - 최종 사용자 화면
  - Agent run context

---

## 05_kpi_module_io

이 섹션은 KPI 계산 또는 KPI 결과 소비 관점에서 조금 더 자세히 적는다.

### 1. `kpi`

- 입력 데이터
  - 모듈별 표준 데이터
  - CRM 표준 활동
  - Sandbox 분석 기준 데이터
  - Territory 실행 기준 데이터
  - Prescription 흐름 데이터
- 계산하는 KPI
  - CRM KPI
  - Sandbox KPI
  - Territory KPI
  - Prescription KPI
- 출력 구조
  - 모듈별 KPI 집합
  - 월별/담당자별/요약 KPI 구조
- 다음 단계 result asset 형태
  - 직접 최종 파일을 만드는 모듈이라기보다, 각 모듈 result asset의 계산 재료를 공급한다

### 2. `crm`

- 입력 데이터
  - `crm_standard_activity`
  - 병원/담당자/조직 기준 데이터
- 계산하는 KPI 또는 소비 KPI
  - 직접 계산: CRM 11 KPI 계열
  - 예: `HIR`, `RTR`, `BCR`, `PHR`, `NAR`, `AHS`, `PV`, `FGR`, `PI`, `TRG`, `SWR`
- 출력 구조
  - 행동 프로파일
  - KPI 요약
  - 활동 문맥 요약
  - 매핑/품질 요약
  - `metric_version`
  - `unscored`
  - 신뢰도 분포
- 다음 단계 result asset 형태
  - `crm_result_asset.json`
  - CRM이 공식 출발 자산으로 다음 단계에 전달된다

### 3. `sandbox`

- 입력 데이터
  - `crm_result_asset`
  - `sales`
  - `target`
  - 필요 시 `prescription_result_asset`
- 계산하는 KPI 또는 소비 KPI
  - CRM KPI는 재계산하지 않고 소비
  - Sandbox KPI는 `modules/kpi/sandbox_engine.py` 기준으로 계산
- 출력 구조
  - dashboard payload
  - 지점/담당자/품목 분석 구조
  - 요약 지표 + block/template payload
- 다음 단계 result asset 형태
  - `sandbox_result_asset.json`
  - 다음 단계는 이 자산과 요약 payload를 소비한다

### 4. `territory`

- 입력 데이터
  - `sandbox_result_asset`
  - `ops_territory_activity.xlsx`
  - 권역/담당자 기준 정보
- 계산하는 KPI 또는 소비 KPI
  - Sandbox KPI 일부는 입력으로 소비
  - Territory KPI는 `modules/kpi/territory_engine.py` 기준으로 계산
- 출력 구조
  - 담당자별/월별 지도 자산
  - 커버리지/배치/권역 실행 관점 요약
- 다음 단계 result asset 형태
  - `territory_result_asset.json`

### 5. `prescription`

- 입력 데이터
  - prescription 표준 흐름 데이터
  - 필요 시 CRM 공통축
- 계산하는 KPI 또는 소비 KPI
  - Prescription KPI는 `modules/kpi/prescription_engine.py` 기준으로 계산
- 출력 구조
  - 처방 흐름 요약
  - 검증 결과
  - 월/분기 관점 보고용 데이터
- 다음 단계 result asset 형태
  - `prescription_result_asset.json`

### KPI 관련 강제 원칙

- KPI 계산 공식은 반드시 `modules/kpi/*`에만 둔다
- Builder는 KPI를 재계산하지 않는다
- Sandbox는 CRM KPI를 재계산하지 않는다
- Territory는 KPI를 재계산하지 않는다
- Prescription Builder는 KPI를 재계산하지 않는다
- RADAR는 KPI를 재계산하지 않는다

---

## 06_validation_rules

여기서 말하는 `validation`은 앞단 입력 검증이 아니라,  
KPI 계산 이후 단계에서 하는 `전달 판단`이다.

### 1. 무엇을 검증하는가

- result asset 구조가 다음 단계로 넘길 수 있는지
- 매핑 상태가 허용 범위인지
- 품질 점수/요약 상태가 기준 이상인지
- 운영 경고인지, 실제 차단 이슈인지

### 2. 다음 단계 전달 가능 기준

보통 아래처럼 이해하면 된다.

- `PASS`
  - 다음 단계로 전달 가능
- `WARN`
  - 전달은 가능하지만 운영 점검 필요
- `FAIL`
  - 기본적으로 전달 보류 또는 수정 필요
- `APPROVED`
  - 의사결정/인텔리전스 활용 단계까지 승인된 상태

### 3. WARN / FAIL reason 생성 방식

운영 구조상 각 단계 summary와 reasoning note를 기반으로 생성한다.

사용자에게는 단순 코드가 아니라 아래를 함께 보여준다.

- 원래 판정 메모
- 사람이 읽는 해석 문장
- 근거 수치

예:

- Territory는 실행 자체는 되었지만 `담당자 배치 불균형`이 감지되면 `WARN`
- 필수 입력 부족이나 구조 손상으로 다음 단계가 읽을 수 없으면 `FAIL`

### 4. step 상태 구분

현재 운영 화면과 run 저장에서는 보통 아래 상태를 쓴다.

- `PASS`
- `WARN`
- `FAIL`
- `APPROVED`
- `SKIP`

쉽게 말하면:

- `PASS`: 정상 통과
- `WARN`: 실행은 가능, 점검 필요
- `FAIL`: 차단
- `APPROVED`: 승인 완료
- `SKIP`: 이번 실행모드에서는 건너뜀

### 5. validation의 역할 경계

validation은 아래만 한다.

- 품질 검증
- 전달 판단
- 실행 순서 통제
- 상태 기록

validation이 하지 않는 일:

- KPI 공식 계산
- raw 직접 해석
- HTML 렌더링

---

## 07_result_asset_payload_spec

### 1. result asset의 의미

result asset은  
`모듈 계산 결과를 다음 단계에 안전하게 전달하는 표준 산출물`이다.

쉽게 말하면:

- KPI 계산 결과와 핵심 요약을 담은 `공식 전달 상자`

대표 예:

- `crm_result_asset.json`
- `prescription_result_asset.json`
- `sandbox_result_asset.json`
- `territory_result_asset.json`
- `radar_result_asset.json`

### 2. result asset 표준 구조 개념

모듈마다 상세 키는 다르지만 운영 관점 공통 구조는 대체로 아래처럼 보면 된다.

- asset 종류
- schema/version 정보
- 회사 기준 정보
- 기간 정보
- 핵심 요약
- KPI 또는 핵심 계산 결과
- 품질/매핑/문맥 요약
- 다음 단계가 읽을 수 있는 표준 payload 재료

### 3. builder에 넘기기 전 payload 구조

Builder 직전에는 보통 두 단계로 본다.

- `builder_input_standard`
  - 어떤 result asset을 어떤 템플릿으로 렌더할지 정리한 입력 규격
- `builder_payload_standard`
  - 템플릿이 바로 읽을 화면용 데이터 구조

모듈별로는 아래처럼 연결된다.

- CRM
  - `crm_result_asset.json -> crm_builder_payload.json -> crm_analysis_preview.html`
- Prescription
  - `prescription_result_asset.json -> prescription_builder_payload.json -> prescription_flow_preview.html`
- Territory
  - `territory_result_asset.json -> territory_builder_payload.json -> territory_map_preview.html`
- Sandbox
  - `sandbox_result_asset.json -> dashboard payload -> sandbox_report_preview.html`
- RADAR
  - `radar_result_asset.json -> radar_builder_payload.json -> radar_report_preview.html`

### 4. artifact와 payload의 차이

- `payload`
  - 화면을 그리기 위한 데이터 본문
- `artifact`
  - 실행 결과로 남는 파일 전체

즉:

- payload는 `내용`
- artifact는 `파일 단위 결과물`

artifact 예:

- JSON result asset
- payload JSON
- HTML
- JS asset
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

### 5. report별 payload 차이

있다.

- CRM
  - 활동/KPI/필터 중심 payload
- Sandbox
  - 요약 + 지점/담당자 block/asset 분리 payload
- Territory
  - 담당자/월 지도 자산 중심 payload
- Prescription
  - 월/분기 처방 흐름 중심 payload
- RADAR
  - signal / priority / decision option 중심 payload

즉 공통 뼈대는 있지만,  
보고서마다 필요한 데이터 모양은 다르다.

---

## 08_builder_template_mapping

중요:

- Builder는 계산하지 않는다
- Builder는 payload만 읽는다
- 계산은 반드시 앞단 모듈/KPI 엔진에서 끝나 있어야 한다

### 1. 공통 설명

Builder는 보통 아래를 받는다.

- 템플릿 키
- 렌더 모드
- output 이름
- report title
- payload 본문

그리고 템플릿에 맞는 방식으로 주입한다.

### 2. 공통 payload와 템플릿 전용 payload

#### 공통 payload

- 회사 정보
- 기간 정보
- 보고서 제목
- 버전 정보
- 요약 메타 정보

#### 템플릿 전용 payload

- CRM 전용 KPI/행동 구조
- Sandbox 전용 block/branch asset 구조
- Territory 전용 map/catalog/route 구조
- Prescription 전용 claims/detail 구조
- RADAR 전용 signal/priority/decision option 구조

### 3. 템플릿별 주입 개념

#### CRM 보고서

- 템플릿
  - `templates/crm_analysis_template.html`
- 들어가는 값
  - CRM KPI 요약
  - 행동 프로파일
  - 필터/기간 정보
  - 보조 JS asset manifest

#### Sandbox 보고서

- 템플릿
  - `templates/report_template.html`
- 들어가는 값
  - dashboard summary
  - block payload
  - branch index
  - 선택 지점 상세 asset 위치

#### Territory 보고서

- 템플릿
  - `templates/territory_optimizer_template.html`
- 들어가는 값
  - 담당자 catalog
  - 월별 route/map asset
  - 기본 선택 상태
  - 로컬 Leaflet asset 경로

#### Prescription 보고서

- 템플릿
  - `templates/prescription_flow_template.html`
- 들어가는 값
  - 월/분기 필터 정보
  - claims/detail asset
  - 흐름 요약 데이터

#### RADAR 보고서

- 템플릿
  - `templates/radar_report_template.html`
- 들어가는 값
  - signal list
  - priority summary
  - decision option text

#### 통합 보고서

- 템플릿
  - `templates/total_valid_templates.html`
- 들어가는 값
  - 개별 보고서 HTML 경로 또는 연결 정보

중요:

- 통합 보고서는 새 계산 엔진이 아니다
- 이미 생성된 개별 결과를 묶어 보여주는 허브다

### 4. Builder 주입 기준 한 줄 정리

Builder는  
`이미 계산되고 validation을 통과한 result asset/payload를 템플릿에 주입해 HTML로 바꾸는 마지막 표현 단계`다.

---

## 최종 정리

이 프로젝트의 핵심은 화면이 아니라 운영 흐름이다.

한 줄로 요약하면 아래다.

`입력 파일을 intake가 정리하고 -> adapter가 표준화하고 -> kpi/module이 계산하고 -> validation이 전달 가능 여부를 판단하고 -> builder가 계산 없이 payload만 읽어 최종 결과를 만든다`

즉 `Sales Data OS Web`의 다음 우선순위는 화면 추가보다,  
이 운영 흐름이 문서와 구현에서 흔들리지 않게 `백엔드 로직 명세를 먼저 고정하는 것`이다.
