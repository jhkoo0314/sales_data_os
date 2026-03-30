# Sales Data OS Web Rebuild

작성일: 2026-03-30  
상태: `draft`

## 목적

이 폴더는 기존 Streamlit 운영 콘솔을
`Next.js + React + Tailwind` 기반 웹 앱으로 전환하기 위한
독립 설계 문서 작업 공간이다.

핵심 방향은 아래와 같다.

- 계산은 계속 Python이 맡는다.
- 웹은 입력, 실행, 상태조회, 결과확인, 보고서열람을 맡는다.
- 시스템 전체 이름은 항상 `Sales Data OS`로 유지한다.
- `OPS`는 계속 `Validation / Orchestration Layer`로만 다룬다.

즉 이 작업은
`계산 엔진 교체`가 아니라
`프론트엔드와 웹 운영 경험 재구성`이다.

## 문서 읽기 순서

1. `docs/01_prd.md`
2. `docs/02_user_flow.md`
3. `docs/03_information_architecture.md`
4. `docs/04_tech_stack.md`
5. `docs/05_frontend_architecture.md`
6. `docs/06_backend_api_plan.md`
7. `docs/07_data_flow.md`
8. `docs/08_design_system.md`
9. `docs/09_delivery_roadmap.md`
10. `docs/10_open_questions.md`

## 한 줄 정의

`Python 기반 Sales Data OS 계산 엔진은 유지하고, 운영 화면은 제품 수준의 웹 앱으로 다시 만든다.`

## 작업 원칙

- KPI 계산 단일 소스는 계속 `modules/kpi/*`
- Builder는 render-only 유지
- 웹은 계산 로직을 중복 구현하지 않음
- 모든 실행/저장 기준은 `company_key`
- 장기 실행은 run 중심으로 추적

## 이 폴더를 어떻게 사용할지

이 폴더는 설계 문서만 두는 임시 폴더가 아니라,
현재 루트에서 바로 웹 구현을 시작하기 위한 기준 문서 폴더다.

의도는 아래와 같다.

1. 여기서 웹 프로젝트 기준 문서를 충분히 상세하게 고정한다.
2. 같은 루트에서 `pnpm` 기반 웹 프로젝트를 시작한다.
3. 문서 기준으로 화면, 데이터 구조, worker 흐름을 구현한다.

즉 이 폴더는
`현재 루트 기준 설계 + 구현 기준 패키지`
역할을 한다.

## 권장 읽기 순서

처음 보는 개발자는 아래 순서로 읽는 것이 좋다.

1. `docs/01_prd.md`
2. `docs/02_user_flow.md`
3. `docs/03_information_architecture.md`
4. `docs/04_tech_stack.md`
5. `docs/05_frontend_architecture.md`
6. `docs/06_backend_api_plan.md`
7. `docs/07_data_flow.md`
8. `docs/08_design_system.md`
9. `docs/09_delivery_roadmap.md`
10. `docs/10_open_questions.md`

## 이 문서 패키지로 알 수 있는 것

- 이 웹 제품이 왜 필요한지
- 누가 어떤 흐름으로 쓰는지
- 어떤 화면이 필요한지
- 어떤 기술로 만들지
- Supabase, Python worker, 웹이 어떻게 역할을 나누는지
- 어떤 순서로 구현할지
- 시작 전에 무엇을 확정해야 하는지

## 이 문서 패키지로 아직 안 하는 것

- 실제 Next.js 코드 구현
- 실제 의존성 설치와 코드 구현
- Supabase 스키마 실제 구현
- Python worker 실제 구현
- UI 시안 코드 작성
