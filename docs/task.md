# Sales Data OS Web - 상세 구현 계획

작성일: 2026-03-30  
상태: `ready-for-build`

## 1. 이 문서의 목적

이 문서는 `docs` 설계 문서를 실제 구현 시작용 작업 계획으로 바꾼 문서다.

쉽게 말하면 아래를 한 번에 정리한다.

- 무엇을 먼저 만들지
- 어떤 방식으로 화면 뼈대를 깔지
- Supabase와 웹을 어떻게 연결할지
- 예시 HTML 디자인 파일이 들어오면 어디에 맞춰 붙일지

이 문서는 `현재 루트 폴더에서 바로 개발을 시작할 수 있는 작업 지시서` 역할을 한다.

진행사항 기록 원칙:

- 현재 구현 진행사항 상세는 `docs/current_implementation_status.md`에만 기록한다
- 이 문서는 Phase 체크와 구현 순서 기준으로만 유지한다

## 2. 사용자 정체성 이해

`career-profile-writer` 스킬과 현재 문서를 함께 보면,
이 프로젝트의 실제 주인은 일반 개발자가 아니라 아래에 더 가깝다.

- 제약 영업 현장을 오래 이해한 사람
- Sales Planning / SFE / CRM 관점으로 운영 구조를 설계하는 사람
- 현업 문제를 데이터와 운영 로직으로 풀고 싶은 사람
- 코드를 위한 코드가 아니라 `관리자가 바로 판단할 수 있는 시스템`을 만들려는 사람

즉 이 웹 앱은
“예쁜 관리자 화면”이 목적이 아니라,
`영업 운영 상태를 빠르게 읽고, 실행하고, 결과를 설명하는 운영 제품`
이어야 한다.

그래서 구현도 아래 기준을 지켜야 한다.

- 어려운 기술보다 흐름이 먼저 보여야 한다.
- 상태는 색만이 아니라 설명 문장으로 보여야 한다.
- 사용자는 항상 `현재 회사`와 `현재 run`을 이해할 수 있어야 한다.
- 프론트엔드는 계산기가 아니라 `입력/실행/조회/설명` 화면이어야 한다.

## 3. 추가 맥락으로 확정된 프로젝트 이해

추가 문서까지 포함해 보면,
이번 작업은 단순한 웹 콘솔 제작이 아니다.

핵심 이해는 아래 다섯 가지다.

1. `Sales Data OS`는 대시보드가 아니라
   데이터 수용 -> 표준화 -> KPI 계산 -> 검증 -> 인텔리전스 -> 보고서로 이어지는
   영업 데이터 운영 체계다.
2. 가장 중요한 것은 역할 분리다.
   KPI 계산은 KPI 엔진,
   검증과 전달 판단은 validation,
   표현은 Builder,
   웹은 입력/실행/조회/설명을 맡아야 한다.
3. 업로드는 시작일 뿐이다.
   사용자는 파일이 올라갔는지보다
   지금 이 데이터로 어디까지 진행 가능한지와 무엇을 주의해야 하는지를 알아야 한다.
4. 핵심 엔진은 이미 어느 정도 검증이 끝난 상태다.
   따라서 이번 웹 작업은 새 시스템 발명이 아니라
   이미 운영 검증된 흐름을 더 좋은 제품 화면으로 바꾸는 일이다.
5. 웹의 본질은 계산이 아니라 관제와 설명이다.
   무거운 계산과 결과 생성은 worker가 맡고,
   웹은 상태와 이유와 다음 행동을 보여줘야 한다.

## 4. 제품 한 줄 해석

`Sales Data OS Web`은  
기존 Sales Data OS 계산 자산은 존중하되,  
웹 앱의 데이터 저장, 파일 메타 관리, 실행 이력 관리를  
`Supabase` 중심으로 재구성하는 운영 웹 앱이다.

## 5. 구현 핵심 원칙

### 4.1 절대 바꾸지 않을 것

- KPI 계산 로직은 프론트엔드로 옮기지 않음
- Builder는 render-only 유지
- 모든 저장/조회 기준은 `company_key`
- 실행 추적 기준은 `run_id`

### 4.2 웹이 맡을 일

- 회사 선택
- 파일 업로드
- 실행 준비 상태 표시
- 실행 시작
- polling 기반 상태 추적
- 단계별 결과 표시
- 보고서/아티팩트 열람 연결

### 4.3 Supabase가 맡을 일

- 회사, 업로드, run, 보고서 메타 저장
- 파일 저장소 관리
- 행 단위 접근 제어 확장 기반
- 웹이 바로 읽을 수 있는 데이터 API 제공

### 4.4 설계 우선순위

1. 구조가 먼저
2. 상태 흐름이 다음
3. 디자인 입히기는 그 다음

즉 처음부터 모든 화면을 완성형으로 만들지 않고,
`작동하는 뼈대 + 나중에 디자인을 덮어씌우기 쉬운 구조`
로 시작한다.

### 4.5 웹이 반드시 보여줘야 하는 운영 설명

이 웹은 단순 상태값만 보여주면 부족하다.
추가 문서 기준으로 아래 설명력이 반드시 들어가야 한다.

- 필수 입력 부족 여부
- 자동 보정 또는 검토 필요 여부
- source 간 기간 차이
- 공통 분석 가능 구간
- 이 상태로 계속 진행 가능한지 여부
- WARN/FAIL의 이유와 근거 수치

즉 모든 핵심 상태에는
`사람이 읽는 설명 문장`
이 따라와야 한다.

## 6. 구현 방식: 하이브리드 스켈레톤 방식

이 프로젝트는 `하이브리드 스켈레톤 방식`으로 시작한다.

뜻은 아래와 같다.

### 5.1 스켈레톤 1: 앱 구조 스켈레톤

먼저 앱의 큰 뼈대를 만든다.

- App Shell
- Sidebar
- Top Header
- Company Context Bar
- 기본 라우트
- 공통 상태 저장소
- Supabase 클라이언트
- 공통 API 래퍼

이 단계에서는 화면이 단순해도 된다.
대신 이동 구조와 상태 흐름이 먼저 살아 있어야 한다.

### 5.2 스켈레톤 2: 기능 스켈레톤

다음으로 각 페이지에 `작동하는 업무 뼈대`를 넣는다.

- Upload: 파일 목록, 업로드 영역, 상태 표시 영역
- Pipeline: 실행 모드 선택, 실행 버튼, 현재 run 상태
- Run Detail: 단계 리스트, 설명 문장, 보고서/아티팩트 링크
- Reports: 카드 목록, 생성 여부, 열기 버튼

이 단계에서는 실제 Supabase 스키마가 아직 일부만 확정돼도
`mock 데이터 -> Supabase 실제 연결`로 쉽게 바꿀 수 있게 만든다.

### 5.3 하이브리드 요소

`하이브리드`라는 말은 아래 두 가지를 같이 쓰겠다는 뜻이다.

1. `실제 제품 구조`
2. `디자인 대체 가능한 화면 골격`

즉,
지금은 기능 구현을 시작할 수 있는 수준까지 먼저 만들고,
사용자가 주는 예시 HTML 디자인 파일은
나중에 전체 구조를 깨지 않고 UI 껍데기처럼 덧씌울 수 있게 준비한다.

## 7. 먼저 결정한 구현 가정

오픈 이슈가 일부 남아 있지만,
개발 시작을 위해 아래처럼 가정하고 진행하는 것이 가장 안전하다.

### 6.1 프로젝트 위치

- 새 폴더를 만들지 않고 현재 루트 폴더에서 바로 시작
- `pnpm` 기반으로 패키지와 스크립트를 루트에 바로 설치
- 문서의 `apps/web` 구조는 참고용이며,
  실제 구현은 현재 루트 기준으로 단순한 웹 프로젝트 구조로 시작

### 6.2 상태 업데이트 방식

- 1차는 `polling`

### 6.3 보고서 열람 방식

- 1차는 기존 HTML 보고서 연결 우선
- 새 탭 열기 또는 내부 viewer는 구현 시점에 결정

### 6.4 인증 범위

- 1차는 개발용 무로그인으로 설계
- 로그인, 세션, 권한 분기 UI는 넣지 않음

### 6.5 업로드 UX

- 1차는 `업로드 완료 상태`와 `실행 준비 상태`를 분리해서 표시
- 즉, 파일이 올라갔다고 바로 실행 가능으로 보지 않음

### 6.6 백엔드 방식

- 백엔드는 `Supabase` 중심으로 설계
- 회사, 업로드, run, report 메타는 Supabase 테이블 기준으로 관리
- 파일은 Supabase Storage 사용을 우선 검토
- 긴 실행 작업은 `Python polling worker`가 담당
- 웹은 실행 요청을 등록하고, worker가 실제 계산/생성/렌더를 수행

### 6.7 실행 엔진 확정안

- 1차 worker 스택은 `Python`
- 1차 실행 방식은 `Supabase run 테이블 polling`
- 즉, 별도 복잡한 큐 시스템 없이
  Python worker가 `pending` run을 주기적으로 확인하고 처리

이 방식이 좋은 이유:

- 현재 프로젝트 성격과 가장 잘 맞음
- 계산/파일생성/렌더링 같은 무거운 작업에 적합
- 초기 구현 난이도가 낮음
- 나중에 필요하면 더 무거운 큐 구조로 확장 가능

## 8. 추천 실제 프로젝트 구조

```text
sales_os/
  app/
    workspace/
      [companyKey]/
        page.tsx
        upload/page.tsx
        pipeline/page.tsx
        runs/[runId]/page.tsx
        reports/page.tsx
        artifacts/page.tsx
        agent/page.tsx
    admin/
      companies/page.tsx
    layout.tsx
    page.tsx
  src/
    components/
      ui/
      layout/
      feedback/
    features/
      companies/
      upload/
      pipeline/
        reports/
        artifacts/
        agent/
    lib/
      api/
      supabase/
      format/
      utils/
      constants/
    stores/
    hooks/
    types/
    styles/
  public/
  tests/
  package.json
  pnpm-lock.yaml
  supabase/
  workers/
```

## 9. 1차 구현 범위

문서 기준으로 기본 화면 뼈대는 이미 한 번 구현되었다.
따라서 이제 1차 구현 범위의 우선순위는
`화면 추가`보다
`백엔드 엔진 설계`
가 먼저다.

현재 기준 실제 첫 개발 범위는 아래 두 축으로 본다.

### 화면 축

- Workspace
- Upload
- Pipeline
- Artifacts
- Reports
- Run Detail
- Agent

이 화면들은 현재 기본 뼈대가 마련된 상태다.

### 엔진 축

- Input Intake
- Pre-Normalization Validation
- Adapter / Normalization
- KPI Engine
- Validation
- Result Asset / Payload
- Builder 입력 계약

즉 지금부터의 핵심 일은
`화면을 더 늘리는 것`이 아니라
`기본 화면 뒤에서 실제로 돌아갈 엔진 흐름을 먼저 설계하는 것`
이다.

화면은 이미 시작점이 생겼고,
이제는 백엔드 설계를 통해
진짜 운영 체계를 고정해야 한다.

이 단계는 단순 메뉴 목록이 아니라,
기존 운영 체계의 실제 동작 순서를 웹/worker 구조 위에 다시 성립시키는 최소 단위다.

## 10. 화면별 상세 구현 계획

### 9.1 공통 App Shell

목표:

- 어느 화면에 있어도 지금 보고 있는 회사와 현재 위치가 보이게 만들기

구현 항목:

- 좌측 Sidebar
- 상단 Header
- Company Context Bar
- 페이지 타이틀 영역
- 전역 빈 상태 화면

완료 기준:

- 회사 문맥이 모든 업무 페이지에서 유지됨

### 9.2 회사 선택

목표:

- 사용자가 현재 작업 대상을 헷갈리지 않게 하기

구현 항목:

- 회사 목록 조회
- 검색 가능한 선택 UI
- 최근 실행 상태 간단 표시
- 선택 후 해당 회사 라우트로 이동

필수 데이터:

- `company_key`
- `company_name`
- `last_run_status`
- `last_run_at`

### 9.3 Upload 화면

목표:

- 어떤 파일이 있고 무엇이 부족한지,
  그리고 지금 이 데이터로 어디까지 진행 가능한지 바로 알 수 있게 하기

구현 항목:

- 일반 파일 업로드 영역
- 월별 raw 업로드 영역
- 저장된 파일 목록
- 상태 배지 + 설명 문장
- intake 설명 영역
- 기간 차이 / 공통 분석 구간 안내
- Pipeline 이동 버튼

화면 구역:

1. 업로드 요약
2. 일반 업로드 섹션
3. 월별 업로드 섹션
4. 저장 목록 테이블 또는 카드

### 9.4 Pipeline 화면

목표:

- 지금 실행 가능한지, 왜 가능한지 또는 왜 막히는지,
  어떤 모드로 돌릴지, 지금 어디까지 갔는지 보여주기

구현 항목:

- 실행 준비 상태 요약
- 실행 모드 카드
- 실행 시작 버튼
- 최근 run 상태 카드
- polling 기반 진행 상태 갱신
- 실행 가능/불가 사유 문장

화면 구역:

1. 실행 준비 상태
2. 모드 선택
3. 실행 액션
4. 현재 run 진행 상태

### 9.5 Runs 처리 방식

목표:

- 별도 상단 메뉴 페이지 없이도 최근 run을 탐색할 수 있게 하기

구현 항목:

- `Run Detail` 화면 안에 최근 run selector 또는 run switcher 배치
- 현재/과거 run 전환
- 필요 시 2차 이후 독립 `Runs` 페이지로 분리 가능

### 9.6 Run Detail 화면

목표:

- WARN/FAIL 이유와 근거 수치를 사람이 읽을 수 있게 보여주기

구현 항목:

- run 기본 정보 카드
- 전체 상태 요약
- 최근 run selector / run switcher
- 단계별 상태 리스트
- reasoning 문장
- artifact 링크
- report 링크

핵심 원칙:

- 기술 코드보다 설명 문장 우선

### 9.7 Reports 화면

목표:

- 사용자가 최종 보고서를 가장 빨리 찾게 하기

구현 항목:

- 보고서 카드 목록
- 생성 여부 상태
- 열기 버튼
- 다운로드 버튼
- 관련 run 표시

## 11. Supabase 연결 계획

1차 MVP에서 먼저 붙일 데이터 연결 순서는 아래가 적절하다.

1. `companies` 조회
2. `companies` 상세 조회
3. `uploads` 목록 조회
4. `uploads` 생성 + Storage 업로드
5. `pipeline_runs` 생성
6. `pipeline_runs` 목록 조회
7. `pipeline_runs` 상세 조회
8. `reports` 목록 조회

초기 테이블 초안:

- `companies`
- `uploads`
- `pipeline_runs`
- `pipeline_run_steps`
- `reports`
- `artifacts`

1차 worker 파일 초안:

- `workers/run_worker.py`
- `workers/services/run_executor.py`
- `workers/services/report_renderer.py`
- `workers/services/status_updater.py`

실행 방식:

- 처음에는 프론트에서 mock 응답 구조를 먼저 고정
- 그 뒤 Supabase 테이블과 타입을 맞춘다

이 방식이 좋은 이유:

- 백엔드 세부 설계가 늦어도 프론트 작업이 멈추지 않음
- 화면 계약을 먼저 확인 가능
- 나중에 RLS, 인증, 파일 저장을 자연스럽게 확장 가능

## 12. 상태관리 계획

### 전역 상태로 둘 것

- 현재 회사
- 현재 run
- Sidebar 열림 상태
- 전역 필터 최소값

### 서버에서 받아올 것

- 회사 목록
- 업로드 목록
- 최근 run 목록
- run 상세
- reports 목록

### 중요한 약속

- 계산 결과를 프론트에서 다시 만들지 않음
- 상태 색상 매핑 정도만 프론트에서 처리

### 연결 원칙

- 화면에서는 Supabase를 직접 읽되,
  업무 규칙이 복잡해지는 부분은 `src/lib/api` 또는 서버 액션으로 감싼다
- 테이블 타입과 화면 타입은 분리한다
- 서버 액션은 `run 접수` 같은 짧은 작업에만 사용한다
- 무거운 계산과 결과 생성은 worker로 넘긴다

## 13. run 실행 구조

이 프로젝트의 run 실행은 아래 흐름으로 고정한다.

1. 사용자가 웹에서 실행 버튼 클릭
2. Next.js가 Supabase의 `pipeline_runs`에 새 run 생성
3. 새 run 상태는 `pending`
4. Python worker가 `pending` run을 조회
5. worker가 해당 run을 `running`으로 변경
6. worker가 실제 계산, 결과 파일 생성, 보고서 렌더 수행
7. 중간 단계 상태를 `pipeline_run_steps`에 계속 기록
8. 완료 시 `completed` 또는 `failed`로 상태 갱신
9. 웹은 polling으로 상태를 읽어서 사용자에게 보여줌

핵심 역할 분리:

- 웹: 실행 요청, 상태 표시
- Supabase: 상태 저장, 메타 저장
- Python worker: 실제 무거운 일 처리

## 14. 디자인 적용 준비 방식

사용자가 나중에 예시 HTML 디자인 파일을 주면,
그 디자인은 `화면 껍데기 기준`으로 아래 순서로 흡수한다.

### 13.1 먼저 분리할 것

- 레이아웃 구조
- 색상 토큰
- 카드 모양
- 버튼 스타일
- 표/리스트 스타일
- 간격 규칙
- 폰트 규칙

### 13.2 그다음 매핑할 것

- 예시 HTML의 섹션 구조 -> Next.js 페이지 섹션
- 예시 HTML의 반복 블록 -> 재사용 컴포넌트
- 예시 HTML의 상태 표현 -> Badge / Alert / Summary Card

### 13.3 절대 하지 않을 것

- 예시 HTML을 페이지마다 통째로 복붙
- 데이터 구조와 섞어서 하드코딩
- 디자인 때문에 라우트 구조를 망가뜨리기

즉 예시 화면은 `참고 이미지`가 아니라
`디자인 껍데기 설계 원본`으로 받아서
공통 컴포넌트로 쪼개서 반영해야 한다.

## 15. 예시 HTML 디자인 파일이 들어오면 바로 할 작업

1. HTML 파일의 공통 레이아웃 추출
2. 반복 컴포넌트 목록 추출
3. 디자인 토큰 정리
4. App Shell에 1차 반영
5. Workspace / Upload / Pipeline 순으로 적용
6. 이후 Run Detail / Reports / Artifacts로 확장

즉 예시 HTML이 오면
처음부터 다시 만드는 것이 아니라,
이미 만들어둔 스켈레톤 위에 디자인을 입힌다.

## 16. 구현 순서

### 현재 구현 상태와 다음 순서

- 현재 기준으로 `Phase 2. 앱 프레임과 디자인 베이스`까지 완료한 상태로 본다
- 즉 디자인 뼈대와 기본 화면 구조는 이미 준비되어 있다
- 다음 구현은 화면을 더 넓히는 것보다
  설계한 백엔드 로직을 실제 파일로 구현하는 것이 먼저다
- 그 다음에 프론트엔드 화면과 실제 엔진을 연결하면서 붙인다

쉽게 말하면 다음 순서는 아래다.

1. `docs/13_backend_logic_request_prompt.md` 기준으로 백엔드 엔진 파일 구현
2. 정상 raw와 지저분한 raw를 함께 받는 intake / normalization 보강
3. worker / run / result 흐름이 실제로 동작하도록 연결
4. 그 후 프론트엔드에서 실행, 상태 조회, 결과 열람을 실제 엔진과 연결

중요:

- 프론트가 먼저 계산 로직을 흉내 내지 않는다
- 먼저 백엔드 엔진 파일을 만든 뒤 화면과 연결한다
- `docs/13_backend_logic_request_prompt.md`는 설계 기준 문서다
- 이 `task.md`는 실제 구현 순서 문서다

### [x] Phase 1. 기반 고정

목적:

- 개발 시작 전에 기술/구조/문맥을 흔들리지 않게 고정

포함 항목:

- 루트 폴더에서 `pnpm`으로 Next.js 프로젝트 시작
- TypeScript / Tailwind / ESLint / Prettier 설정
- Supabase 클라이언트 및 환경변수 설정
- Python worker 실행 환경 설정
- 기본 폴더 구조 생성
- 라우트 뼈대 생성

완료 기준:

- 다음 Phase에서 바로 코드 작업 가능

### [x] Phase 2. 앱 프레임과 디자인 베이스

목적:

- 전체 앱의 공통 뼈대와 디자인 토큰을 먼저 만든다

포함 항목:

- App Shell
- Sidebar
- Header
- Company Context Bar
- 상태 배지 / 카드 / 스켈레톤 컴포넌트

완료 기준:

- 디자인 뼈대와 기본 화면 구조가 준비됨

### [x] Phase 3. 입력 수용 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 1. 입력 단계 명세`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `01_input_spec`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - 입력 업로드 API
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - sources upload / monthly-upload 흐름
- `docs/summary/intake_column_dictionary_intake_normalization_audit_20260331.md`
  - intake 입력 구조와 컬럼 사전 요약

목적:

- 입력 파일이 `company_key` 기준으로 안정적으로 저장되게 한다

핵심 구현:

- 파일 수신
- 파일 메타 저장
- source 구분
- 회사/run 문맥 연결
- 원본 raw 보관
- 업로드 세션 단위 정리

완료 기준:

- 원본 데이터가 intake 단계로 안정적으로 들어올 수 있음

### [x] Phase 4. 입력 검증 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 2. 입력 검증 규칙`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `02_prevalidation_rules`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - intake / onboarding API
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - intake analyze / result / confirm
- `docs/summary/intake_column_dictionary_intake_normalization_audit_20260331.md`
  - intake 검증, 자동보정, 컬럼 사전 요약

목적:

- 입력을 무조건 막는 것이 아니라, 가능한 한 자동보정해서 정규화 단계로 넘길 수 있는 상태인지 실제로 판정한다

핵심 구현:

- 필수 파일 존재 여부 판정
- 컬럼 사전 / alias 기준 점검
- 후보 컬럼 추정과 자동 매핑 보조
- 타입/형식 sanity check
- 날짜/월 형식 보정 가능 여부 점검
- source별 기간 계산
- 공통 분석 구간 계산
- 자동 수정 가능 항목과 사람 검토 필요 항목 분리
- `_onboarding` 기준 intake 결과 / package / confirmation 저장
- `ready`, `ready_with_fixes`, `needs_review`, `blocked` 판정 생성

주의:

- 이 단계의 목적은 엄격 차단이 아니라 `정규화로 보낼 수 있게 만드는 intake gate`다
- `blocked`는 정말로 다음 단계가 읽을 수 없을 때만 사용한다
- 컬럼 흔들림, 형식 차이, 기간 차이, 일부 누락은 가능하면 자동보정 + 경고 + 검토 요청으로 처리한다
- 이 단계에서 계산을 하지 않는다
- 이 단계는 `_intake_staging` 직전 준비 단계로 본다

완료 기준:

- 어떤 입력이 왜 진행 가능/보정 필요/검토 필요/차단인지 설명 가능
- 정규화 단계가 읽을 수 있는 intake 메타와 설명 결과가 남는다

### [x] Phase 5. 정규화 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 3. 정규화 규칙`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `03_normalization_schema`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - pipeline 실행 전 데이터 기준
- `docs/summary/intake_column_dictionary_intake_normalization_audit_20260331.md`
  - intake와 normalization 연결 요약
- `docs/summary/original_project_normalization_adapter_staging_research_20260331.md`
  - 원본 프로젝트의 adapter / staging / normalization 조사 결과

목적:

- 검증된 raw를 공통 스키마로 바꿔 이후 모듈이 같은 입력 구조를 읽게 한다

핵심 구현:

- raw -> 표준 스키마 adapter 연결
- source별 공통 필드 매핑
- 표준 row 구조 생성
- `_intake_staging` 및 표준 결과 저장

완료 기준:

- KPI 계산 입력 구조가 회사별 차이 없이 통일됨

현재 구현 메모:

- `_intake_staging/{source_key}.json` 생성
- `data/standardized/{company_key}/{module}/standardized_*.json` 생성
- 모듈별 `normalization_report.json` 생성
- 정규화 실행/조회 API 추가

### [ ] Phase 5-1. 지저분한 raw 대응 보강

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 2. 입력 검증 규칙`
  - `Phase 3. 정규화 규칙`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `02_prevalidation_rules`
  - `03_normalization_schema`
- `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`
  - `crm_rules` 입력 기준과 KPI 계산 분리 취지
- `docs/summary/original_project_testing_practice_research_20260331.md`
  - 원본 프로젝트의 자동 테스트 + 실데이터 검증 방식

목적:

- 깔끔하게 정리된 raw만 통과시키는 수준을 넘어서,
  실제 현업의 지저분한 raw도 intake와 normalization 단계에서 최대한 자동보정해서 다음 단계로 넘긴다

핵심 구현:

- 회사별 실제 raw 헤더 흔들림을 alias / dictionary로 보강
- 공백, BOM, 괄호, 구분자 흔들림을 흡수하는 header normalization 강화
- 날짜/월 형식 흔들림 보정
- source별 파일명 / 폴더명 흔들림 보정 규칙 추가
- 중복 행, 비정상 값, 빈 행 처리 규칙 추가
- 자동보정 가능한 항목과 사람 검토가 필요한 항목 분리
- `account_master`, `crm_rules` 같은 운영 필수 source를 공식 입력 기준으로 고정
- 정상 raw 1세트 + 지저분한 raw 1세트 기준 재검증

완료 기준:

- 깔끔한 raw는 `ready` 또는 `completed`
- 지저분한 raw도 가능한 범위에서는 `ready_with_fixes` 또는 `completed_with_review`까지 연결
- 정말 읽을 수 없는 경우만 `blocked`
- `_onboarding`, `_intake_staging`, `standardized_*` 결과가 실제 회사 raw 기준으로 다시 생성됨

현재 바로 해야 하는 세부 작업:

1. `daon_pharma`를 정상 기준 raw 세트로 고정
2. 지저분한 raw 샘플 1세트 추가 확보
3. intake alias / column dictionary / header normalization 보강
4. normalization 단계 값 보정 규칙 추가
5. 정상 raw / 지저분한 raw 각각 재검증
6. 그 다음 `Phase 6`으로 진행

Phase 5-1 체크리스트:

- [ ] 정상 기준 raw를 `daon_pharma`로 고정하고 기준 입력 세트로 유지
- [ ] 지저분한 raw 샘플을 최소 1세트 확보하고 문제 유형을 분류
- [ ] 문제 유형 목록 정리
  - 컬럼명 흔들림
  - 날짜 형식 섞임
  - 월 형식 섞임
  - 시트 이름 차이
  - 필수 컬럼 일부 누락
  - 같은 뜻 다른 이름
  - 중복 행
  - 공백 / BOM / 괄호 / 특수문자 흔들림
- [ ] intake용 `fixers` 계층 분리
- [ ] 컬럼명 정리 규칙 함수화
- [ ] 날짜 정리 규칙 함수화
- [ ] 월 값 정리 규칙 함수화
- [ ] 중복 행 제거 규칙 함수화
- [ ] 빈 문자열 / 공백값 정리 규칙 추가
- [ ] 자동 수정 내역을 source별 fix 기록으로 남기기
- [ ] `rules / alias` 레이어 강화
- [ ] source별 필수 의미 컬럼 재정리
- [ ] `account_master` 규칙 추가/보강
- [ ] `crm_rules` 규칙 추가/보강
- [ ] 실제 회사 raw 기준 alias 확장
- [ ] 필수 항목과 있으면 좋은 항목 구분
- [ ] `candidate suggestion` 레이어 구현
- [ ] 100% 확정 못한 컬럼은 후보 1~3개 추천
- [ ] 후보가 있으면 즉시 차단하지 않고 안내 문구로 남기기
- [ ] 후보도 없으면 `needs_review`로 올리기
- [ ] 사용자 화면에서 이해할 수 있는 쉬운 설명 문장으로 반환
- [ ] `execution-ready canonical column` 자동 생성 계층 구현
- [ ] adapter가 기대하는 실행용 컬럼명을 intake에서 자동 추가
- [ ] 원본 컬럼은 지우지 않고 유지
- [ ] 자동 생성된 컬럼도 fix 기록에 남기기
- [ ] source별 canonical map 관리 구조 만들기
- [ ] 운영 필수 source 보강 로직 구현
- [ ] `crm_account_assignment`가 약할 때 다른 source로 실행용 보강
- [ ] `crm_rep_master`가 약할 때 assignment 기반 실행용 보강
- [ ] `account_master`를 지점/인원 기준 source로 활용
- [ ] 보강 성공 시 `ready_with_fixes`, 실패 시 `needs_review`로 분기
- [ ] `_intake_staging`을 공식 adapter 입력으로 고정
- [ ] `_onboarding`에 source별 결과 json 저장
- [ ] intake latest snapshot 저장
- [ ] 확정된 매핑을 registry로 저장
- [ ] 저장된 매핑 재사용 흐름 추가
- [ ] intake 판정 기준을 명확히 고정
- [ ] `ready`
- [ ] `ready_with_fixes`
- [ ] `needs_review`
- [ ] `blocked`
- [ ] 위 네 상태를 코드와 화면 문구에서 같은 의미로 사용
- [ ] 테스트 세트 추가
- [ ] 정상 raw 통과 테스트
- [ ] 지저분한 컬럼명 자동 매핑 테스트
- [ ] 날짜 / 월 자동 보정 테스트
- [ ] 후보 추천은 뜨지만 실행은 가능한 테스트
- [ ] 필수 정보 부족 시 `needs_review` 테스트
- [ ] source 부재 시 `blocked` 테스트
- [ ] `_intake_staging` 생성 테스트
- [ ] 실사용 검증 순서 고정
- [ ] dirty raw 샘플 투입
- [ ] intake 실행
- [ ] 판정 확인
- [ ] `_intake_staging` 생성 확인
- [ ] normalization 재실행
- [ ] 표준화 결과 확인
- [ ] 자동 처리 / 사람 검토 분기 결과 문서화

Phase 5-1 월별 raw 병합 체크리스트:

구현 시 먼저 볼 설계 문서:

- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - 입력 저장 경로
  - `_intake_staging`
  - `_onboarding`
  - `data/standardized`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - source upload
  - monthly upload
  - intake / normalization API
- `docs/summary/original_project_raw_merge_generation_pipeline_research_20260331.md`
  - 원본 프로젝트의 raw 생성 / 월별 병합 / 실행 파이프라인 조사 결과
- `docs/summary/original_project_dirty_raw_intake_normalization_research_20260331.md`
  - 원본 프로젝트의 intake / staging / dirty raw 처리 조사 결과
- `docs/summary/original_project_normalization_adapter_staging_research_20260331.md`
  - 원본 프로젝트의 normalize / adapter / staging 조사 결과

단계별로 볼 문서 기준:

1. 월별 입력 경로 / 파일명 / 저장 위치를 고정할 때
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`

2. 원본의 월별 병합 흐름을 따라 구현할 때
- `docs/summary/original_project_raw_merge_generation_pipeline_research_20260331.md`

3. 병합 후 intake와 `_intake_staging` 연결 방식을 맞출 때
- `docs/summary/original_project_dirty_raw_intake_normalization_research_20260331.md`

4. 병합 후 normalization 연결 방식을 맞출 때
- `docs/summary/original_project_normalization_adapter_staging_research_20260331.md`

5. 실제 검증 절차와 테스트 기준을 잡을 때
- `docs/summary/original_project_testing_practice_research_20260331.md`

- [ ] 원본 프로젝트의 월별 병합 흐름을 현재 프로젝트 기준으로 다시 고정
- [ ] 공식 월별 입력 경로를 `data/company_source/{company_key}/monthly_raw/YYYYMM/`로 고정
- [ ] 월 폴더명은 `YYYYMM`만 허용하도록 점검 규칙 추가
- [ ] 월별 병합 대상 source를 공식화
- [ ] `crm_activity`
- [ ] `sales`
- [ ] `target`
- [ ] `prescription`
- [ ] 월별 파일명 규칙 고정
- [ ] `crm_activity_raw.xlsx`
- [ ] `sales_raw.xlsx`
- [ ] `target_raw.xlsx`
- [ ] `prescription_raw.csv` 또는 현재 프로젝트 표준명 기준으로 일관되게 정리
- [ ] 월별 raw 탐지 함수 구현
- [ ] 회사별 `monthly_raw` 존재 여부 확인
- [ ] 월 목록 수집
- [ ] source별 실제 존재 파일 수집
- [ ] 어떤 source가 몇 개월치 들어왔는지 요약 생성
- [ ] 월별 병합 엔진 구현
- [ ] source별 파일 읽기
- [ ] 월 순서 기준 정렬
- [ ] 세로 병합
- [ ] 병합 결과를 공식 raw 경로에 다시 저장
- [ ] 업로드로 직접 들어온 파일이 있으면 월별 병합보다 우선할지 규칙 고정
- [ ] 병합 결과 요약 메타 저장
- [ ] 병합에 사용한 월 목록 저장
- [ ] source별 병합 행 수 저장
- [ ] 월별 합계와 병합 결과 합계 비교 기록
- [ ] intake 실행 전에 월별 병합이 먼저 돌도록 순서 고정
- [ ] 흐름을 `monthly_raw -> merged raw -> intake -> _intake_staging -> normalization`으로 고정
- [ ] 병합 결과도 `_onboarding` 또는 별도 메타 파일에 남기기
- [ ] `monthly_merge_pharma`를 월별 병합 기준 테스트 회사로 고정
- [ ] `monthly_merge_pharma` 폴더 구조 점검 자동화
- [ ] 병합 후 merged raw가 기대 경로에 생성되는지 확인
- [ ] 병합 후 intake가 `ready` 또는 `ready_with_fixes`까지 가는지 확인
- [ ] 병합 후 normalization이 실제로 완료되는지 확인
- [ ] 월별 병합 테스트 세트 추가
- [ ] 월 폴더가 일부 빠진 경우 테스트
- [ ] 일부 source만 월별 파일이 있는 경우 테스트
- [ ] 파일명은 맞지만 형식이 잘못된 경우 테스트
- [ ] 월별 합계와 merged 결과 행 수가 맞는지 테스트
- [ ] 병합 후 표준화 결과가 생성되는지 테스트
- [ ] `monthly_merge_pharma` 실데이터 기준 검증 절차 문서화
- [ ] raw 생성기 전체 이식은 후순위로 두고, 월별 병합 엔진 이식이 먼저라는 우선순위 명시

### [ ] Phase 6. KPI 계산과 Result Asset Base 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 4. 모듈 역할과 입출력`
  - `Phase 5. KPI 계산 상세`
  - `Phase 7. result asset / payload 구조`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `04_module_responsibility_and_io`
  - `05_kpi_module_io`
  - `07_result_asset_payload_spec`
- `docs/backend_architecture/CRM_KPI_FORMULA_SPEC.md`
  - CRM 11개 지표 계산 규칙
- `docs/summary/kpi_module_research_20260331.md`
  - KPI 모듈 조사 요약
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - 원본 프로젝트 result asset 구조 조사 요약

목적:

- 공식 KPI 계산과 모듈별 result asset 생성 흐름을 실제 파일로 만든다

핵심 구현:

- `modules/kpi/*` 엔진 연결
- `crm / sandbox / territory / prescription / radar` 결과 흐름 정리
- 모듈별 result asset 초안 생성
- 재계산 없이 다음 단계가 소비할 수 있게 구조화

완료 기준:

- 공식 KPI 엔진과 result asset 생성 흐름이 실제로 동작함

### [ ] Phase 7. validation 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 6. validation 규칙`
  - `Phase 7. result asset / payload 구조`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `06_validation_rules`
  - `07_result_asset_payload_spec`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - validation summary 구조
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - validation / module result API
- `docs/summary/original_project_validation_layer_research_20260331.md`
  - 원본 프로젝트 validation layer 조사 요약
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - validation 입력/출력과 result asset 연결 요약

목적:

- 계산 결과를 다음 단계로 넘길지 실제로 판단한다

핵심 구현:

- `modules/validation/*` 연결
- 품질 검증
- 매핑 검증
- 전달 가능 여부 판단
- WARN / FAIL reason 생성
- 단계별 판정 기록

완료 기준:

- WARN/FAIL 이유와 근거가 실제 validation 결과에서 옴

### [ ] Phase 8. payload 조립 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 7. result asset / payload 구조`
  - `Phase 8. Builder 주입 명세`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `07_result_asset_payload_spec`
  - `08_builder_template_mapping`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - builder / report API
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - result asset / payload / artifact 조사 요약
- `docs/summary/original_project_builder_operation_research_20260331.md`
  - builder 입력 계약과 템플릿 연결 조사 요약

목적:

- Builder가 raw나 KPI 엔진이 아니라 payload만 읽게 만든다

핵심 구현:

- validation 통과 결과 조합
- Builder 입력용 payload 생성
- 보고서별 payload 분기
- artifact / report 메타 연결

완료 기준:

- Builder 입력 구조가 고정됨

### [ ] Phase 9. Builder 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 7. result asset / payload 구조`
  - `Phase 8. Builder 주입 명세`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - `08_builder_template_mapping`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - builder / report API
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - builder reports / render / artifacts
- `docs/summary/original_project_builder_operation_research_20260331.md`
  - 원본 프로젝트 builder 운영 조사 요약
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - builder 산출물 / artifact 구조 요약

목적:

- 검증이 끝난 payload를 읽어 최종 보고서와 결과물을 만든다

핵심 구현:

- HTML/PDF 보고서 렌더
- 최종 전달물 생성
- report context / artifacts index 저장

완료 기준:

- 실제 Builder 결과물이 생성됨

### [ ] Phase 10. Worker Runtime 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 1 ~ Phase 8 전체`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - 전체 운영 로직 흐름
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - pipeline 실행 / run / validation / builder API
- `docs/backend_architecture/SALES_DATA_OS_PLANNER_SUMMARY.md`
  - 전체 흐름 요약
- `docs/summary/original_project_worker_runtime_research_20260331.md`
  - 원본 프로젝트 worker runtime 조사 요약
- `docs/summary/original_project_validation_layer_research_20260331.md`
  - worker와 validation 연결 요약
- `docs/summary/original_project_builder_operation_research_20260331.md`
  - worker와 builder 연결 요약

목적:

- 입력부터 payload 생성까지를 worker가 하나의 실행 흐름으로 묶어 처리하게 만든다

핵심 구현:

- `workers/run_worker.py`
- `workers/services/run_executor.py`
- `workers/services/status_updater.py`
- Supabase polling
- `pending -> running -> completed/failed`
- 중간 step 상태 저장

완료 기준:

- 웹에서 run을 만들면 worker가 실제 엔진 순서를 실행함

### [ ] Phase 11. 운영 진입 화면 연결

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 1. 입력 단계 명세`
  - `Phase 2. 입력 검증 규칙`
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - 회사 선택 / 업로드 / intake / pipeline 호출 흐름
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - companies / sources / intake / pipeline API
- `docs/summary/intake_column_dictionary_intake_normalization_audit_20260331.md`
  - 업로드 / intake 결과를 화면에 붙일 때 참고할 요약

목적:

- 이미 만든 디자인 뼈대에 실제 입력/실행 흐름을 붙인다

포함 화면:

- `Workspace`
- `Upload`
- `Pipeline`

핵심 구현:

- 회사 문맥 표시
- 업로드 상태 표시
- intake 설명 연결
- 실행 가능/불가 사유 연결
- 실행 모드 선택
- run 시작 진입점 연결

완료 기준:

- 회사 선택 -> 업로드 확인 -> 실행 진입 흐름이 실제 데이터와 연결됨

### [ ] Phase 12. 실행 추적과 결과 해석 화면 연결

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 6. validation 규칙`
  - `Phase 7. result asset / payload 구조`
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - validation summary / runs / run artifacts
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - validation summary 구조
- `docs/summary/original_project_validation_layer_research_20260331.md`
  - validation summary / evidence 구조 요약
- `docs/summary/original_project_worker_runtime_research_20260331.md`
  - run step / pipeline summary 구조 요약

목적:

- 사용자가 특정 run의 상태와 이유를 실제 데이터로 읽을 수 있게 한다

포함 화면:

- `Run Detail`

핵심 구현:

- run selector / switcher
- 단계별 상태
- WARN/FAIL 설명 문장
- 근거 수치 / evidence 영역

완료 기준:

- 사용자가 특정 run을 열고 실제 결과를 이해할 수 있음

### [ ] Phase 13. 결과물 탐색 화면 연결

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 7. result asset / payload 구조`
  - `Phase 8. Builder 주입 명세`
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - builder reports / artifacts
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - builder / report API
- `docs/summary/original_project_builder_operation_research_20260331.md`
  - 보고서 / artifacts / preview 구조 요약
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - artifact / report context 구조 요약

목적:

- 최종 보고서와 산출물을 실제 결과와 연결한다

포함 화면:

- `Reports`
- `Artifacts`

핵심 구현:

- 보고서 카드
- 열기 / 다운로드
- 관련 run 연결
- artifact 메타 목록

완료 기준:

- run 결과에서 실제 보고서와 산출물로 이동 가능

### [ ] Phase 14. 데이터 연결 정리

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 1 ~ Phase 8 전체`
- `docs/backend_architecture/SALES_DATA_OS_WEB_BACKEND_API_SPEC.md`
  - 주요 요청/응답 구조
- `docs/backend_architecture/SALES_DATA_OS_FRONTEND_API_TABLE.md`
  - 프론트가 바로 써야 하는 상태값 표
- `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`
  - run / artifact / payload 데이터 계약 요약
- `docs/summary/original_project_worker_runtime_research_20260331.md`
  - run 상태 저장과 worker 흐름 요약

목적:

- 화면 전반을 mock이 아니라 실제 Supabase 데이터 흐름으로 맞춘다

포함 항목:

- `companies`
- `uploads`
- `pipeline_runs`
- `pipeline_run_steps`
- `reports`
- `artifacts`

완료 기준:

- 주요 페이지가 실제 데이터로 동작

### [ ] Phase 15. RADAR 구현

구현 시 먼저 볼 설계 문서:

- `docs/13_backend_logic_request_prompt.md`
  - `Phase 4. 모듈 역할과 입출력`
  - `Phase 6. validation 규칙`
  - `Phase 7. result asset / payload 구조`
- `docs/backend_architecture/SALES_DATA_OS_BACKEND_LOGIC_SPEC.md`
  - RADAR 관련 구간
- `docs/backend_architecture/SALES_DATA_OS_PLANNER_SUMMARY.md`
  - RADAR 역할 요약
- `docs/summary/kpi_module_research_20260331.md`
  - KPI 모듈과 RADAR 입력 관계 요약
- `docs/summary/original_project_validation_layer_research_20260331.md`
  - validation 이후 전달 구조 요약

목적:

- validation 통과 결과 위에서 신호와 우선순위를 만든다

핵심 구현:

- signal detection
- issue prioritization
- decision option 템플릿화

완료 기준:

- 추가 인사이트를 생성할 수 있음

### [ ] Phase 16. 보조 기능 확장

목적:

- 핵심 흐름 이후 필요한 관리 기능과 시각 보강을 붙인다

포함 항목:

- 예시 HTML 기반 스타일 정교화
- `Admin`
- Artifacts/Admin 확장

완료 기준:

- 핵심 운영 흐름 밖의 관리 기능까지 제품 형태를 갖춤

### [ ] Phase 17. Agent 구현

목적:

- run, artifact, report 문맥 위에서 해석 보조 기능을 붙인다

핵심 구현:

- run 기준 질문/응답
- 근거 artifact 연결
- report / artifact / run 문맥 기반 응답
- 운영 해석 보조 UX

완료 기준:

- 사용자가 특정 run 기준으로 질문하고 근거와 함께 해석을 받을 수 있음

### [ ] Phase 18. 운영 안정화

목적:

- 실제 계속 사용할 수 있는 품질로 다듬는다

포함 항목:

- 에러 처리
- 로딩 상태
- 테스트
- 로그 / 모니터링
- 필요 시 인증/권한 확장 준비

완료 기준:

- 운영 중 깨지기 쉬운 구간이 줄어들고 유지보수 가능한 상태가 됨

## 16-1. Python 라이브러리 설치 시점

Python 관련 라이브러리는
`마지막에 한 번에`가 아니라
`Phase 3` 착수 시점부터 같이 들어가야 한다.

이유:

- intake / KPI / validation / builder가 전부 Python 실행 자산과 연결되기 때문
- worker 파일만 만들고 라이브러리를 나중에 넣으면 실제 실행 검증이 늦어진다

권장 시점:

1. `Phase 3` 시작할 때 Python 가상환경/패키지 기준 확정
2. `Phase 4` 들어가기 전에 KPI/데이터 처리 관련 패키지 설치
3. `Phase 9` 직전에 보고서 렌더 관련 패키지 설치 또는 정리

즉,
`화면은 가볍게 먼저 만들 수 있어도`
`Python 의존성은 백엔드 구현 초반부터 같이 관리`
하는 것이 맞다.

## 17. 작업 단위 분해

개발자는 아래 단위로 쪼개면 바로 작업하기 쉽다.

### 작업 묶음 1. 프로젝트 시작

- 루트 폴더에서 `pnpm` 초기 세팅
- Next.js 초기 세팅
- Tailwind 설정
- Supabase 프로젝트 연결 준비
- Python worker 실행 환경 준비
- 기본 레이아웃 확인

### 작업 묶음 2. 공통 기반

- 라우트 생성
- 공통 UI 컴포넌트
- 상태 색상/문구 상수
- Supabase 클라이언트 기본 구조
- API 래퍼 기본 구조

### 작업 묶음 3. 백엔드 구현 Phase 우선

- input intake 데이터 계약
- pre-validation 결과 구조
- normalization schema
- KPI engine 입출력 구조
- validation 결과 구조
- builder payload contract
- run step 상태 모델

### 작업 묶음 4. 회사 문맥

- 회사 목록 Supabase 연결
- 회사 선택기
- 현재 회사 store

### 작업 묶음 5. Upload + Intake 연결

- 업로드 UI
- 업로드 목록 UI
- Supabase Storage 업로드 연결
- input intake 연결
- pre-validation 상태 매핑
- intake 설명 UI
- 기간 차이 안내 UI

### 작업 묶음 6. Pipeline + 백엔드 접수

- 모드 선택 UI
- run 생성
- polling
- 현재 run 카드
- 실행 가능/불가 사유 문장

### 작업 묶음 7. Worker Orchestration

- `pending` run 조회
- `running` 상태 전환
- input -> 검증 -> 정규화 -> KPI -> validation -> payload 순서 실행
- 단계 상태 기록
- 완료/실패 업데이트

### 작업 묶음 8. Results

- run 상세
- run selector / run switcher
- reports 카드
- WARN/FAIL 근거 설명 표시

## 18. 리스크와 대응

### 리스크 1. 디자인 파일이 늦게 오는 경우

대응:

- 기능 스켈레톤부터 완성
- 디자인은 토큰/컴포넌트 교체 방식으로 흡수

### 리스크 2. API 응답이 바뀌는 경우

대응:

- feature별 mapper 분리
- 화면 타입과 API 타입 분리
- Supabase row 타입과 view model 분리

### 리스크 3. 프론트가 계산 로직을 가져오려는 유혹

대응:

- 계산 금지 원칙 고정
- 프론트는 표시용 가공만 허용

### 리스크 4. 서버 액션에 무거운 실행을 몰아넣는 경우

대응:

- 서버 액션은 접수 역할만 담당
- 실제 실행은 Python worker로 고정
- run 상태는 Supabase 기준으로 추적

### 리스크 5. 업로드/저장/실행준비 상태가 섞이는 경우

대응:

- 상태 이름을 명확히 분리
- Upload 화면과 Pipeline 화면 책임을 분리

### 리스크 6. 웹이 단순 업로드/조회 도구로 축소되는 경우

대응:

- intake 설명과 운영 메시지를 반드시 포함
- 상태 배지 옆 설명 문장을 기본 정책으로 고정
- run 상세에서 근거 수치까지 함께 노출

## 19. 완료 기준

아래가 되면 1차 시작 준비가 끝난 것이다.

- 새 웹 프로젝트를 바로 생성할 수 있다.
- 새 폴더 없이 현재 루트에서 바로 시작할 수 있다.
- 어떤 폴더와 어떤 화면부터 만들지 분명하다.
- Supabase 연결 순서가 정리되어 있다.
- Python polling worker 구조가 확정되어 있다.
- 이 웹이 단순 화면이 아니라 운영 체계의 웹 전환이라는 점이 계획서에 반영되어 있다.
- 예시 HTML 디자인 파일이 오면 어디에 반영할지 정해져 있다.
- 기능과 디자인이 서로 꼬이지 않게 시작할 수 있다.

## 20. 다음 액션

가장 바로 이어서 해야 할 일은 아래다.

1. `Phase 1~3` 기준 백엔드 데이터 계약 먼저 고정
2. input intake / pre-validation / normalization 경계 정의
3. KPI engine 입력 구조와 result asset 초안 정의
4. validation 출력 구조와 run step 상태 모델 정의
5. builder payload contract 정의
6. 그 다음 Supabase 테이블과 Python worker 구조를 맞춤

이 순서로 가면
`기본 화면만 있는 상태`에서 `실제 Sales Data OS 백엔드가 설계된 상태`로 넘어갈 수 있다.
