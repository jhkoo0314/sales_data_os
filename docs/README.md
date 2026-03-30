# Sales Data OS Web Rebuild

작성일: 2026-03-30  
상태: `active`

## 목적

이 폴더는 기존 Streamlit 운영 콘솔을
`Next.js + React + Tailwind` 기반 웹 앱으로 전환하기 위한
설계 및 구현 기준 문서 작업 공간이다.

핵심 방향은 아래와 같다.

- 계산은 계속 Python이 맡는다.
- 웹은 입력, 실행, 상태조회, 결과확인, 보고서열람을 맡는다.
- 시스템 전체 이름은 항상 `Sales Data OS`로 유지한다.
- `validation`만 공식 용어로 사용한다.
- 기본 화면 뼈대는 먼저 구현했고, 이제 우선순위는 백엔드 엔진 설계다.

즉 이 작업은
`계산 엔진 교체`가 아니라
`프론트엔드와 웹 운영 경험 재구성 + 엔진 흐름 재정렬`
이다.

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
11. `docs/12_report_template_dependencies.md`
12. `docs/13_backend_logic_request_prompt.md`

## 한 줄 정의

`Python 기반 Sales Data OS 계산 엔진은 유지하고, 운영 화면은 제품 수준의 웹 앱으로 다시 만들며, 현재 우선순위는 백엔드 엔진 설계다.`

## 작업 원칙

- KPI 계산 단일 소스는 계속 `modules/kpi/*`
- Builder는 render-only 유지
- 웹은 계산 로직을 중복 구현하지 않음
- 모든 실행/저장 기준은 `company_key`
- 장기 실행은 run 중심으로 추적
- 공식 백엔드 흐름은 `입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`
- 공식 모듈 구조는 `intake / kpi / crm / sandbox / territory / prescription / validation / radar / builder` 총 9개
- 겉으로 드러나는 운영/결과 모듈은 `crm / sandbox / prescription / territory / radar` 총 5개
- `intake / kpi / validation / builder`는 내부 엔진 모듈로 본다

## 이 폴더를 어떻게 사용할지

이 폴더는 설계 문서만 두는 임시 폴더가 아니라,
현재 루트에서 바로 웹 구현과 백엔드 설계를 진행하기 위한 기준 문서 폴더다.

의도는 아래와 같다.

1. 여기서 웹 프로젝트 기준 문서를 충분히 상세하게 고정한다.
2. 같은 루트에서 `pnpm` 기반 웹 프로젝트를 시작한다.
3. 기본 화면 위에서 백엔드 엔진 흐름을 설계한다.
4. Supabase, Python worker, Builder payload를 문서 기준으로 맞춘다.

즉 이 폴더는
`현재 루트 기준 설계 + 구현 기준 패키지`
역할을 한다.

## 현재 기준으로 알 수 있는 것

- 이 웹 제품이 왜 필요한지
- 누가 어떤 흐름으로 쓰는지
- 어떤 화면이 필요한지
- 어떤 기술로 만들지
- Supabase, Python worker, 웹이 어떻게 역할을 나누는지
- 기본 화면 뼈대가 어디까지 구현됐는지
- 어떤 순서로 백엔드 엔진을 설계해야 하는지

## 현재 기준으로 우선해서 하는 것

- 기본 화면 뼈대 유지 및 디자인 반영
- input intake / pre-validation / normalization 설계
- KPI / validation / payload / builder 계약 정리
- Python worker와 템플릿 의존성 기준 정리

## 현재 기준으로 아직 안 끝난 것

- Supabase 실제 테이블 구현
- Python worker 실제 구현
- Builder payload 실제 구현
- intake / validation / normalization 실제 연결
- KPI 엔진과 웹/worker 간 실제 계약 연결
