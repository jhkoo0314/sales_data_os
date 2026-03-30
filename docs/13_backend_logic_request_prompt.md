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
