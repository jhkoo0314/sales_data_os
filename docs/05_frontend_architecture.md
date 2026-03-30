# 05. Frontend Architecture

작성일: 2026-03-30  
상태: `draft`

## 1. 문서 목적

이 문서는 새 웹 프로젝트의 프론트엔드 구조를 정리한다.

쉽게 말하면 아래를 정한다.

- 폴더를 어떻게 나눌지
- 공통 UI와 업무 기능을 어떻게 나눌지
- 상태를 어디서 관리할지
- API 호출은 어디에 둘지

## 2. 핵심 원칙

### 2.1 기능 단위 분리

프론트 코드는 화면별이 아니라
기능별로도 관리할 수 있어야 한다.

예:

- upload
- pipeline
- runs
- reports
- agent

### 2.2 공통 UI와 업무 로직 분리

- 버튼, 배지, 카드 같은 것은 공통 UI
- 업로드 흐름, run 상태 조회 같은 것은 업무 기능

이 둘을 섞지 않는다.

### 2.3 API와 화면 분리

컴포넌트 안에서 fetch를 여기저기 직접 호출하지 않는다.
API 클라이언트와 화면 렌더링은 분리한다.

### 2.4 전역 문맥 최소화

전역 상태는 꼭 필요한 것만 둔다.

예:

- 현재 회사
- 현재 run
- 전역 필터

### 2.5 프론트 계산 금지

프론트는 KPI 계산이나 validation 판단을 재구현하지 않는다.

## 3. 추천 폴더 구조

```text
/
  app/
    workspace/
    admin/
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
      runs/
      artifacts/
      reports/
      agent/
    lib/
      api/
      supabase/
      format/
      utils/
      constants/
    hooks/
    stores/
    types/
    styles/
```

## 4. 폴더별 역할

## 4.1 `app/`

이 폴더는 Next.js의 라우팅 진입점이다.

역할:

- 페이지 라우트
- 레이아웃
- 서버 컴포넌트 진입
- 페이지 단위 조립

여기에는 너무 많은 업무 로직을 넣지 않는다.

## 4.2 `src/components/ui/`

공통 UI 컴포넌트 위치다.

예:

- Button
- Input
- Select
- Badge
- Card
- Dialog
- Tabs
- Table
- Skeleton

## 4.3 `src/components/layout/`

공통 레이아웃 요소 위치다.

예:

- App Shell
- Sidebar
- Header
- Page Title
- Company Context Bar

## 4.4 `src/components/feedback/`

상태 피드백 UI를 둔다.

예:

- Empty State
- Error State
- Loading State
- Status Summary

## 4.5 `src/features/`

업무 기능 단위 폴더다.

예:

- `companies`
- `upload`
- `pipeline`
- `runs`
- `artifacts`
- `reports`
- `agent`

각 feature 안에는 아래가 들어갈 수 있다.

- components
- hooks
- api
- mappers
- types

## 4.6 `src/lib/api/`

Supabase 조회 래퍼와 업무 요청 관련 공통 코드 위치다.

예:

- base client
- request helper
- response parser
- error mapper

## 4.6-1 `src/lib/supabase/`

Supabase 클라이언트와 환경설정 코드 위치다.

예:

- browser client
- server client
- typed query helper

## 4.7 `src/lib/format/`

표시용 포맷 함수 위치다.

예:

- 날짜 포맷
- 숫자 포맷
- 점수 포맷
- 파일 크기 포맷

## 4.8 `src/lib/utils/`

공통 유틸 위치다.

예:

- null-safe helper
- 배열 정렬
- 문자열 정리

## 4.9 `src/stores/`

전역 상태 위치다.

예:

- 현재 회사 store
- 현재 run store
- UI filter store

## 4.10 `src/types/`

공통 타입 정의 위치다.

예:

- Company
- Run
- Artifact
- Report
- Agent Response

## 5. 라우트 구조 제안

```text
/workspace
/workspace/[companyKey]
/workspace/[companyKey]/upload
/workspace/[companyKey]/pipeline
/workspace/[companyKey]/runs
/workspace/[companyKey]/runs/[runId]
/workspace/[companyKey]/artifacts
/workspace/[companyKey]/reports
/workspace/[companyKey]/agent
/admin/companies
```

## 6. 상태관리 전략

## 6.1 전역 상태

전역 상태는 `Zustand`를 사용한다.

추천 전역 상태:

- `currentCompany`
- `currentRun`
- `sidebarExpanded`
- `globalFilters`

전역 상태에 넣지 말 것:

- run 목록 전체
- report 목록 전체
- artifact 상세 데이터

이런 것은 서버 상태로 다루는 편이 맞다.

## 6.2 서버 상태

Supabase에서 읽는 데이터는 `TanStack Query`로 관리한다.

예:

- 회사 목록
- run 목록
- run 상세
- pipeline 상태 polling
- artifact 목록
- report 목록

## 6.3 파생 상태

서버 응답을 그대로 UI에 쓰지 않고,
화면에 맞는 파생 상태를 만들어도 된다.

단, 이 파생 상태는
`표시용 정리`까지만 해야 한다.

예:

- 배지 색상 매핑
- 설명 문장 표시 순서
- 정렬 기준 정리

## 7. 페이지 조립 원칙

각 페이지는 가능하면 아래 순서를 따른다.

1. 상단 문맥 영역
2. 요약 카드
3. 상태/리스트
4. 상세 패널
5. 액션 영역

예를 들어 run 상세 페이지는 아래 흐름이 적합하다.

1. run 기본 정보
2. 전체 상태 요약
3. 단계별 결과
4. artifact/보고서 링크
5. 다음 액션

## 8. feature 구조 예시

예를 들어 `runs` feature는 이렇게 갈 수 있다.

```text
src/features/runs/
  api/
    get-runs.ts
    get-run-detail.ts
  components/
    run-list.tsx
    run-status-card.tsx
    run-step-list.tsx
  hooks/
    use-runs.ts
    use-run-detail.ts
  mappers/
    run-view-model.ts
  types/
    run-types.ts
```

이 구조의 장점은
한 기능의 관련 코드가 한곳에 모인다는 점이다.

## 9. 컴포넌트 설계 원칙

### 9.1 작은 공통 컴포넌트

- Button
- Badge
- Card
- EmptyState

### 9.2 화면용 조립 컴포넌트

- UploadSummaryCard
- PipelineRunPanel
- RunStepStatusList
- ReportGrid

### 9.3 feature 전용 컴포넌트

특정 업무에서만 쓰는 UI는 feature 안에 둔다.

## 10. 데이터 매핑 원칙

API 응답을 그대로 화면에 뿌리지 않는다.
필요하면 view model로 한 번 정리한다.

예:

- status 코드 -> 배지 속성
- timestamps -> 보기 쉬운 날짜
- score -> 표시용 문자열

단, 이 과정에서도 계산 로직을 만들지는 않는다.

## 11. 에러 처리 원칙

- 에러 상태는 공통 컴포넌트로 표현
- 재시도 버튼 제공
- 기술 문장과 일반 문장을 분리
- “무엇을 하면 되는지” 액션도 함께 제공

## 12. 로딩 처리 원칙

- 초기 전체 로딩
- 리스트 로딩
- 버튼 액션 로딩
- polling 중 갱신 상태

이 네 가지를 구분해 표현한다.

## 13. 프론트에서 하지 않을 것

- KPI 계산
- validation 판정 로직 재구현
- Builder payload 생성
- company_key 무시한 경로 처리
- Python run storage 구조를 임의로 재해석

## 14. 추천 구현 순서

1. App Shell
2. Company Context
3. Upload feature
4. Pipeline feature
5. Runs feature
6. Reports feature
7. Artifacts feature
8. Agent feature

## 15. 체크리스트

- 공통 UI와 feature 코드가 분리됐는가
- 전역 상태가 과도하게 커지지 않았는가
- API 호출이 컴포넌트에 박혀 있지 않은가
- Supabase 접근이 공통 레이어 없이 흩어지지 않았는가
- 프론트가 계산기를 흉내내지 않는가
