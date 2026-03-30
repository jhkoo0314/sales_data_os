# 03. Information Architecture

작성일: 2026-03-30  
상태: `draft`

## 1. 문서 목적

이 문서는 웹 앱의 화면 구조를 정리한다.

쉽게 말하면
`어떤 메뉴가 있고, 각 페이지는 무엇을 보여주고, 어디로 연결되는가`
를 정하는 문서다.

## 2. 전체 구조 개요

웹 앱은 크게 아래 3개 축으로 나눈다.

### 2.1 운영 축

- Workspace
- Upload
- Pipeline

### 2.2 결과 탐색 축

- Runs
- Artifacts
- Reports

### 2.3 보조/관리 축

- Agent
- Admin

이렇게 나누는 이유는
사용자가 지금 하고 있는 일이
`입력/실행`
인지
`결과 확인`
인지
`관리`
인지 구분되게 하기 위해서다.

## 3. 상위 메뉴 구조

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Runs`
5. `Artifacts`
6. `Reports`
7. `Agent`
8. `Admin`

## 4. 페이지별 목적

## 4.1 Workspace

이 페이지는 회사 단위 홈 화면이다.

보여줄 것:

- 현재 선택 회사
- 최근 실행 상태
- 최근 run 요약
- 최근 업로드 상태
- 빠른 액션 카드

제공 액션:

- Upload로 이동
- Pipeline으로 이동
- 최신 run 보기
- Reports로 이동

이 페이지의 역할:

- 사용자가 “지금 어디를 보고 있는지” 가장 빨리 이해하게 한다.

## 4.2 Upload

이 페이지는 입력 파일을 다루는 화면이다.

보여줄 것:

- 업로드 가능한 파일 유형
- 저장된 파일 목록
- 최근 업로드 이력
- 월별 raw 상태

제공 액션:

- 일반 파일 업로드
- 월별 파일 업로드
- 저장 상태 갱신
- Pipeline으로 이동

이 페이지의 역할:

- 실행 전에 입력 상태를 정리하는 곳

## 4.3 Pipeline

이 페이지는 실행을 준비하고 시작하는 화면이다.

보여줄 것:

- 현재 회사
- 입력 준비 상태
- 실행 가능 여부
- 실행 모드 목록
- 현재 또는 최근 run 상태

제공 액션:

- 실행 모드 선택
- 실행 시작
- 현재 run 상세 보기

이 페이지의 역할:

- 사용자가 “지금 돌려도 되는지” 판단하게 한다.

## 4.4 Runs

이 페이지는 실행 이력 목록이다.

보여줄 것:

- run 목록
- 시작 시각
- 실행 모드
- 전체 상태
- 전체 점수

제공 액션:

- run 상세 이동
- 최신 run 선택
- 상태 필터링

이 페이지의 역할:

- 과거 실행과 현재 실행을 run 기준으로 추적하게 한다.

## 4.5 Run Detail

이 페이지는 단일 run 상세 화면이다.

보여줄 것:

- run 기본 정보
- 단계별 상태
- reasoning 문장
- 근거 수치 요약
- 생성 artifact
- 생성 보고서

제공 액션:

- artifact 열기
- 보고서 열기
- Agent로 질문하기

이 페이지의 역할:

- “이 실행에서 정확히 무슨 일이 일어났는가”를 보는 화면

## 4.6 Artifacts

이 페이지는 결과 파일 탐색 화면이다.

보여줄 것:

- 단계별 artifact 목록
- 파일 유형
- 생성 시각
- 관련 run
- 다운로드 가능 여부

제공 액션:

- artifact 상세 열기
- 다운로드

이 페이지의 역할:

- run 결과를 파일 단위로 탐색하게 한다.

## 4.7 Reports

이 페이지는 최종 결과물 화면이다.

보여줄 것:

- CRM 보고서
- Sandbox 보고서
- Territory 보고서
- Prescription 보고서
- RADAR 보고서
- Total Validation 보고서

제공 액션:

- 열기
- 다운로드
- 관련 run 이동

이 페이지의 역할:

- 사용자가 “바로 볼 최종 화면”만 빠르게 찾게 한다.

## 4.8 Agent

이 페이지는 run 기반 질의응답 화면이다.

보여줄 것:

- 현재 회사
- 현재 run
- 질문 입력창
- 응답 내용
- 근거 artifact
- 대화 이력

제공 액션:

- 질문 보내기
- run 바꾸기
- 근거 열기

이 페이지의 역할:

- 결과를 설명받고 근거를 확인하는 보조 분석 화면

## 4.9 Admin

이 페이지는 운영 설정 화면이다.

보여줄 것:

- 회사 목록
- 회사 등록 상태
- 시스템 기본 설정

제공 액션:

- 회사 등록
- 회사 정보 수정

## 5. 추천 URL 구조

### 공통

- `/workspace`

### 회사 기준

- `/workspace/[companyKey]`
- `/workspace/[companyKey]/upload`
- `/workspace/[companyKey]/pipeline`
- `/workspace/[companyKey]/runs`
- `/workspace/[companyKey]/runs/[runId]`
- `/workspace/[companyKey]/artifacts`
- `/workspace/[companyKey]/reports`
- `/workspace/[companyKey]/agent`

### 관리

- `/admin/companies`

## 6. 네비게이션 원칙

- 현재 회사는 전역으로 유지한다.
- 메뉴 이동 시 회사 문맥은 유지한다.
- run 상세로 들어가면 상단에 run 문맥을 고정 표시한다.
- 회사가 선택되지 않았으면 회사 선택부터 유도한다.

## 7. 화면 분리 원칙

### 7.1 Upload와 Pipeline 분리

이 둘을 분리해야
“파일을 올리는 행동”과 “실행하는 행동”이 섞이지 않는다.

### 7.2 Runs와 Reports 분리

Runs는 실행 이력 중심이고,
Reports는 최종 결과물 중심이다.

### 7.3 Artifacts와 Reports 분리

Artifacts는 파일 단위 탐색이고,
Reports는 사람이 보는 최종 결과물이다.

### 7.4 Agent 분리

Agent는 단순 채팅이 아니라
run 문맥을 타야 하므로 별도 화면이 맞다.

## 8. 공통 레이아웃 제안

### 좌측

- 메인 메뉴

### 상단

- 현재 회사
- 현재 run 요약
- 전역 액션

### 본문

- 페이지별 핵심 내용

### 우측 또는 하단 보조영역

- 최근 상태
- 주의사항
- 빠른 링크

## 9. 페이지 우선순위

### MVP 1차

1. Workspace
2. Upload
3. Pipeline
4. Runs
5. Run Detail
6. Reports

### MVP 2차

1. Artifacts
2. Agent

### 이후

1. Admin 고도화
2. 비교 화면
3. 고급 필터

## 10. 공통 상태 정보 구조

모든 페이지는 가능하면 아래 공통 상태 정보를 재사용한다.

- `company_key`
- `company_name`
- `current_run_id`
- `run_status`
- `last_updated_at`

## 11. 상태 표기 원칙

상태 표시는 단순하게 유지한다.

- `Ready`
- `Running`
- `Pass`
- `Warn`
- `Fail`
- `Approved`

단, 텍스트 배지만 두지 않고
설명 문장을 함께 보여준다.

## 12. IA 기준 체크리스트

- 사용자가 현재 회사를 항상 알 수 있는가
- 사용자가 현재 run을 항상 알 수 있는가
- 입력/실행/결과/보고서가 섞이지 않았는가
- 보고서와 artifact가 구분되는가
- run 중심 구조가 유지되는가
