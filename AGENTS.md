# AGENTS.md

## 목적

이 파일은 `C:\sales_os` 루트에서 작업하는 에이전트가
현재 프로젝트의 핵심 방향을 빠르게 이해하도록 돕는 작업 기준 문서다.

## 프로젝트 한 줄 요약

`Sales Data OS`는 제약 영업 데이터를
업로드 -> 실행 -> 검증 -> 결과 확인 -> 보고서 열람 흐름으로 다루는 운영 웹 앱이다.

현재 웹 프로젝트는 아래 구조를 전제로 한다.

- 프론트엔드: `Next.js 16 + React 19 + TypeScript`
- 데이터/메타 계층: `Supabase`
- 장기 실행: `Python polling worker`
- 패키지 매니저: `pnpm`
- 시작 위치: 새 폴더 없이 현재 루트

## 작업 원칙

### 1. 역할을 섞지 말 것

- KPI 계산은 프론트에서 하지 않는다
- Builder는 render-only로 유지한다
- validation은 검증과 전달 판단 레이어로만 다룬다
- 웹은 입력, 실행, 상태 추적, 설명, 결과 열람을 맡는다

### 2. 설명형 운영 UX를 유지할 것

상태는 배지만 보여주면 안 된다.
반드시 사람이 읽는 설명 문장을 함께 보여준다.

예:

- 왜 WARN인지
- 어떤 입력이 부족한지
- 공통 분석 구간이 무엇인지
- 지금 실행 가능한지

### 3. run 문맥을 잃지 말 것

이 프로젝트에서 중요한 기준은 아래다.

- `company_key`
- `run_id`

페이지를 만들 때도
사용자가 현재 어느 회사와 어느 run을 보고 있는지
항상 이해할 수 있어야 한다.

### 4. 디자인 구현 원칙

디자인 예시는 `docs/ui/design_guide/` 아래 HTML을 기준으로 한다.

- 번호 있는 HTML: 상단 주 메뉴 기준 페이지
- `run_detail` HTML: 경로를 통해 들어가는 상세 페이지

디자인은 그대로 복붙하지 말고,
공통 레이아웃 / 공통 컴포넌트 / 페이지 섹션으로 분해해서 구현한다.

### 5. 페이지 우선순위

현재 기준 주 흐름:

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Artifacts`
5. `Reports`
6. `Run Detail`
7. `Agent`

주의:

- `Run Detail`은 상단 주 메뉴보다 경로 진입 상세 페이지로 본다
- `Agent`는 가장 마지막에 구현하는 전략 기능이다

### 5-1. 현재 구현 우선순위

기본 화면 뼈대와 백엔드 설계 문서는 이미 정리된 상태다.
따라서 지금부터 우선순위는
`새 화면 추가`
보다
`백엔드 파일 구현`
이 먼저다.

현재 기준 구현 상태:

- `Phase 1. 기반 고정` 완료
- `Phase 2. 앱 프레임과 디자인 베이스` 완료
- 백엔드 로직 설계 문서 완료

다음 구현 순서:

1. 백엔드 구현 `Phase 3 ~ Phase 10`
2. 프론트 화면 연결 `Phase 11 ~ Phase 14`
3. 이후 `RADAR`, 보조 기능, `Agent`, 운영 안정화

현재 고정해야 하는 공식 백엔드 흐름:

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

중요:

- 앞단 `검증`은 입력 파일 점검
- 뒤단 `validation`은 KPI 이후 전달 판단
- Builder는 계산 금지, payload 소비 전용

공식 모듈 구조는 아래 `9개`다.

- `intake`
- `kpi`
- `crm`
- `sandbox`
- `territory`
- `prescription`
- `validation`
- `radar`
- `builder`

주의:

- 겉으로 드러나는 운영/결과 모듈은 `5개`다
  - `crm`
  - `sandbox`
  - `prescription`
  - `territory`
  - `radar`
- 내부에서 움직이는 엔진 모듈은 `4개`다
  - `intake`
  - `kpi`
  - `validation`
  - `builder`
- 시스템 설명은 `9개 모듈`, 화면 설명은 `겉으로 보이는 5개 모듈` 기준으로 맞춘다

### 6. 대형 패치 분할 규칙

파일 수정이나 생성 패치가 커질 때는
한 번에 길게 넣지 않는다.

- `200줄 이상`이 될 가능성이 있으면 반드시 여러 번으로 나눠서 패치한다
- 공통 컴포넌트, 페이지, 스타일, 데이터 파일을 분리해서 순서대로 반영한다
- 큰 패치를 한 번에 넣다가 실패하는 방식은 피한다

## 사용자 커뮤니케이션 원칙

이 프로젝트 사용자는 비개발자 관점이 강하다.
그래서 설명할 때는:

- 어려운 개발용어를 줄이고
- 코드보다는 의미를 먼저 설명하고
- 아주 쉽게 풀어서 말한다

## 참고 문서

가장 먼저 볼 문서:

- `docs/task.md`
- `docs/08_design_system.md`
- `docs/11_antigravity_html_design_brief.md`
- `docs/12_report_template_dependencies.md`
- `docs/13_backend_logic_request_prompt.md`
- `docs/backend_architecture/`

맥락 유지용 스킬:

- `.codex/skills/sales-data-os-context/`
