# Sales Data OS Web

현재 이 저장소는 `Sales Data OS` 웹 앱을 루트에서 바로 개발하기 위한 작업 공간이다.

핵심 방향은 단순하다.

- 계산은 프론트가 하지 않는다
- 웹은 운영 화면을 맡는다
- 데이터/메타는 `Supabase`
- 장기 실행은 `Python polling worker`
- 패키지 매니저는 `pnpm`
- 현재 우선순위는 `화면 추가`보다 `백엔드 구현`

## 현재 상태

현재 구현 진행사항은 아래 문서만 기준으로 본다.

- 현재 진행 문서: [`docs/current_implementation_status.md`](C:\sales_os\docs\current_implementation_status.md)

지금까지 준비된 것:

- 루트 기준 `Next.js` 기본 실행 환경
- 핵심 의존성 설치 완료
- 문서 동기화 완료
- 디자인 가이드 및 HTML 시안 정리
- 핵심 페이지 기본 뼈대 구현
- `Phase 1 ~ Phase 5` 구현 반영
- `Phase 5-1. 지저분한 raw 대응 보강` 완료
- `Phase 6. KPI 계산과 Result Asset Base 구현` 완료
- `Phase 7. validation 구현` 완료
- 백엔드 로직 설계 문서 완료
- Python/worker 의존성 파일 정리
- 보고서 템플릿 검토 및 패키지 기준 정리

다음 구현 우선순위:

- `Phase 8 ~ Phase 10` 백엔드 구현
- 구현 순서:
  - `Phase 8` payload
  - `Phase 9` builder
  - `Phase 10` worker runtime
- Supabase 실제 연결
- Python worker 실제 구현
- 프론트엔드와 실제 엔진 연결

## 주요 문서

- 현재 구현 진행 문서: [`docs/current_implementation_status.md`](C:\sales_os\docs\current_implementation_status.md)
- 구현 계획: [`docs/task.md`](C:\sales_os\docs\task.md)
- 디자인 시스템: [`docs/08_design_system.md`](C:\sales_os\docs\08_design_system.md)
- Antigravity용 디자인 브리프: [`docs/11_antigravity_html_design_brief.md`](C:\sales_os\docs\11_antigravity_html_design_brief.md)
- 디자인 예시 HTML: [`docs/ui/design_guide`](C:\sales_os\docs\ui\design_guide)
- 보고서 템플릿 의존성: [`docs/12_report_template_dependencies.md`](C:\sales_os\docs\12_report_template_dependencies.md)
- 백엔드 로직 요청서: [`docs/13_backend_logic_request_prompt.md`](C:\sales_os\docs\13_backend_logic_request_prompt.md)
- KPI / result asset 조사: [`docs/summary/phase6_kpi_engine_and_result_asset_research_20260331.md`](C:\sales_os\docs\summary\phase6_kpi_engine_and_result_asset_research_20260331.md)
- validation / payload 조사: [`docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`](C:\sales_os\docs\summary\original_project_result_asset_payload_artifact_research_20260331.md)

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
4. `Artifacts`
5. `Reports`
6. `Run Detail`
7. `Agent`

설명:

- `Run Detail`은 상단 메뉴보다 경로로 들어가는 상세 페이지 성격이 강하다
- `Agent`는 가장 마지막에 구현할 전략 기능이다

## 백엔드 우선순위

현재 기준으로는 `Phase 7`까지의 백엔드 핵심 골격이 구현된 상태이므로,
다음 핵심 작업은 아래 공식 흐름의 뒤쪽 단계를 마무리하는 것이다.

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

현재 해석:

- `intake -> normalization -> kpi -> validation`은 실제 파일과 API로 동작한다
- `result asset`는 `data/validation/{company_key}/{module}/` 아래에 생성된다
- `validation`은 `runs/{run_id}` 기준 요약, 근거, 문맥 파일까지 저장한다
- 다음 구현 시작점은 `Phase 8 payload`다

중요한 원칙:

- 앞단 `검증`은 입력 파일 점검
- 뒤단 `validation`은 KPI 결과 검증과 전달 판단
- `Builder`는 계산하지 않고 payload만 읽는다

공식 모듈 구조는 아래 `9개`로 본다.

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

- 운영 화면과 결과에서 겉으로 드러나는 것은 `5개 모듈`이다
  - `crm`
  - `sandbox`
  - `prescription`
  - `territory`
  - `radar`
- 나머지 `4개 모듈`은 내부 엔진이다
  - `intake`
  - `kpi`
  - `validation`
  - `builder`
- 시스템 설명은 항상 `9개 모듈` 기준으로, 화면 설명은 `겉으로 보이는 5개 모듈` 기준으로 말한다

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
