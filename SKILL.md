---
name: sales-os-root-context
description: Preserve the core build context for the Sales Data OS web project from the repository root. Use when starting work in this repo so implementation does not lose system boundaries, page priority, run context, design direction, or the current web architecture decisions.
---

# Sales Data OS Root Context

## 프로젝트 한 줄 요약

`Sales Data OS`는 제약 영업 데이터를
업로드 -> 실행 -> 검증 -> 결과 확인 -> 보고서 열람 -> 해석 보조 흐름으로 다루는 운영 웹 앱이다.

## 현재 확정 구조

- 프론트엔드: `Next.js 16 + React 19 + TypeScript`
- 데이터/메타: `Supabase`
- 장기 실행: `Python polling worker`
- 패키지 매니저: `pnpm`
- 시작 위치: 새 폴더 없이 현재 루트
- 1차 범위: 개발용 무로그인

## 절대 섞지 말아야 할 역할

- KPI 계산: 프론트에서 하지 않음
- OPS: `Validation / Orchestration Layer`
- Builder: render-only
- Web: 입력, 실행, 상태 추적, 설명, 결과 열람
- Worker: 무거운 계산, 결과물 생성, 단계 상태 갱신

## 웹에서 반드시 보여줘야 하는 것

- 현재 회사 (`company_key`)
- 현재 run (`run_id`)
- 실행 가능/불가 사유
- WARN/FAIL 이유
- 근거 수치 또는 evidence
- 다음 행동

## 현재 페이지 흐름

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Reports`
5. `Artifacts`
6. `Run Detail`
7. `Agent`

주의:

- `Run Detail`은 상단 주 메뉴보다 경로 진입 상세 페이지 성격이 강함
- `Agent`는 가장 마지막 구현 단계의 전략 기능

## 디자인 원칙

- 일반 SaaS 대시보드처럼 만들지 않음
- 상태는 배지만 아니라 설명 문장과 함께 보여줌
- 디자인 기준은 `docs/ui/design_guide/` HTML과 `docs/08_design_system.md`
- Antigravity 입력 기준은 `docs/11_antigravity_html_design_brief.md`

## 먼저 볼 문서

- `docs/task.md`
- `docs/08_design_system.md`
- `docs/11_antigravity_html_design_brief.md`
- `AGENTS.md`
- `README.md`

## 작업 전 체크

작업 시작 전에 아래를 확인한다.

- 지금 만드는 것이 어느 페이지/Phase에 속하는가
- run 문맥이 필요한가
- 설명형 UX가 들어가야 하는가
- 프론트가 계산을 하려는 방향으로 가고 있지 않은가
- 디자인 HTML을 그대로 복붙하려는 상태는 아닌가
