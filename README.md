# Sales Data OS Web

현재 이 저장소는 `Sales Data OS` 웹 앱을 루트에서 바로 개발하기 위한 작업 공간이다.

핵심 방향은 단순하다.

- 계산은 프론트가 하지 않는다
- 웹은 운영 화면을 맡는다
- 데이터/메타는 `Supabase`
- 장기 실행은 `Python polling worker`
- 패키지 매니저는 `pnpm`

## 현재 상태

지금까지 준비된 것:

- 루트 기준 `Next.js` 기본 실행 환경
- 핵심 의존성 설치 완료
- 문서 동기화 완료
- 디자인 가이드 및 HTML 시안 정리
- 구현 계획 문서 정리

아직 본격 구현 전 상태인 것:

- 실제 업무 페이지 구현
- Supabase 실제 연결
- Python worker 실제 구현

## 주요 문서

- 구현 계획: [`docs/task.md`](C:\sales_os\docs\task.md)
- 디자인 시스템: [`docs/08_design_system.md`](C:\sales_os\docs\08_design_system.md)
- Antigravity용 디자인 브리프: [`docs/11_antigravity_html_design_brief.md`](C:\sales_os\docs\11_antigravity_html_design_brief.md)
- 디자인 예시 HTML: [`docs/ui/design_guide`](C:\sales_os\docs\ui\design_guide)

## 기술 스택

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Zustand`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `Supabase`
- `Python polling worker`

## 페이지 흐름

현재 기준 페이지 흐름은 아래와 같다.

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Reports`
5. `Artifacts`
6. `Run Detail`
7. `Agent`

설명:

- `Run Detail`은 상단 메뉴보다 경로로 들어가는 상세 페이지 성격이 강하다
- `Agent`는 가장 마지막에 구현할 전략 기능이다

## 실행 명령

개발 서버:

```bash
pnpm dev
```

프로덕션 빌드 확인:

```bash
pnpm build
```

타입 체크:

```bash
pnpm typecheck
```

## 작업 원칙

- KPI 계산은 프론트에서 하지 않는다
- 상태는 설명 문장과 함께 보여준다
- `company_key`와 `run_id` 문맥을 항상 유지한다
- 디자인 HTML은 복붙하지 않고 컴포넌트로 분해한다
- 사용자는 비개발자 관점이 강하므로 설명은 쉽게 한다
# sales_data_os
