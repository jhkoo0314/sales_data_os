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

### [x] Phase A. 기반 고정

- 루트 폴더에서 `pnpm`으로 Next.js 프로젝트 시작
- TypeScript / Tailwind / ESLint / Prettier 설정
- Supabase 클라이언트 및 환경변수 설정
- Python worker 실행 환경 설정
- 기본 폴더 구조 생성
- 라우트 뼈대 생성

### [x] Phase B. 앱 프레임과 디자인 베이스

- App Shell
- Sidebar
- Header
- Company Context Bar
- 상태 배지 / 카드 / 스켈레톤 컴포넌트

### [ ] Phase C. 운영 진입 흐름

- Company Switcher
- Upload
- Pipeline
- Reports

이 단계에서 중요한 것은
단순 빈 카드 배치가 아니라
운영 설명과 판단 문장이 들어갈 자리까지 같이 만드는 것이다.

### [ ] Phase D. 실행 추적과 결과 해석

- Run Detail
- run selector / run switcher
- 단계별 상태
- WARN/FAIL 설명 문장
- 근거 수치 / evidence 영역

### [ ] Phase E. 최종 결과물 탐색

- Reports
- Artifacts
- 보고서 / 산출물 연결

### [ ] Phase F. 데이터 연결

- companies
- uploads + storage
- pipeline runs
- reports
- Supabase 타입 연결

### [ ] Phase G. 실행 엔진 연결

- Python polling worker
- run step 상태 기록
- worker 상태 전환
- 결과 메타 저장

### [ ] Phase H. 보조 기능 확장

- 예시 HTML 기반 스타일 정교화
- Artifacts / Admin 확장

### [ ] Phase I. Agent 구현

- run 기준 질문/응답 화면
- 근거 artifact 연결
- 대화 흐름 설계
- 결과 해석 보조 UX

### [ ] Phase J. 운영 안정화

- 에러/로딩/테스트 정리
- 운영 품질 정리

## 16-1. Phase별 구현 계획 한눈에 보기

아래 표처럼 보면
`어떤 페이지를 언제 만들고`
`어떤 것은 지금 꼭 필요하고`
`어떤 것은 나중으로 미뤄도 되는지`
를 빠르게 판단할 수 있다.

### [x] Phase A. 기반 고정

목적:

- 개발 시작 전에 기술/구조/문맥을 흔들리지 않게 고정

포함 항목:

- 문서 동기화
- 디자인 방향 확정
- 루트 기준 프로젝트 구조 확정
- `Supabase + Python polling worker` 구조 확정

이 단계에서 아직 안 하는 것:

- 실제 업무 화면 완성
- 실제 데이터 연결 완성

완료 기준:

- 다음 Phase에서 바로 코드 작업 가능

### [x] Phase B. 앱 프레임과 디자인 베이스

목적:

- 전체 앱의 공통 뼈대와 디자인 토큰을 먼저 만든다

포함 페이지 / 구조:

- 전역 `App Shell`
- 상단 Navigation / Context Header
- 공통 버튼 / 배지 / 카드 / 패널
- 공통 상태 표현
- 디자인 HTML 기반 공통 레이아웃

이 단계의 성격:

- 페이지 구현 전 공통 뼈대 작업

완료 기준:

- 어느 페이지를 붙여도 같은 제품처럼 보이는 기반이 생김

### [ ] Phase C. 운영 진입 흐름

목적:

- 사용자가 가장 먼저 쓰는 흐름을 웹에서 성립시킨다

포함 페이지:

1. `Workspace`
2. `Upload`
3. `Pipeline`

이 단계에서 구현할 핵심:

- 현재 회사 문맥
- 업로드 상태 표시
- intake 설명
- 실행 가능/불가 사유
- 실행 모드 선택
- run 시작 진입점

왜 먼저 필요한가:

- 이 3개가 없으면 운영자가 웹에서 실제 일을 시작할 수 없음

완료 기준:

- 회사 선택 -> 업로드 확인 -> 실행 진입 흐름이 웹에서 가능
- 현재는 기본 뼈대가 이미 있으므로,
  이 Phase는 신규 화면 생성보다
  백엔드 엔진 연결을 받을 준비 상태로 보는 것이 맞다

### [ ] Phase D. 실행 추적과 결과 해석

목적:

- 실행 후 사용자가 상태와 이유를 읽을 수 있게 한다

포함 페이지:

1. `Run Detail`

이 단계에서 구현할 핵심:

- run selector / run switcher
- 현재/과거 run 구분
- 단계별 상태
- WARN/FAIL 설명 문장
- 근거 수치 / evidence 영역

왜 필요한가:

- Pipeline만 있고 결과 해석 화면이 없으면 운영 제품으로 완결되지 않음

완료 기준:

- 사용자가 특정 run을 열고 무슨 일이 있었는지 이해할 수 있음

### [ ] Phase E. 최종 결과물 탐색

목적:

- 최종 보고서와 산출물을 쉽게 찾게 한다

포함 페이지:

1. `Reports`
2. `Artifacts`

이 단계에서 구현할 핵심:

- 보고서 카드
- 열기 / 다운로드
- 관련 run 연결
- artifact 메타 목록

왜 필요한가:

- 최종 결과를 전달하는 운영 경험이 완성됨

완료 기준:

- run 결과에서 실제 보고서와 산출물로 자연스럽게 이동 가능

### [ ] Phase F. 데이터 연결

목적:

- mock 기반 화면을 실제 데이터 흐름에 연결한다

포함 항목:

- `companies`
- `uploads`
- `pipeline_runs`
- `pipeline_run_steps`
- `reports`
- `artifacts`

이 단계의 성격:

- 화면보다 데이터 연결 중심

완료 기준:

- 주요 페이지가 실제 Supabase 데이터로 동작

### [ ] Phase G. 실행 엔진 연결

목적:

- 장기 실행을 실제 worker 구조에 연결한다

포함 항목:

- Python polling worker
- `pending -> running -> completed/failed` 전환
- step 상태 갱신
- 결과 메타 저장

완료 기준:

- 웹에서 실행 시작 후 실제 run이 worker로 처리됨

### [ ] Phase H. 보조 기능 확장

목적:

- 핵심 운영 흐름 이후의 보조 관리 기능을 붙인다

포함 페이지:

1. `Admin`

이 단계에서 구현할 핵심:

- 회사 관리 화면

완료 기준:

- 핵심 운영 흐름 밖의 관리 기능까지 제품 형태를 갖춤

### [ ] Phase I. Agent 구현

목적:

- 지금은 부가기능이지만 장기적으로 핵심축이 될 Agent를 가장 마지막 구현 단계로 붙인다

포함 페이지:

1. `Agent`

이 단계에서 구현할 핵심:

- run 기준 질문/응답
- 근거 artifact 연결
- report / artifact / run 문맥 기반 응답
- 단순 채팅이 아니라 운영 해석 보조 UX

왜 마지막인가:

- Agent는 run, artifact, report, validation 문맥이 먼저 갖춰져야 의미가 있음
- 핵심 운영 흐름이 먼저 안정화되어야 Agent 품질도 맞출 수 있음

완료 기준:

- 사용자가 특정 run 기준으로 질문하고, 근거와 함께 해석을 받을 수 있음

### [ ] Phase J. 운영 안정화

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

## 16-2. 페이지 우선순위 요약

### 지금 바로 필요한 페이지

- `Workspace`
- `Upload`
- `Pipeline`
- `Run Detail`
- `Reports`

### 바로 뒤에 필요한 페이지

- `Artifacts`

### 나중에 붙여도 되는 페이지

- `Admin`

### 가장 마지막 구현 단계에 둘 페이지

- `Agent`

즉 현재 기준으로는
디자인 HTML 4개만으로는 전체 범위가 끝난 것이 아니고,
최소한 `Run Detail`, `Reports`, `Artifacts`까지는 구현 계획 안에 포함되어 있어야 한다.

## 16-3. 백엔드 엔진 구현 Phase

위의 `Phase A~J`는 화면과 제품 작업 순서다.
하지만 이 프로젝트의 본질은 화면보다
`Sales Data OS 엔진`
이기 때문에,
실제 구현은 아래 엔진 Phase를 병행해야 한다.

### 백엔드 공식 흐름

이제부터 백엔드 공식 흐름은 아래 순서로 고정한다.

`입력 -> 검증 -> 정규화 -> KPI 계산 -> Validation -> Result Asset / Payload -> Builder`

주의:

- 여기서 앞단 `검증`은 파일/컬럼/기간/필수값 점검 성격이다
- 뒤쪽 `Validation`은 KPI 계산 이후의 전달 판단 레이어다
- 둘은 이름이 비슷해도 역할이 다르다

### [ ] Engine 1. 입력 수용 / Input Intake

언제:

- 화면 기준 `Phase C`와 동시에 시작

왜 먼저인가:

- Upload 화면이 단순 파일 업로드가 아니라
  `필수 입력 확인`, `자동 수정`, `기간 차이`, `공통 분석 구간`, `진행 가능 여부`
  를 설명해야 하기 때문

핵심 구현:

- 파일 수신
- 파일 메타 저장
- source 구분
- 회사/run 문맥 연결
- 원본(raw) 보관
- 업로드 세션 단위 정리

완료 기준:

- 원본 데이터가 intake 단계로 안정적으로 들어올 수 있음

### [ ] Engine 2. 입력 검증 / Pre-Normalization Validation

언제:

- `Engine 1` 바로 다음

왜 이 시점인가:

- 정규화 전에 먼저 입력이 읽을 수 있는 상태인지 확인해야 하기 때문
- raw를 바로 adapter나 KPI로 넘기면 기준이 흔들릴 수 있음

핵심 구현:

- 필수 파일 존재 여부 판정
- 컬럼 존재 여부 점검
- 타입/형식 sanity check
- 날짜/월 범위 점검
- source별 기간 계산
- 공통 분석 가능 구간 계산
- 자동 수정 가능 항목과 사람 검토 필요 항목 분리
- intake verdict 생성

완료 기준:

- Upload 화면이 실제 intake 판단 결과를 보여줄 수 있음
- 어떤 입력이 왜 진행 가능/불가인지 설명 가능

### [ ] Engine 3. 정규화 / Adapter Layer

언제:

- `Engine 2` 다음

왜 이 시점인가:

- 검증된 raw만 공통 스키마로 바꾸는 것이 안전하기 때문

왜 이 시점인가:

- 정규화가 끝나야 KPI 계산이 모듈 공통 기준으로 들어갈 수 있음

핵심 구현:

- raw -> 표준 스키마 adapter 연결
- source별 공통 필드 매핑
- 표준 row 구조 생성
- 정규화 결과 저장

완료 기준:

- KPI 엔진이 읽는 입력 구조가 회사별 차이 없이 통일됨

### [ ] Engine 4. KPI Engine + Result Asset Base

언제:

- `Engine 3` 다음, `Phase C ~ Phase D`와 병행

왜 이 시점인가:

- KPI는 단일 소스라서 초반부터 기준을 고정해야 함
- 나중에 프론트 임시 계산이나 중복 계산이 들어가면 구조가 무너짐

핵심 구현:

- `modules/kpi/*` 엔진 연결
- 전체 `9개 모듈` 기준 경계 고정
- 겉으로 드러나는 `5개 모듈`
  - `CRM`
  - `Sandbox`
  - `Prescription`
  - `Territory`
  - `RADAR`
  기준으로 결과 흐름 정리
- 내부 엔진 `intake / kpi / validation / builder` 경계 고정
- 계산 결과를 모듈별 Result Asset 초안으로 생성
- 다음 단계가 재계산 없이 소비할 수 있게 구조화

완료 기준:

- 파이프라인 실행 시 공식 KPI 엔진과 Result Asset 생성 흐름이 존재함

### [ ] Engine 5. Validation Layer

언제:

- `Engine 4` 바로 다음, `Phase D`와 강하게 연결

왜 이 시점인가:

- validation은 후처리 부가기능이 아니라
  결과를 다음 단계로 넘길지 판단하는 관문이기 때문

핵심 구현:

- `modules/validation/*` 연결
- 품질 검증
- 매핑 검증
- 전달 가능 여부 판단
- WARN / FAIL reason 생성
- `pipeline_run_steps`에 단계별 판정 기록

완료 기준:

- Run Detail에 표시되는 WARN/FAIL 이유와 근거가 실제 validation 결과에서 옴

### [ ] Engine 6. Result Asset / Payload Assembly

언제:

- `Engine 5` 다음

왜 이 시점인가:

- Builder는 검증 끝난 payload만 읽어야 하기 때문

핵심 구현:

- validation 통과 결과 조합
- Builder 입력용 payload 생성
- 보고서별 payload 분기
- artifact / report 메타 연결

완료 기준:

- Builder가 raw나 KPI 엔진이 아니라 payload만 읽게 됨

### [ ] Engine 7. Intelligence / RADAR

언제:

- `Engine 1~6` 안정화 이후

왜 뒤인가:

- RADAR는 KPI 재계산기가 아니라
  검증 승인된 결과 자산 위에서 신호를 잡는 레이어이기 때문

핵심 구현:

- signal detection
- issue prioritization
- decision option 템플릿화

완료 기준:

- validation 통과 결과를 바탕으로 추가 인사이트를 생성할 수 있음

### [ ] Engine 8. Builder

언제:

- `Engine 6` 이후, `Reports` 완성 직전/직후

왜 마지막인가:

- Builder는 계산 금지
- 이미 만들어진 payload를 읽어 최종 표현만 담당하기 때문

핵심 구현:

- HTML/PDF 보고서 렌더
- 최종 전달물 생성
- Reports 페이지 연결

완료 기준:

- Reports 화면이 실제 Builder 결과물을 열 수 있음

### [ ] Engine 9. Python Worker Runtime

언제:

- `Engine 1~6`과 병행해서 조기 시작

왜 조기 시작인가:

- 입력, 검증, 정규화, KPI, validation, payload 생성을 결국 worker가 묶어서 실행해야 하기 때문

핵심 구현:

- `workers/run_worker.py`
- `workers/services/run_executor.py`
- `workers/services/status_updater.py`
- 필요 라이브러리 설치
- Supabase polling
- `pending -> running -> completed/failed`
- 중간 step 상태 저장

완료 기준:

- 웹에서 run을 만들면 Python worker가 실제 엔진 순서를 실행함

## 16-4. Python 라이브러리 설치 시점

Python 관련 라이브러리는
`마지막에 한 번에`가 아니라
`Engine 1` 착수 시점부터 같이 들어가야 한다.

이유:

- intake / KPI / validation / builder가 전부 Python 실행 자산과 연결되기 때문
- worker 파일만 만들고 라이브러리를 나중에 넣으면 실제 실행 검증이 늦어진다

권장 시점:

1. `Engine 1` 시작할 때 Python 가상환경/패키지 기준 확정
2. `Engine 2` 들어가기 전에 KPI/데이터 처리 관련 패키지 설치
3. `Engine 5` 직전에 보고서 렌더 관련 패키지 설치 또는 정리

즉,
`화면은 가볍게 먼저 만들 수 있어도`
`Python 의존성은 초반부터 같이 관리`
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

### 작업 묶음 3. 백엔드 엔진 설계 우선

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

### 작업 묶음 6. Pipeline + 엔진 접수

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

1. `Engine 1~3` 기준 백엔드 데이터 계약 먼저 고정
2. input intake / pre-validation / normalization 경계 정의
3. KPI engine 입력 구조와 result asset 초안 정의
4. validation 출력 구조와 run step 상태 모델 정의
5. builder payload contract 정의
6. 그 다음 Supabase 테이블과 Python worker 구조를 맞춤

이 순서로 가면
`기본 화면만 있는 상태`에서 `실제 Sales Data OS 백엔드가 설계된 상태`로 넘어갈 수 있다.
