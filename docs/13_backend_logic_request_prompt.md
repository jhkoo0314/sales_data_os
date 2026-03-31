# Sales Data OS 백엔드 로직 명세 요청서

작성일: 2026-03-31  
용도: `Codex CLI` 또는 다른 설계 정리 세션에 그대로 전달하는 요청 문서

## 목적

현재 `Sales Data OS Web`은
기본 화면 뼈대는 먼저 마련된 상태다.

이제부터 우선해야 하는 것은
화면 추가가 아니라
`백엔드 로직 설계`
다.

특히 이 프로젝트는 단순 웹앱이 아니라
`Sales Data OS 운영 체계`
이므로,
아래 백엔드 공식 흐름 기준으로 문서를 받아와야 한다.

현재 기준 모듈 구조는 총 9개다.

- `crm`
- `sandbox`
- `territory`
- `prescription`
- `radar`
- `kpi`
- `intake`
- `builder`
- `validation`

## 백엔드 공식 흐름

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

주의:

- 앞단 `검증`은 입력 파일/컬럼/기간/필수값 점검이다
- 뒤단 `validation`은 KPI 계산 이후 전달 가능 여부 판단이다
- `Builder`는 계산 금지, payload 소비 전용이다

## 설계 진행 Phase

이 문서는 프론트 연결 문서가 아니라,
`백엔드 운영 로직 설계 문서`
를 순서대로 만들기 위한 기준이다.

각 Phase를 시작하기 전에,
아래 참고 문서를 먼저 읽고 현재 맥락을 다시 맞춘다.

### Phase 시작 전 공통 선행 읽기

- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - 전체 운영 로직과 모듈 경계를 다시 확인하는 기준 문서
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - 화면 기준 호출 흐름과 API 연결 지점을 빠르게 확인하는 참고 표
- `docs/backend_architecture/SALES_DATA_OS_PLANNER_SUMMARY.md`
  - 비개발자도 이해할 수 있는 짧은 전체 요약 문서
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - 웹 뒤에서 어떤 API 묶음이 필요한지 보는 운영 기준 문서

중요:

- 위 문서들은 `Phase 구현 시 맥락 유지용 참고 문서`다
- 최종 설계 순서와 체크 기준은 이 `13번 문서`를 따른다
- 즉 `어떻게 설계해야 하는지`는 참고 문서에서 보고,
  `무엇부터 확정할지`는 이 문서 순서대로 진행한다

따라서 아래 순서대로 작성한다.

### [x] Phase 1. 입력 단계 명세

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `01_input_spec`
- `SALES_DATA_OS_PLANNER_SUMMARY.md`의 전체 흐름 요약
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 intake 전 단계 API 원칙

먼저 어떤 파일을 받고,
각 파일이 왜 필요한지부터 고정한다.

이 단계에서 정할 것:

- 입력 파일 종류
- 파일별 역할
- 필수/선택 구분
- 회사별 형식 차이
- 필수 컬럼 기준

#### Phase 1 설계 결과

##### 1. 입력으로 받는 주요 파일

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

추가 기준:

- 입력 저장 기준은 항상 `company_key`다
- 일반 업로드와 월별 업로드를 모두 받는다
- 월별 업로드 대상 source는 아래를 기준으로 본다
  - `crm_activity`
  - `sales`
  - `target`
  - `prescription`

##### 2. 파일별 역할

- `crm_activity`
  - 누가, 언제, 어떤 병원에서, 어떤 활동을 했는지 보여주는 출발 데이터
- `crm_rep_master`
  - 담당자와 조직 구조를 고정하는 기준표
- `crm_account_assignment`
  - 어떤 병원이 누구 담당인지 연결하는 기준표
- `crm_rules`
  - CRM KPI 해석 품질을 높이는 설정성 데이터
- `sales`
  - 실적 결과 데이터
- `target`
  - 목표 기준 데이터
- `prescription`
  - 도매-약국-병원 흐름 또는 출고 흐름 검증에 쓰는 데이터

##### 3. 필수 파일 / 선택 파일 구분

실행 모드에 따라 필요한 입력이 달라진다.

- 기본 CRM 실행 필수
  - `crm_activity`
  - `crm_rep_master`
  - `crm_account_assignment`
- CRM 보조 입력
  - `crm_rules`
  - 없어도 실행은 가능할 수 있지만 규칙 해석 품질은 낮아질 수 있다
- Sandbox/통합 실행 필수
  - `sales`
  - `target`
- Prescription 결과 생성 필수
  - `prescription`

쉽게 말하면:

- `CRM만 보는 실행`은 CRM 입력 세트가 핵심이다
- `Sandbox`나 통합 실행은 `sales`, `target`이 사실상 필요하다
- `Prescription 보고서`를 만들려면 `prescription`이 필요하다

추가 해석:

- 입력 단계는 `어떤 파일이 저장됐는지`와 `어떤 실행 모드에 필요한지`를 함께 봐야 한다
- 즉 파일 존재 여부는 단순 업로드 성공이 아니라 이후 실행 가능성과 연결된다

##### 4. 회사별 파일 형식 차이

이 프로젝트는 회사별 차이를 전제로 설계한다.

대표 차이:

- 파일명 차이
- 컬럼명 차이
- 병원/담당자/제품 식별 방식 차이
- 날짜/월 표기 차이

중요한 원칙:

- 이 차이를 validation 레이어가 직접 해결하지 않는다
- 먼저 `company_key + intake + adapter`가 차이를 흡수한다
- 즉 입력 단계는 회사별 원본 차이를 인정한 상태에서 받되, 다음 단계로 넘길 기준만 정한다

##### 5. 파일별 필수 컬럼 기준

아래는 현재 설계 기준 핵심 필수 컬럼이다.

###### `crm_activity`

- `activity_date`
- `rep`
- `account`
- `activity_type`

대표 별칭 예:

- `activity_date`: `방문일`, `활동일`, `실행일`
- `rep`: `담당자명`, `사원명`, `영업사원명`
- `account`: `병원코드`, `병원명`, `거래처명`
- `activity_type`: `활동유형`, `액션유형`, `call_type`

###### `crm_rep_master`

- `rep`
- `organization`

###### `crm_account_assignment`

- `account`
- `rep`

###### `crm_rules`

- 필수 컬럼 없음
- 다만 검토용 컬럼으로 `rule_name`, `rule_value`를 본다

###### `sales`

- `account`
- `product`
- `amount`
- `period`

###### `target`

- `period`
- `target_value`

###### `prescription`

- `ship_date`
- `pharmacy`
- `product`
- `quantity`

##### 6. Phase 1 결론

- 입력 단계는 `어떤 원본이 들어오는지`와 `각 원본이 왜 필요한지`를 고정하는 단계다
- 이 단계에서는 아직 계산하지 않는다
- 회사별 차이는 허용하되, 다음 단계에서 해석 가능한 기준 파일 세트와 핵심 컬럼만 먼저 잠근다
- 입력 저장 단위는 `company_key` 기준으로 고정하고, 일반 업로드와 월별 업로드 흐름을 함께 전제로 본다
- 이후 `Phase 2`에서 이 입력이 실제로 진행 가능한지 `READY / WARN / FAIL` 기준으로 판정한다

### [x] Phase 2. 입력 검증 규칙

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `02_prevalidation_rules`
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 intake/onboarding API 묶음
- `SALES_DATA_OS_FRONTEND_API_TABLE.md`의 intake analyze/result/confirm 흐름

그 다음 입력이 실제로 실행 가능한 상태인지 판단하는 규칙을 정한다.

이 단계에서 정할 것:

- `READY / WARN / FAIL` 기준
- 자동 수정 가능한 항목
- 사람 확인이 필요한 항목
- 기간 차이 감지 방식
- 공통 분석 구간 판단 방식

#### Phase 2 설계 결과

##### 1. 이 단계의 뜻

여기서 말하는 `검증`은 앞단 검증이다.

즉:

- 아직 KPI 계산 전이다
- 입력 파일이 다음 단계로 갈 수 있는 상태인지 먼저 확인하는 단계다
- 뒤쪽 `validation`과는 다른 단계다

##### 2. 진행 가능 기준

아래 조건이면 진행 가능으로 본다.

- 실행 모드에 필요한 파일이 존재한다
- 필수 컬럼이 모두 있거나 별칭 매핑으로 해석 가능하다
- 기본 형식 보정 후 Adapter가 읽을 수 있는 구조로 정리 가능하다
- 공통 분석 구간이 계산 가능하거나, 최소한 실행에 필요한 핵심 source는 연결 가능하다

현재 intake 결과 상태는 아래 4가지로 고정한다.

- `ready`
  - 바로 다음 단계로 전달 가능
- `ready_with_fixes`
  - 자동 보정이 있었지만 전달 가능
- `needs_review`
  - 사람 확인이 필요해 보류
- `blocked`
  - 치명적 문제로 진행 불가

##### 3. WARN로 보는 경우

아래는 막을 정도는 아니지만 주의가 필요한 경우다.

- 후보 컬럼은 찾아졌지만 100% 확신은 없는 경우
- 일부 source의 기간이 서로 다르지만 공통 분석 구간은 계산되는 경우
- 일부 값 누락이 있지만 핵심 처리에는 치명적이지 않은 경우
- 자동 수정 후 실행은 가능하지만 사람이 한 번 보는 게 좋은 경우

대표 예:

- `sales`는 `2026-01 ~ 2026-06`
- `prescription`은 `2025-01 ~ 2025-12`

이 경우 바로 실패로 끝내지 않는다.
대신 아래처럼 설명하는 것이 원칙이다.

- `일부 입력 데이터의 기간이 서로 다르지만, 공통 분석 구간 기준으로 진행 가능합니다.`

즉 기간 차이는 숨기지 않지만,
공통 구간 기준으로 어디까지 진행 가능한지는 함께 알려줘야 한다.

##### 4. FAIL 또는 진행 불가 기준

아래는 보통 `blocked` 또는 실제 실행 불가로 본다.

- 필수 파일 자체가 없음
- 필수 컬럼을 해석할 수 없음
- 날짜/월/수치 형식이 너무 깨져 자동 보정이 불가능함
- staging을 만들 수 없을 정도로 데이터 구조가 맞지 않음

쉽게 말하면:

- `다음 단계가 읽을 수 없는 상태`면 막아야 한다

##### 5. 자동 수정 가능한 항목

현재 intake가 자동 수정 대상으로 보는 대표 항목은 아래다.

- 컬럼명 공백 정리
- 문자열 앞뒤 공백 정리
- 날짜 형식 흔들림 정리
- 월 형식 정리
  - 예: `2025-1`, `202501`, `2025/01` 등을 표준 월 토큰으로 맞춤
- 중복 행 제거
- 표준 컬럼명 기준 1차 재정렬

중요한 해석:

- intake는 단순 검사기가 아니다
- 다음 단계가 읽을 수 있게 입구를 정리하는 엔진이다

##### 6. 사람 확인이 필요한 항목

아래는 자동으로 확정하지 말고 `needs_review` 또는 advisory로 남길 수 있다.

- 후보 컬럼은 있으나 의미가 애매한 매핑
- 기간 차이가 큰 source 조합
- source는 있으나 값 분포가 상식적으로 이상한 경우
- 자동 수정은 했지만 운영상 의미가 맞는지 확신하기 어려운 경우

원칙:

- 애매한 경우를 무조건 막는 것이 아니라
- 왜 확인이 필요한지 설명하고 사용자 확인 흐름으로 넘긴다

##### 7. 기간 차이 / 공통 분석 구간 판단

입력 검증 단계에서는 source별 기간 범위를 먼저 계산한다.

그리고 아래 항목을 함께 만든다.

- `analysis_basis_sources`
- `analysis_start_month`
- `analysis_end_month`
- `analysis_month_count`
- `analysis_summary_message`
- `proceed_confirmation_message`

운영 의미는 아래와 같다.

- source마다 기간이 다를 수 있다
- 공통으로 겹치는 구간이 있으면 그 범위를 `공통 분석 구간`으로 본다
- 기간 차이가 있어도 공통 구간 기준으로는 진행 가능할 수 있다
- 차이가 크면 사용자에게 설명하고 진행 여부를 확인받는다

##### 8. 이 단계에서 남겨야 하는 결과

입력 검증이 끝나면 최소한 아래 정보가 남아야 한다.

- 현재 상태: `ready / ready_with_fixes / needs_review / blocked`
- `ready_for_adapter` 여부
- 발견된 문제 목록 `findings`
- 자동 수정 내역 `fixes`
- 사용자 확인 필요 사항 `suggestions` 또는 advisory
- 시점 관련 주의 정보 `timing_alerts`
- source별 기간 정보 `period_coverages`
- 공통 분석 구간 요약 메시지
- source별 package 결과 `packages`

즉 `업로드가 됐다`가 아니라,
`왜 지금 실행 가능하거나 불가능한지` 설명 가능한 상태가 돼야 한다.

##### 9. Phase 2 결론

- 입력 검증 단계는 단순 오류 찾기가 아니라 `다음 단계로 넘길 수 있는지 판단하는 입구 판정 단계`다
- `WARN`은 막지 않고 설명과 확인 흐름으로 처리한다
- `FAIL`은 다음 단계가 읽을 수 없는 경우로 제한한다
- 이 단계가 끝나면 Upload와 Pipeline이 같은 기준으로 준비 상태를 설명할 수 있어야 한다

### [x] Phase 3. 정규화 규칙

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 normalization 관련 구간
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 pipeline 실행 전 데이터 기준
- `SALES_DATA_OS_PLANNER_SUMMARY.md`의 공식 흐름 설명

입력 검증이 끝난 뒤,
raw 데이터를 실행 가능한 공통 구조로 어떻게 바꿀지 정한다.

이 단계에서 정할 것:

- 공통 스키마
- 컬럼 매핑 규칙
- 타입 정리 규칙
- 날짜/월 형식 통일 규칙
- `_intake_staging` 저장 기준

#### Phase 3 설계 결과

##### 1. 이 단계의 뜻

여기서 말하는 `정규화`는
raw 데이터를 모듈이 공통으로 이해할 수 있는 형태로 바꾸는 단계다.

쉽게 말하면:

- 회사마다 제각각인 원본 형식을
- 뒤쪽 엔진이 같은 방식으로 읽을 수 있게 맞추는 단계다

##### 2. 정규화 목적

정규화 단계의 목적은 아래 3가지로 고정한다.

- 회사마다 다른 컬럼명을 같은 의미로 묶는다
- 날짜, 월, 수치 타입을 통일한다
- 이후 KPI 엔진과 모듈이 회사별 예외를 직접 처리하지 않게 만든다

즉 정규화가 끝난 뒤에는
뒤 단계가 `회사마다 다른 원본 습관`을 알 필요가 없어야 한다.

##### 3. 정규화 흐름

정규화 흐름은 아래 순서로 본다.

1. raw 저장
2. intake가 파일 상태 점검과 기본 보정 수행
3. `_intake_staging`에 실행용 정리본 저장
4. adapter가 회사별 raw를 표준 스키마로 변환
5. 표준 결과 저장소 아래에 모듈별 표준 결과 저장

중요한 원칙:

- raw를 바로 KPI 엔진으로 보내지 않는다
- intake와 staging을 거친 뒤 정규화한다
- 정규화 결과는 다음 단계가 바로 읽을 수 있는 구조여야 한다

##### 4. 컬럼명 매핑 규칙

정규화 단계는 고정 원본 컬럼명만 기대하지 않는다.
대신 `같은 뜻의 다른 이름`을 하나의 기준 컬럼으로 묶는다.

예:

- `activity_date`
  - `방문일`, `활동일`, `실행일`, `date`
- `period`
  - `yyyymm`, `매출월`, `목표월`, `기준년월`, `월`
- `product`
  - `product_id`, `product_name`, `품목명`, `제품명`, `brand`, `sku`

원칙:

- 같은 뜻이면 다른 이름도 받아들인다
- 의미가 확실하지 않은 매핑은 정규화에서 억지 확정하지 않고 앞 단계 advisory로 다룬다

##### 5. 타입 정리 규칙

정규화 단계에서 최소한 아래 타입 기준을 맞춘다.

- 날짜는 실제 날짜 컬럼으로 읽을 수 있게 정리한다
- 월은 `YYYYMM` 또는 동등한 표준 월 토큰으로 정리한다
- 금액, 수량, 목표값은 숫자형으로 정리한다
- 문자열은 앞뒤 공백을 제거한다

즉 이 단계의 목적은
`보이는 이름만 바꾸는 것`이 아니라
`실제 계산 가능한 타입으로 맞추는 것`이다.

##### 6. 날짜 / 월 형식 통일 규칙

대표 원칙은 아래와 같다.

- 날짜는 실제 날짜형으로 읽을 수 있어야 한다
- 월은 비교 가능한 같은 포맷으로 맞춰야 한다
- source별 시작월과 종료월을 계산할 수 있어야 한다

예를 들어 아래처럼 흔들리는 값은 같은 기준으로 맞춘다.

- `2025-1`
- `202501`
- `2025/01`

정규화 후에는 같은 월로 비교 가능해야 한다.

##### 7. `_intake_staging`의 의미

`_intake_staging`은 단순 임시 폴더가 아니다.

의미는 아래와 같다.

- intake가 기본 보정과 해석을 끝낸 실행용 정리본
- Adapter가 실제 입력으로 읽는 기준 데이터
- raw 원본과 최종 표준 결과 사이의 중간 기준점

즉:

- raw는 원본 보관
- `_intake_staging`은 실행 준비본
- 표준 결과 저장소는 정규화 완료본

##### 8. 정규화 후 저장 구조

운영 기준 저장 구조는 아래로 고정한다.

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

원칙:

- 정규화는 메모리 안에서만 끝나지 않는다
- 다음 단계가 다시 읽을 수 있는 파일 구조로 남아야 한다

##### 9. 이 단계가 끝났을 때 기대 상태

정규화가 끝나면 아래 상태여야 한다.

- 회사별 차이가 표준 컬럼과 표준 타입으로 흡수되어 있다
- KPI 엔진이 회사별 예외 없이 같은 입력 구조를 읽을 수 있다
- source별 기간 계산과 비교가 가능한 형태가 유지된다
- 다음 단계가 raw 원본이 아니라 정리된 표준 입력을 읽는다

##### 10. Phase 3 결론

- 정규화 단계는 `회사용 원본 차이를 뒤 단계에서 처리하지 않도록 막는 단계`다
- `_intake_staging`은 실행 준비본이고, 표준 결과 저장소는 정규화 완료본이다
- 이 단계가 끝나야 KPI 계산을 회사별 예외 없이 공통 규칙으로 연결할 수 있다

### [x] Phase 4. 모듈 역할과 입출력

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `04_module_responsibility_and_io`
- `SALES_DATA_OS_PLANNER_SUMMARY.md`의 모듈 역할 요약
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 모듈 결과 조회 API 구간

그 다음 9개 모듈이
무엇을 받고 무엇을 넘기는지 고정한다.

대상 모듈:

- `intake`
- `kpi`
- `crm`
- `sandbox`
- `territory`
- `prescription`
- `validation`
- `radar`
- `builder`

이 단계에서 정할 것:

- 모듈 역할
- 입력값
- 핵심 처리
- 출력값
- 다음 단계 전달물

#### Phase 4 설계 결과

##### 1. 이 단계의 뜻

이 단계는 9개 모듈이
`무엇을 받고, 무엇을 처리하고, 무엇을 다음 단계로 넘기는지`
를 고정하는 단계다.

중요한 목적:

- 모듈 책임이 섞이지 않게 한다
- 같은 계산이나 판단을 여러 군데서 다시 하지 않게 한다
- 다음 단계가 무엇을 받아야 하는지 명확하게 만든다

##### 2. `intake`

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

##### 3. `kpi`

- 역할
  - 공식 KPI 계산의 단일 소스
- 이전 단계 입력
  - 각 모듈이 정규화한 표준 데이터
- 핵심 처리
  - CRM, Sandbox, Territory, Prescription KPI 계산
- 출력
  - KPI 계산 결과 구조체와 요약
- 다음 단계 전달
  - 각 모듈의 result asset 조립 재료

##### 4. `crm`

- 역할
  - 영업 활동 데이터를 행동 KPI 자산으로 바꾸는 출발 모듈
- 이전 단계 입력
  - CRM 표준 활동 데이터
  - 병원/담당자/조직 기준 데이터
  - 회사 공통 기준 정보
- 핵심 처리
  - 활동 표준화 결과 읽기
  - `modules/kpi/crm_engine.py` 호출
  - CRM result asset 조립
  - CRM builder payload 조립
- 출력
  - `crm_result_asset`
  - `crm_builder_payload`
- 다음 단계 전달
  - `validation`
  - `sandbox`
  - `prescription`
  - `builder`

##### 5. `sandbox`

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
  - `validation`
  - `territory`
  - `radar`
  - `builder`

##### 6. `territory`

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
  - `validation`
  - `radar`
  - `builder`

##### 7. `prescription`

- 역할
  - 처방/출고 흐름을 검증 자산으로 만드는 모듈
- 이전 단계 입력
  - 처방 표준화 결과
  - 필요 시 CRM 공통축
- 핵심 처리
  - 처방 흐름 정리
  - `modules/kpi/prescription_engine.py` 호출
  - result asset과 builder payload 조립
- 출력
  - `prescription_result_asset`
  - `prescription_builder_payload`
- 다음 단계 전달
  - `validation`
  - `sandbox` 참고 입력
  - `builder`

##### 8. `validation`

- 역할
  - KPI 계산 이후 결과 품질을 보고 다음 단계로 넘길지 판단하는 운영 통제 레이어
- 이전 단계 입력
  - 각 모듈의 result asset
  - 요약 정보
  - mapping 및 quality 정보
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
  - `radar`
  - `builder`
  - run 저장

##### 9. `radar`

- 역할
  - 검증 승인된 KPI와 요약을 받아 신호 탐지와 우선순위 정리를 하는 intelligence 모듈
- 이전 단계 입력
  - validation 승인 자산
  - KPI output
  - sandbox summary metrics
- 핵심 처리
  - signal detection
  - issue prioritization
  - decision option template 생성
- 출력
  - `radar_result_asset`
  - `radar_builder_payload`
- 다음 단계 전달
  - `builder`
  - Agent 문맥

##### 10. `builder`

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
  - report context
  - artifacts index
- 다음 단계 전달
  - 최종 사용자 화면
  - Agent run context

##### 11. 모듈 경계 요약

아주 쉽게 정리하면:

- `intake`
  - 입력을 읽고 정리하는 입구
- `kpi`
  - 공식 숫자를 계산하는 단일 계산기
- `crm`
  - 행동 KPI 출발점
- `sandbox`
  - 통합 분석 자산 생성
- `territory`
  - 권역 실행 자산 생성
- `prescription`
  - 처방 흐름 자산 생성
- `validation`
  - 전달 가능 여부 판단
- `radar`
  - 신호와 우선순위 정리
- `builder`
  - 최종 표현과 결과물 생성

##### 12. Phase 4 결론

- 각 모듈은 `이전 단계 결과를 받아 자신의 산출물을 만들고 다음 단계로 넘기는 구조`로 고정한다
- `validation`은 계산기가 아니라 전달 판단 레이어다
- `builder`는 계산하지 않고 승인된 payload만 읽는다
- 이 단계가 끝나면 어느 모듈이 어느 책임을 가지는지 문서 기준이 명확해진다

### [x] Phase 5. KPI 계산 상세

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `05_kpi_module_io`
- `SALES_DATA_OS_PLANNER_SUMMARY.md`의 KPI 단일 소스 설명
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 pipeline/모듈 결과 API 원칙
- `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`
  - CRM 11개 지표의 뜻, 계산식, 해석, 구현 반영 원칙 참고

이 단계에서는
어디서만 계산하고 어디서는 계산하면 안 되는지
더 분명하게 고정한다.

이 단계에서 정할 것:

- KPI 단일 소스 위치
- 계산 모듈과 소비 모듈 구분
- 모듈별 KPI 입출력
- result asset으로 넘기는 기준

#### Phase 5 설계 결과

##### 1. 이 단계의 뜻

이 단계는
`어디서만 계산하고, 어디서는 계산하면 안 되는지`
를 문서로 고정하는 단계다.

가장 중요한 원칙은 단순하다.

- KPI 계산 공식은 `modules/kpi/*`만 담당한다

즉:

- 숫자의 출처는 한 곳이다
- 다른 모듈은 필요하면 그 계산 결과를 소비한다
- Builder나 후속 모듈이 숫자를 다시 만들면 안 된다

##### 2. KPI 단일 소스 원칙

KPI를 여러 군데서 다시 계산하면 안 되는 이유는 아래와 같다.

- 같은 숫자가 화면마다 다르게 나올 수 있다
- 나중에 기준이 바뀌면 여러 군데를 동시에 고쳐야 한다
- 어떤 숫자가 공식값인지 흔들리게 된다

따라서 공식 KPI 계산은 아래 위치로 고정한다.

- `modules/kpi/crm_engine.py`
- `modules/kpi/sandbox_engine.py`
- `modules/kpi/territory_engine.py`
- `modules/kpi/prescription_engine.py`

##### 3. `kpi` 모듈 관점

- 입력 데이터
  - 모듈별 표준 데이터
  - CRM 표준 활동 데이터
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
  - 월별 KPI 구조
  - 담당자별 KPI 구조
  - 요약 KPI 구조
- 다음 단계 전달 방식
  - 직접 최종 파일을 만드는 것이 아니라
  - 각 모듈이 result asset을 만들 때 쓰는 공식 계산 재료를 공급한다

##### 4. `crm` 모듈 KPI 관점

- 입력 데이터
  - `crm_standard_activity`
  - 병원/담당자/조직 기준 데이터
- 계산 또는 소비
  - CRM KPI를 직접 계산한다
- 대표 KPI 예시
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

##### 5. `sandbox` 모듈 KPI 관점

- 입력 데이터
  - `crm_result_asset`
  - `sales`
  - `target`
  - 필요 시 `prescription_result_asset`
- 계산 또는 소비
  - CRM KPI는 재계산하지 않고 소비한다
  - Sandbox KPI는 `modules/kpi/sandbox_engine.py` 기준으로 계산한다
- 출력 구조
  - dashboard payload
  - 지점/담당자/품목 분석 구조
  - 요약 지표
  - block/template payload
- 다음 단계 result asset 형태
  - `sandbox_result_asset.json`

##### 6. `territory` 모듈 KPI 관점

- 입력 데이터
  - `sandbox_result_asset`
  - 표준 활동 데이터
  - 권역/담당자 기준 정보
- 계산 또는 소비
  - Sandbox KPI 일부는 입력으로 소비한다
  - Territory KPI는 `modules/kpi/territory_engine.py` 기준으로 계산한다
- 출력 구조
  - 담당자별/월별 지도 자산
  - 커버리지 요약
  - 배치/권역 실행 관점 요약
- 다음 단계 result asset 형태
  - `territory_result_asset.json`

##### 7. `prescription` 모듈 KPI 관점

- 입력 데이터
  - prescription 표준 흐름 데이터
  - 필요 시 CRM 공통축
- 계산 또는 소비
  - Prescription KPI는 `modules/kpi/prescription_engine.py` 기준으로 계산한다
- 출력 구조
  - 처방 흐름 요약
  - 검증 결과
  - 월/분기 관점 보고용 데이터
- 다음 단계 result asset 형태
  - `prescription_result_asset.json`

##### 8. KPI 계산을 하지 않는 모듈

아래는 KPI를 새로 계산하지 않고,
이미 계산된 결과를 소비하거나 판단만 하는 모듈이다.

- `validation`
  - 결과 품질과 전달 여부를 판단
- `radar`
  - 이미 계산된 KPI와 요약을 바탕으로 신호를 정리
- `builder`
  - payload를 읽어 결과물을 표현

쉽게 말하면:

- `validation`은 판정자
- `radar`는 해석자
- `builder`는 표현자

이 셋은 계산기가 아니다.

##### 9. KPI 관련 강제 원칙

문서 기준으로 아래 원칙을 강제한다.

- KPI 계산 공식은 반드시 `modules/kpi/*`에만 둔다
- `builder`는 KPI를 재계산하지 않는다
- `sandbox`는 CRM KPI를 재계산하지 않는다
- `territory`는 앞단 KPI를 다시 계산하지 않는다
- `prescription`의 builder payload 조립 단계는 KPI를 재계산하지 않는다
- `radar`는 KPI를 재계산하지 않는다

##### 10. result asset으로 넘기는 기준

KPI 계산이 끝난 뒤에는
다음 단계가 숫자를 다시 계산하지 않도록
계산 결과를 result asset 안에 담아 넘겨야 한다.

대표 예:

- `crm_result_asset`
- `sandbox_result_asset`
- `territory_result_asset`
- `prescription_result_asset`

원칙:

- 다음 단계는 result asset을 소비한다
- 같은 KPI를 다시 raw에서 만들지 않는다
- Builder는 result asset과 payload를 읽기만 한다

##### 10-1. CRM 11개 지표 명세

CRM KPI는 선행행동, 운영관리, 결과검증 3계층으로 본다.

###### 선행행동 계층

- `HIR`
  - High-Impact Rate
  - 성과기여 가능성이 높은 행동의 실행 품질 지수
- `RTR`
  - Relationship Temperature Rate
  - 계정 관계의 현재 온도를 보여주는 지표
- `BCR`
  - Behavior Consistency Rate
  - 실행의 규칙성과 루틴 품질을 보는 지표
- `PHR`
  - Proactive Health Rate
  - 활동이 구체적 Next Action으로 연결되는 비율

###### 운영관리 계층

- `NAR`
  - Next Action Reliability
  - 계획된 Next Action이 기한 내 실제 이행되는 신뢰도
- `AHS`
  - Account Health Score
  - 계정의 접점, 관계, 경쟁 리스크를 통합한 건강도
- `PV`
  - Pipeline Velocity
  - 파이프라인 전진 가치의 시간 대비 이동 속도

###### 결과검증 계층

- `FGR`
  - Field Growth Rate
  - 담당 영역의 성장률
- `PI`
  - Prescription Index
  - 계정 난이도와 처방 성과를 보정한 종합 성과지수
- `TRG`
  - Target Revenue Growth
  - 기준 대비 매출 성장률
- `SWR`
  - Share Win Rate
  - 목표 계정 중 기준 점유 달성 비율

##### 10-2. CRM 지표 계산 원칙

- CRM 11개 지표의 공식 계산 위치는 `modules/kpi/crm_engine.py`다
- 선행행동 지표는 코칭 중심 지표로 우선 본다
- 운영관리 지표는 실행 품질과 관리 안정성을 본다
- 결과검증 지표는 성과 확인과 전략 보정 관점으로 본다
- `TRG`, `SWR`는 개인 코칭 1차 지표가 아니라 경영 리포팅 보조 지표로 본다
- 결측값은 `0`이 아니라 `unscored`로 처리한다
- `self_only` 데이터는 신뢰도 상한을 적용한다

##### 10-3. CRM 지표 상세 계산 규칙 참조

아래 문서를 CRM KPI 상세 계산 명세 기준으로 고정한다.

- `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`

이 문서에서 확인할 수 있는 항목:

- 11개 지표별 계산식
- 보조 규칙
- 예외 처리
- 해석 문장
- 운영 종합 스코어 기준

##### 10-4. Sandbox KPI 명세

Sandbox는 `crm_result_asset`, `sales`, `target`, 필요 시 `prescription_result_asset`를 받아
통합 분석 자산을 만드는 모듈이다.

핵심 원칙:

- CRM KPI는 Sandbox에서 다시 계산하지 않는다
- CRM KPI는 공식 출발 자산으로 받아 소비한다
- Sandbox 자체 분석 지표는 `modules/kpi/sandbox_engine.py` 기준으로 계산한다

Sandbox KPI가 다루는 관점:

- 지점 관점 요약
- 담당자 관점 비교
- 품목 관점 성과
- 목표 대비 실적
- 통합 dashboard summary

Sandbox 출력 구조:

- `sandbox_result_asset.json`
- dashboard payload
- 지점/담당자/품목 분석 구조
- block/template payload

Sandbox는
`이미 계산된 CRM 행동 자산 + 실적/목표 정보`를 결합해
운영자가 통합적으로 볼 수 있는 분석 자산을 만든다고 이해하면 된다.

##### 10-5. Territory KPI 명세

Territory는 `sandbox_result_asset`, 표준 활동 데이터, 권역/담당자 기준 정보를 받아
권역 실행 자산을 만든다.

핵심 원칙:

- Sandbox에서 전달된 KPI 일부는 입력으로 소비한다
- Territory 자체 지표는 `modules/kpi/territory_engine.py` 기준으로 계산한다
- 지도/권역 자산은 계산 결과를 시각화하기 위한 표현 재료이지, 계산 대체 수단이 아니다

Territory KPI가 다루는 관점:

- 담당자별 커버리지
- 권역 배치 균형
- 월별 실행 흐름
- 권역별 실행 품질

Territory 출력 구조:

- `territory_result_asset.json`
- 담당자별/월별 지도 자산
- 커버리지 요약
- 배치/권역 실행 관점 요약
- `territory_builder_payload`

Territory는
`누가 어느 권역을 어떻게 커버하고 있는가`
를 실행 구조 관점에서 보여주는 모듈로 보면 된다.

##### 10-6. Prescription KPI 명세

Prescription은 prescription 표준 흐름 데이터와 필요 시 CRM 공통축을 받아
처방/출고 흐름 자산을 만든다.

핵심 원칙:

- Prescription KPI는 `modules/kpi/prescription_engine.py` 기준으로 계산한다
- Builder payload 조립 단계에서 KPI를 다시 계산하지 않는다
- Prescription 결과는 자체 보고서뿐 아니라 Sandbox 참고 입력으로도 쓰일 수 있다

Prescription KPI가 다루는 관점:

- 월별 처방 흐름
- 분기별 흐름 비교
- 처방/출고 검증 결과
- 흐름 요약과 예외 사항

Prescription 출력 구조:

- `prescription_result_asset.json`
- 처방 흐름 요약
- 검증 결과
- 월/분기 관점 보고용 데이터
- `prescription_builder_payload`

Prescription은
`처방 또는 출고 흐름이 실제로 어떤 패턴을 보이는지`
를 시간 흐름 기준으로 검증하는 모듈로 이해하면 된다.

##### 10-7. 모듈별 KPI 명세 정리

아주 쉽게 요약하면:

- `CRM`
  - 행동 KPI를 계산하는 출발 모듈
- `Sandbox`
  - CRM 행동 자산과 실적/목표를 묶어 통합 분석 자산 생성
- `Territory`
  - 권역 실행과 배치 품질을 계산
- `Prescription`
  - 처방/출고 흐름을 계산하고 검증 자산 생성

공통 원칙:

- 공식 계산은 각 엔진 파일에서만 한다
- 다음 모듈은 앞 단계 계산 결과를 소비한다
- Builder는 어떤 모듈의 KPI도 재계산하지 않는다

##### 11. Phase 5 결론

- KPI 계산의 공식 출처는 `modules/kpi/*`로 고정한다
- `crm`, `sandbox`, `territory`, `prescription`은 각자 필요한 KPI 계산을 이 단일 소스 기준으로 연결한다
- `validation`, `radar`, `builder`는 계산 모듈이 아니라 소비/판단/표현 모듈이다
- 이 단계가 끝나면 숫자 기준이 어디서 시작되고 어디서 멈추는지가 문서로 확정된다

추가 기준:

- CRM 11개 지표의 상세 계산 규칙은 별도 문서
  - `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`
  를 기준으로 본다

### [x] Phase 6. validation 규칙

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `06_validation_rules`
- `SALES_DATA_OS_FRONTEND_API_TABLE.md`의 validation summary 흐름
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 validation 관련 API 구간

KPI 이후 어떤 결과를 통과시키고,
어떤 경우 경고로 남기고,
어떤 경우 중단시키는지 정한다.

이 단계에서 정할 것:

- validation 판단 기준
- 전달 가능 여부 기준
- `WARN / FAIL` reason 생성 기준
- 단계 상태 구분 방식

#### Phase 6 설계 결과

##### 1. 이 단계의 뜻

여기서 말하는 `validation`은
앞단 입력 검증이 아니라,
KPI 계산 이후 단계에서 하는 `전달 판단`이다.

쉽게 말하면:

- 계산이 끝난 결과를
- 다음 단계로 넘겨도 되는지 판단하는 관문이다

##### 2. 무엇을 검증하는가

validation 단계는 아래를 본다.

- result asset 구조가 다음 단계로 넘길 수 있는지
- 매핑 상태가 허용 범위인지
- 품질 점수와 요약 상태가 기준 이상인지
- 운영 경고인지, 실제 차단 이슈인지

중요한 점:

- validation은 숫자를 다시 계산하지 않는다
- 이미 계산된 결과가 전달 가능한 상태인지 판단한다

##### 3. 다음 단계 전달 가능 기준

기본 상태값은 아래처럼 고정한다.

- `PASS`
  - 다음 단계로 전달 가능
- `WARN`
  - 전달은 가능하지만 운영 점검이 필요
- `FAIL`
  - 기본적으로 전달 보류 또는 수정 필요
- `APPROVED`
  - 의사결정/인텔리전스 활용 단계까지 승인된 상태

쉽게 말하면:

- `PASS`는 정상 통과
- `WARN`은 설명을 달고 통과
- `FAIL`은 다음 단계로 넘기지 않음
- `APPROVED`는 최종 활용 단계까지 승인된 상태

##### 4. WARN / FAIL reason 생성 기준

사용자에게는 단순 코드값만 주지 않는다.
아래 3가지를 같이 남겨야 한다.

- 원래 판정 메모
- 사람이 읽는 해석 문장
- 근거 수치 또는 근거 정보

대표 예:

- Territory는 실행 자체는 되었지만 `담당자 배치 불균형`이 감지되면 `WARN`
- 필수 입력 부족이나 구조 손상으로 다음 단계가 읽을 수 없으면 `FAIL`

원칙:

- `WARN`은 왜 경고인지 설명 가능해야 한다
- `FAIL`은 왜 막히는지 설명 가능해야 한다
- 상태만 주고 끝내면 안 된다

##### 5. step 상태 구분

운영 화면과 run 저장 기준 상태는 아래를 사용한다.

- `PASS`
- `WARN`
- `FAIL`
- `APPROVED`
- `SKIP`

각 의미:

- `PASS`
  - 정상 통과
- `WARN`
  - 실행은 가능하지만 점검 필요
- `FAIL`
  - 차단
- `APPROVED`
  - 승인 완료
- `SKIP`
  - 이번 실행 모드에서는 건너뜀

##### 6. validation의 역할 경계

validation은 아래만 한다.

- 품질 검증
- 전달 판단
- 실행 순서 통제
- 상태 기록

validation이 하지 않는 일:

- KPI 공식 계산
- raw 직접 해석
- HTML 렌더링

즉 validation은
`계산기`도 아니고
`보고서 생성기`도 아니다.

##### 7. 이 단계에서 남겨야 하는 결과

validation이 끝나면 최소한 아래 결과가 남아야 한다.

- `overall_status`
- 단계별 `steps[]`
- `reasoning_note`
- `evidence`
- 전달 승인 결과
- run 상태 반영 기록

이 정보는 나중에 아래 흐름에서 그대로 사용된다.

- validation summary 조회
- run 상세 화면
- reports/build artifacts 판단
- Agent 문맥

##### 8. validation summary 응답 기준

validation 결과는 운영 화면과 run 저장에서 같은 기준으로 보이게 한다.

예시 구조:

```json
{
  "overall_status": "PASS",
  "overall_score": 96.7,
  "steps": [
    { "step": "CRM", "status": "PASS" },
    { "step": "Sandbox", "status": "PASS" },
    { "step": "Territory", "status": "WARN" },
    { "step": "RADAR", "status": "APPROVED" },
    { "step": "Builder", "status": "PASS" }
  ],
  "reasoning_note": "기간 차이는 있지만 공통 분석 구간 기준으로 검증 완료",
  "interpreted_reason": "운영상 경고는 있으나 다음 단계 전달은 가능",
  "evidence": []
}
```

중요한 해석:

- 전체 상태와 단계별 상태를 함께 봐야 한다
- 한 단계가 `WARN`이어도 전체 흐름은 계속될 수 있다
- `FAIL`은 실제 차단 기준이다

##### 9. Phase 6 결론

- validation은 `계산 이후 전달 가능 여부를 판단하는 단계`로 고정한다
- `PASS/WARN/FAIL/APPROVED/SKIP` 상태 체계를 사용한다
- `WARN`과 `FAIL`은 반드시 사람이 읽을 수 있는 이유와 근거를 남긴다
- 이 단계가 끝나면 run 상태, validation summary, 다음 단계 전달 기준이 같은 문서 기준으로 맞춰진다

### [x] Phase 7. result asset / payload 구조

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 result asset / payload 관련 구간
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 report/builder API 구간
- `SALES_DATA_OS_FRONTEND_API_TABLE.md`의 artifacts/reports 호출 흐름

validation 이후
어떤 표준 산출물로 다음 단계에 넘길지 정한다.

이 단계에서 정할 것:

- result asset 표준 구조
- builder payload 표준 구조
- artifact와 payload 차이
- 보고서별 payload 차이

#### Phase 7 설계 결과

##### 1. result asset의 의미

result asset은
`모듈 계산 결과를 다음 단계에 안전하게 전달하는 표준 산출물`
이다.

쉽게 말하면:

- KPI 계산 결과와 핵심 요약을 담은 공식 전달 상자다

대표 예:

- `crm_result_asset.json`
- `prescription_result_asset.json`
- `sandbox_result_asset.json`
- `territory_result_asset.json`
- `radar_result_asset.json`

##### 2. result asset 표준 구조

모듈마다 상세 키는 다를 수 있지만,
운영 관점 공통 구조는 아래 뼈대로 본다.

- `asset_type`
- `schema_version`
- `company_key`
- `period`
- `summary`
- `metrics`
- `quality`
- 다음 단계가 읽을 수 있는 표준 payload 재료

쉽게 말하면:

- `이 자산이 무엇인지`
- `어느 회사 기준인지`
- `어느 기간 기준인지`
- `핵심 요약과 수치가 무엇인지`
- `품질 상태가 어떤지`
를 담고 있어야 한다.

##### 3. builder 직전 payload 구조

Builder 직전에는 보통 두 단계로 나눠 본다.

- `builder_input_standard`
  - 어떤 result asset을 어떤 템플릿으로 렌더할지 정리한 입력 규격
- `builder_payload_standard`
  - 템플릿이 바로 읽을 화면용 데이터 구조

즉:

- input standard는 `무엇을 어떤 보고서로 만들지` 정하는 상자
- payload standard는 `화면이 바로 읽을 데이터` 상자

##### 4. 모듈별 연결 예시

모듈별로는 아래처럼 연결한다.

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

원칙:

- Builder는 result asset을 바로 raw처럼 해석하지 않는다
- 중간 payload를 거쳐 화면용 구조로 바꾼 뒤 렌더한다

##### 5. artifact와 payload의 차이

이 둘은 구분해서 봐야 한다.

- `payload`
  - 화면이나 템플릿을 그리기 위한 데이터 본문
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

##### 6. report별 payload 차이

보고서마다 필요한 payload 모양은 다르다.

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

즉 공통 뼈대는 있어도,
보고서마다 실제 필요한 데이터 묶음은 달라진다.

##### 7. run 기준으로 함께 남는 파일

result asset과 payload 설계는 run 저장 구조와 함께 봐야 한다.
최소한 아래 파일은 run 기준으로 함께 남아야 한다.

- `runs/{run_id}/`
- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

이유:

- 실행 요약을 다시 볼 수 있어야 한다
- 어떤 산출물이 생성됐는지 확인할 수 있어야 한다
- Agent가 같은 run 문맥을 읽을 수 있어야 한다

##### 8. 이 단계의 핵심 원칙

- 다음 단계는 result asset을 소비한다
- Builder는 payload를 읽는다
- artifact는 실행 결과 전체를 보관한다
- 같은 내용을 매번 다시 계산하지 않도록 결과를 파일 단위로 남긴다

##### 9. Phase 7 결론

- result asset은 모듈 간 공식 전달 상자다
- builder payload는 템플릿이 바로 읽는 화면용 상자다
- artifact는 실행 결과 전체 파일 묶음이다
- 이 단계가 끝나면 다음 단계와 보고서 생성 단계가 어떤 데이터를 받아야 하는지 문서로 고정된다

### [x] Phase 8. Builder 주입 명세

Phase 시작 전 우선 참고:

- `SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`의 `08_builder_template_mapping`
- `SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`의 builder/report API 구간
- `SALES_DATA_OS_FRONTEND_API_TABLE.md`의 builder render/report 상세 흐름

마지막으로 Builder가
무엇을 읽고 어떻게 표현하는지만 정한다.

이 단계에서 정할 것:

- 템플릿별 입력 키
- 공통 payload와 전용 payload 구분
- Builder 계산 금지 원칙
- 최종 보고서 주입 기준

#### Phase 8 설계 결과

##### 1. Builder의 역할

Builder는
`이미 계산되고 validation을 통과한 result asset / payload를 템플릿에 주입해 HTML로 바꾸는 마지막 표현 단계`
다.

쉽게 말하면:

- Builder는 계산기가 아니다
- Builder는 전달받은 내용을 보기 좋게 바꾸는 단계다

##### 2. Builder가 받는 공통 입력

Builder는 보통 아래 공통 입력을 받는다.

- 템플릿 키
- 렌더 모드
- output 이름
- report title
- payload 본문

특정 보고서 재렌더 기준 요청값은 아래를 함께 본다.

- `report_type`
- `period_mode`
- `year`
- `sub_period`

즉 Builder는
`어떤 보고서를 어떤 템플릿으로 만들지`
와
`그 템플릿이 읽을 데이터`
를 받는다.

##### 3. 공통 payload와 템플릿 전용 payload

공통 payload에는 아래가 들어간다.

- 회사 정보
- 기간 정보
- 보고서 제목
- 버전 정보
- 요약 메타 정보

템플릿 전용 payload에는 아래가 들어간다.

- CRM 전용 KPI/행동 구조
- Sandbox 전용 block/branch asset 구조
- Territory 전용 map/catalog/route 구조
- Prescription 전용 claims/detail 구조
- RADAR 전용 signal/priority/decision option 구조

원칙:

- 공통 정보는 모든 보고서가 공유한다
- 보고서 고유 내용은 전용 payload에 둔다

##### 4. 템플릿별 주입 기준

###### CRM 보고서

- 템플릿
  - `templates/crm_analysis_template.html`
- 들어가는 값
  - CRM KPI 요약
  - 행동 프로파일
  - 필터/기간 정보
  - 보조 JS asset manifest

###### Sandbox 보고서

- 템플릿
  - `templates/report_template.html`
- 들어가는 값
  - dashboard summary
  - block payload
  - branch index
  - 선택 지점 상세 asset 위치

###### Territory 보고서

- 템플릿
  - `templates/territory_optimizer_template.html`
- 들어가는 값
  - 담당자 catalog
  - 월별 route/map asset
  - 기본 선택 상태
  - 로컬 지도 asset 경로

###### Prescription 보고서

- 템플릿
  - `templates/prescription_flow_template.html`
- 들어가는 값
  - 월/분기 필터 정보
  - claims/detail asset
  - 흐름 요약 데이터

###### RADAR 보고서

- 템플릿
  - `templates/radar_report_template.html`
- 들어가는 값
  - signal list
  - priority summary
  - decision option text

###### 통합 보고서

- 템플릿
  - `templates/total_valid_templates.html`
- 들어가는 값
  - 개별 보고서 HTML 경로 또는 연결 정보

중요한 해석:

- 통합 보고서는 새 계산 엔진이 아니다
- 이미 생성된 개별 결과를 묶어 보여주는 허브다

##### 5. Builder 계산 금지 원칙

Builder는 아래를 하면 안 된다.

- raw 직접 해석
- KPI 재계산
- 비즈니스 규칙 재구현

즉 Builder는

- payload 읽기
- 템플릿에 값 넣기
- HTML 생성

까지만 담당한다.

##### 6. 최종 보고서 주입 기준

최종 보고서 주입은 아래 순서로 본다.

1. validation을 통과한 result asset 준비
2. 보고서별 builder payload 준비
3. 템플릿 선택
4. payload 주입
5. HTML 및 관련 asset 저장
6. reports / artifacts / report context 갱신

이 흐름의 목적은 단순하다.

- 보고서 생성 단계에서 계산을 다시 하지 않는다
- 보고서와 run 산출물이 같은 기준을 바라보게 한다

##### 7. Builder 결과로 남겨야 하는 것

Builder가 끝나면 최소한 아래가 남아야 한다.

- `*_preview.html`
- payload JSON
- 관련 JS/CSS/asset 파일
- 보고서 목록/경로 메타
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

이유:

- 사용자가 보고서를 다시 열 수 있어야 한다
- 어떤 파일이 생성됐는지 확인할 수 있어야 한다
- Agent가 같은 run 기준으로 해석할 수 있어야 한다

##### 8. Phase 8 결론

- Builder는 `계산 이후의 마지막 표현 단계`로 고정한다
- 공통 payload와 템플릿 전용 payload를 분리한다
- 템플릿별 입력 기준을 미리 문서로 잠근다
- 이 단계가 끝나면 보고서 생성이 어떤 데이터 계약 위에서 움직이는지 문서 기준이 완성된다

## 진행 체크리스트

- [x] Phase 1. 입력 단계 명세
- [x] Phase 2. 입력 검증 규칙
- [x] Phase 3. 정규화 규칙
- [x] Phase 4. 모듈 역할과 입출력
- [x] Phase 5. KPI 계산 상세
- [x] Phase 6. validation 규칙
- [x] Phase 7. result asset / payload 구조
- [x] Phase 8. Builder 주입 명세

## Phase 작성 원칙

- 지금 단계는 `프론트 연동`이 아니라 `백엔드 로직 설계`다
- 각 Phase는 앞 Phase가 고정된 뒤 다음 Phase로 넘어간다
- `docs/backend_architecture/` 문서는 참고용이다
- 최종 설계 순서와 기준은 이 문서 기준으로 정리한다

## 전달 요청 문구

아래 내용을 문서 기준으로 정리해서 전달해주세요.

중요:
이 프로젝트는 단순 웹앱이 아니라 Sales Data OS 운영 체계입니다.
현재 설계 기준 공식 흐름은 아래입니다.

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

따라서 화면 설명보다 아래 백엔드 로직 명세가 우선 필요합니다.

참고:
현재 기준 모듈 구조는 아래 9개입니다.

- `crm`
- `sandbox`
- `territory`
- `prescription`
- `radar`
- `kpi`
- `intake`
- `builder`
- `validation`

### 1. 입력 단계 명세

- 어떤 파일들을 입력으로 받는지
- 파일별 역할이 무엇인지
- 필수 파일 / 선택 파일 구분
- 회사별 파일 형식 차이가 있는지
- 파일별 필수 컬럼이 무엇인지

### 2. 입력 검증 규칙

- 어떤 경우 진행 가능인지
- 어떤 경우 WARN인지
- 어떤 경우 FAIL인지
- 자동 수정 가능한 항목은 무엇인지
- 사람 확인이 필요한 항목은 무엇인지
- 기간 차이 / 공통 분석 구간은 어떻게 판단하는지

### 3. 정규화 규칙

- raw 데이터를 어떤 공통 스키마로 바꾸는지
- 컬럼명 매핑 규칙
- 타입 정리 규칙
- 날짜 / 월 형식 통일 규칙
- 정규화 후 저장되는 기준 구조

### 4. 9개 모듈별 역할과 입출력

아래 모듈 전체를 기준으로 각각 정리해주세요.

- `intake`
- `kpi`
- `crm`
- `sandbox`
- `territory`
- `prescription`
- `validation`
- `radar`
- `builder`

각 모듈마다 아래를 알려주세요.

- 이 모듈의 역할
- 이전 단계에서 무엇을 입력으로 받는지
- 이 모듈이 수행하는 핵심 처리
- 무엇을 출력하는지
- 다음 단계로 무엇을 넘기는지

추가로 아래는 더 자세히 부탁드립니다.

#### 4-1. KPI 계산 관점 상세

특히 아래 모듈은 KPI 계산 또는 KPI 결과 소비 관점에서 더 자세히 정리해주세요.

- `kpi`
- `crm`
- `sandbox`
- `territory`
- `prescription`

각 모듈마다 아래를 알려주세요.

- 입력 데이터
- 계산하는 KPI 또는 소비하는 KPI
- 출력 구조
- 다음 단계로 넘기는 result asset 형태

### 5. validation 규칙

- KPI 결과를 어떤 기준으로 검증하는지
- 어떤 기준으로 다음 단계로 전달 가능한지
- WARN / FAIL reason은 어떻게 생성하는지
- step 상태는 어떻게 구분하는지

### 6. result asset / payload 구조

- result asset의 표준 구조
- builder에 넘기기 전 payload 구조
- artifact와 payload의 차이
- report별 payload 차이가 있는지

### 7. Builder 주입 명세

- 각 보고서 템플릿에 어떤 값이 들어가는지
- 템플릿별 필요한 데이터 키 목록
- 공통 payload와 템플릿 전용 payload 구분
- Builder는 계산하지 않고 payload만 읽는다는 기준으로 설명

## 권장 문서 구조

가능하면 아래 구조처럼 정리해주세요.

- `01_input_spec`
- `02_prevalidation_rules`
- `03_normalization_schema`
- `04_module_responsibility_and_io`
- `05_kpi_module_io`
- `06_validation_rules`
- `07_result_asset_payload_spec`
- `08_builder_template_mapping`

## 설명 방식 요청

코드 중심보다 운영 로직 중심으로 써주세요.

즉
`무슨 함수가 있다`
보다
`어떤 입력을 받아 어떤 판단을 거쳐 어떤 결과를 다음 단계로 넘기는가`
를 분명하게 정리해주시면 됩니다.
