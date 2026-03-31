# Sales Data OS Web Startup Context

## 목적

이 문서는 새 세션에서
프로젝트 전반 맥락을 빠르게 붙여넣어 실행할 수 있게 만든
`시작용 요약 문서`다.

정식 스킬 포맷이 아니라,
사람이 읽고 그대로 복붙해서
에이전트에게 프로젝트 세계관을 먼저 맞추기 위한 문서다.

## 이 프로젝트를 한마디로 말하면

`Sales Data OS`는
제약 영업 데이터를
업로드 -> 실행 -> 검증 -> 결과 확인 -> 산출물 확인 -> 보고서 열람 -> 해석 보조 흐름으로 다루는
운영 웹 앱이다.

즉 일반 대시보드가 아니라
`영업 데이터 운영 체계의 웹 전환 프로젝트`
다.

## 지금 반드시 이해해야 하는 핵심

### 1. 이건 단순 웹사이트가 아니다

이 프로젝트의 본질은
예쁜 화면을 만드는 것이 아니라
기존 운영 흐름을 제품 수준 웹 경험으로 재구성하는 것이다.

### 2. 역할을 절대 섞으면 안 된다

- KPI 계산: 프론트가 하지 않음
- validation: 검증과 전달 판단 레이어
- Builder: render-only
- Web: 입력, 실행, 상태 추적, 설명, 결과 열람
- Worker: 무거운 계산, 결과 생성, 단계 상태 갱신

### 2-1. 현재 우선순위는 백엔드 구현이다

기본 화면 뼈대와 백엔드 설계 문서는 이미 정리된 상태다.
따라서 지금부터는
`새 화면 추가`
보다
`백엔드 파일 구현`
이 먼저다.

공식 백엔드 흐름:

- `입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

공식 모듈 구조:

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
- 내부 엔진 모듈은 `4개`다
  - `intake`
  - `kpi`
  - `validation`
  - `builder`
- 시스템 설명은 항상 `9개 모듈`, 화면/결과 설명은 `겉으로 보이는 5개 모듈` 기준으로 맞춘다

### 3. 웹은 설명형 운영 화면이어야 한다

단순 배지나 숫자만 보여주면 안 된다.
반드시 아래를 설명해야 한다.

- 왜 WARN인지
- 어떤 입력이 부족한지
- 어떤 기간 차이가 있는지
- 공통 분석 구간이 무엇인지
- 지금 실행 가능한지
- 다음에 무엇을 해야 하는지

### 4. run 문맥이 중요하다

이 프로젝트에서 중요한 기준은:

- `company_key`
- `run_id`

사용자는 항상
지금 어느 회사와 어느 run을 보고 있는지
이해할 수 있어야 한다.

### 5. Agent는 마지막에 붙는 전략 기능이다

지금은 부가기능이지만,
장기적으로는 핵심축으로 올라갈 가능성이 크다.

그래서 현재 계획상:

- 핵심 운영 흐름 뒤에 구현
- 가장 마지막 구현 단계에 배치
- 반드시 `run + result asset + artifact + report` 문맥 위에서 동작

## 현재 기술 결정

- 프론트엔드: `Next.js 16 + React 19 + TypeScript`
- 스타일: `Tailwind CSS 4`
- 상태관리: `Zustand + TanStack Query`
- 데이터/메타: `Supabase`
- 장기 실행: `Python polling worker`
- 패키지 매니저: `pnpm`
- 시작 위치: 새 폴더 없이 현재 루트
- 인증: 1차는 개발용 무로그인

## 현재 페이지 흐름

현재 기준 페이지 흐름은 아래다.

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Artifacts`
5. `Reports`
6. `Run Detail`
7. `Agent`

추가 해석:

- `Run Detail`은 상단 주 메뉴보다 경로 진입 상세 페이지 성격이 강하다
- `Runs`는 독립 상단 메뉴로 두지 않고, `Run Detail` 안의 run selector / run switcher로 흡수한다
- `Agent`는 결과를 다 본 뒤 들어가는 마지막 해석 층이다

## 현재 구현 Phase

문서 기준 현재 상태는 아래처럼 이해한다.

- `Phase 1`: 기반 고정 완료
- `Phase 2`: 앱 프레임과 디자인 베이스 완료
- `Phase 3`: 입력 수용 구현 완료
- `Phase 4`: 입력 검증 구현 완료
- `Phase 5`: 정규화 구현 완료
- 다음 우선순위: `Phase 6 ~ Phase 10` 백엔드 구현
- 그 다음: `Phase 11 ~ Phase 14` 프론트 연결
- 이후: `Phase 15 ~ Phase 18` 확장 및 안정화

현재 구현 진행사항 상세는 아래 문서만 기준으로 본다.

- `docs/current_implementation_status.md`

## 지금 바로 필요한 페이지

- `Workspace`
- `Upload`
- `Pipeline`
- `Run Detail`
- `Artifacts`
- `Reports`

가장 마지막 구현 단계:

- `Agent`

## 디자인 기준

디자인 방향은 아래 문서를 기준으로 본다.

- `docs/08_design_system.md`
- `docs/11_antigravity_html_design_brief.md`

디자인 예시 HTML은 아래 폴더를 기준으로 본다.

- `docs/ui/design_guide/`

해석 규칙:

- 번호 있는 HTML: 상단 주 메뉴 기준 페이지
- 번호 없는 `run_detail`: 경로로 들어가는 상세 페이지

디자인 구현 시 주의:

- HTML을 그대로 복붙하지 않는다
- 공통 레이아웃 / 공통 컴포넌트 / 페이지 섹션으로 분해한다
- 일반 SaaS 대시보드처럼 평균적인 화면으로 바꾸지 않는다

## Agent 페이지 해석

Agent는 단순 채팅창이 아니다.

반드시 아래를 기반으로 답해야 한다.

- 현재 run
- result asset
- artifact
- report
- validation 결과

즉 Agent는:

`해석 레이어`

로 이해한다.

## 먼저 읽을 문서

새 세션에서 먼저 볼 문서:

1. `AGENTS.md`
2. `README.md`
3. `docs/task.md`
4. `docs/08_design_system.md`
5. `docs/11_antigravity_html_design_brief.md`
6. `docs/12_report_template_dependencies.md`
7. `docs/13_backend_logic_request_prompt.md`
8. `docs/backend_architecture/`

필요 시 추가:

- `docs/01_prd.md`
- `docs/04_tech_stack.md`
- `docs/05_frontend_architecture.md`
- `docs/06_backend_api_plan.md`
- `docs/07_data_flow.md`

## 작업 전 체크리스트

작업 시작 전에 아래를 스스로 확인한다.

1. 지금 만드는 것이 어느 페이지/어느 Phase에 속하는가
2. 현재 작업이 `company_key`와 `run_id` 문맥을 유지하는가
3. 프론트가 계산을 하려는 방향으로 가고 있지 않은가
4. 상태에 설명 문장이 같이 들어가는가
5. 디자인 HTML을 복붙하려는 상태는 아닌가
6. Agent를 run 문맥 없는 채팅창처럼 만들려는 건 아닌가

## 붙여넣기용 짧은 시작 문구

필요하면 아래 문장을 세션 시작 때 그대로 붙여넣어도 된다.

```text
먼저 이 프로젝트를 Sales Data OS 운영 웹 앱으로 이해해줘.
이건 일반 대시보드가 아니라 업로드 -> 실행 -> 검증 -> 결과 -> 보고서 -> 해석 보조 흐름을 가진 운영 체계의 웹 전환 프로젝트야.
프론트는 KPI 계산을 하지 않고, Supabase는 메타/상태를 관리하고, Python polling worker가 무거운 실행을 맡아.
현재 페이지 흐름은 Workspace, Upload, Pipeline, Artifacts, Reports, Run Detail, Agent 순서야.
Run Detail은 경로 진입 상세 페이지고, Runs는 독립 메뉴가 아니라 Run Detail 안의 selector로 흡수해.
공식 모듈 구조는 intake, kpi, crm, sandbox, territory, prescription, validation, radar, builder 총 9개야.
겉으로 보이는 결과 모듈은 crm, sandbox, prescription, territory, radar 5개고, intake, kpi, validation, builder는 내부 엔진이야.
Agent는 result asset, artifact, report, validation 결과를 기반으로 해석하는 마지막 전략 기능이야.
작업 전에는 docs/task.md, docs/08_design_system.md, docs/11_antigravity_html_design_brief.md 기준으로 판단해줘.
```
