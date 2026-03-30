# 11. Antigravity HTML Design Brief

작성일: 2026-03-30  
상태: `draft`

## 1. 이 문서의 목적

이 문서는 `08_design_system.md`를 대체하는 문서가 아니다.

이 문서의 목적은
`Antigravity + Gemini 3` 같은 디자인 생성 도구가
바로 HTML 시안 초안을 만들 수 있도록
입력 형식을 더 구체적으로 정리하는 것이다.

쉽게 말하면:

- `08_design_system.md`는 사람용 방향 문서
- `11_antigravity_html_design_brief.md`는 생성형 디자인 도구 입력 문서

이다.

## 2. 프로젝트 성격 요약

이 프로젝트는 일반 SaaS 대시보드가 아니다.

이 화면은 아래 성격을 가져야 한다.

- 제약 영업 운영 체계를 다루는 제품
- 업로드, 실행, 검증, 결과, 보고서 흐름이 연결된 운영 콘솔
- 단순 KPI 숫자판이 아니라 `상태 + 설명 + 다음 행동`이 보이는 제품
- 계산기는 백엔드/worker가 맡고, 웹은 `관제와 설명`을 맡는 구조

## 3. Antigravity에 꼭 전달해야 하는 핵심 제약

### 3.1 해야 하는 것

- 운영 제품처럼 보여야 한다
- 상태와 설명 문장이 함께 보여야 한다
- 현재 회사와 현재 run 문맥이 항상 살아 있어야 한다
- 실행 전 / 실행 중 / 실행 후가 명확히 구분돼야 한다
- 보고서, 실행, 업로드, 결과 탐색이 서로 다른 성격으로 보여야 한다

### 3.2 하면 안 되는 것

- 일반적인 스타트업 SaaS 대시보드처럼 만들기
- KPI 카드만 잔뜩 깔아놓기
- 너무 마케팅 사이트처럼 화려하게 만들기
- 어두운 다크모드 중심으로 가기
- 보라색 중심 UI로 가기
- 상태를 색만으로 표현하기
- 설명 없는 배지 중심 화면 만들기

## 4. 출력 형식 계약

Antigravity가 만들어야 하는 것은 아래 기준을 따른다.

### 4.1 산출물 형식

- 정적 HTML 파일
- 각 화면별 1파일
- CSS와 간단한 JS는 파일 안에 포함 가능
- 실제 데이터 연결은 하지 않아도 됨
- 하지만 `실제 제품처럼 보이는 mock 데이터`는 반드시 넣을 것

### 4.2 1차 산출물 파일명

아래 4개 화면을 먼저 만든다.

1. `workspace.html`
2. `upload.html`
3. `pipeline.html`
4. `run-detail.html`

필요하면 2차로 아래를 만든다.

5. `runs.html`
6. `reports.html`

### 4.3 반응형 범위

- 우선순위는 데스크톱
- 모바일에서도 레이아웃이 깨지지 않아야 함
- 표는 모바일에서 카드형으로 무너져도 됨

## 5. 전체 시각 방향

### 5.1 브랜드 무드

- Operational
- Structured
- Signal-first
- Calm but sharp
- Data-aware
- Report-aware

### 5.2 화면 인상

한눈에 봤을 때 느낌은 아래에 가까워야 한다.

- 차분하다
- 밀도 있다
- 정보가 잘 정리돼 있다
- 관리자용 도구답다
- 하지만 구식 내부툴처럼 답답하지 않다

### 5.3 디자인 문장

아래 문장을 기준 문장으로 삼는다.

`This is not a generic dashboard. It is a structured operating console for sales data intake, pipeline execution, validation status, and report delivery.`

## 6. 시각 스타일 가이드

### 6.1 배경

- 부드러운 라이트 톤 배경
- 완전 흰색보다 약간 톤다운된 중성 배경
- 본문은 흰 카드 또는 아주 밝은 패널로 분리

예시 방향:

- 앱 배경: very light gray / warm gray / cool gray
- 카드 배경: white
- 구분선: subtle gray

### 6.2 포인트 컬러

- 딥 블루 또는 블루-그린
- 너무 밝은 네온 계열 금지
- 보라 계열 메인 포인트 금지

포인트 컬러 사용 위치:

- 활성 메뉴
- 현재 회사 표시
- 주요 실행 버튼
- 선택 상태
- 핵심 숫자 강조

### 6.3 상태 컬러

- `READY`: neutral gray
- `RUNNING`: blue
- `PASS`: green
- `WARN`: amber/orange
- `FAIL`: red
- `APPROVED`: teal or blue-green

원칙:

- 상태는 색 + 텍스트 + 아이콘 같이 사용
- 색만으로 의미 전달 금지

### 6.4 타이포그래피

- 기본은 읽기 쉬운 산세리프
- 제목, 수치, 상태는 더 강하게
- 운영 콘솔답게 줄간격과 정보 위계를 분명히

권장 방향:

- 제목: 강한 weight
- 본문: 중간 weight
- 메타: 작은 크기, 낮은 대비
- 숫자: 본문보다 선명하게

### 6.5 모서리 / 그림자 / 밀도

- 과하게 둥근 카드 금지
- 적당한 라운드
- 얇고 정돈된 그림자
- 너무 넓은 여백보다 `밀도 있는 운영 화면` 쪽 선호

## 7. 전체 레이아웃 구조

기본 앱 레이아웃은 아래다.

1. 좌측 Sidebar
2. 상단 Context Header
3. 메인 콘텐츠 영역

### 7.1 Sidebar

반드시 포함:

- 로고 또는 제품명 `Sales Data OS`
- 메뉴
- 현재 선택 위치 강조

메뉴 목록:

- Workspace
- Upload
- Pipeline
- Runs
- Artifacts
- Reports
- Agent

### 7.2 Context Header

항상 포함:

- 현재 회사명
- `company_key`
- 현재 페이지명
- 가능하면 현재 run 요약

### 7.3 Main Content

페이지마다 아래 순서를 기본으로 한다.

1. 페이지 제목 / 설명
2. 상태 요약
3. 주요 액션
4. 핵심 데이터 영역
5. 보조 설명 또는 상세 패널

## 8. 반드시 들어가야 하는 공통 UX 규칙

### 8.1 설명형 상태 표현

좋은 예:

- `WARN`
- `처방 데이터 기간이 공통 분석 종료월보다 6개월 이전에 끝나 있습니다. 공통 분석 구간 기준 검증은 계속 가능합니다.`

나쁜 예:

- `WARN` 배지만 있음

### 8.2 문맥 고정

사용자가 항상 알아야 하는 것:

- 지금 어느 회사인지
- 지금 어느 화면인지
- 가능하면 어떤 run 기준인지

### 8.3 다음 행동 제시

상태만 보여주지 말고
다음 행동을 같이 보여줘야 한다.

예:

- Upload로 이동
- Pipeline 실행
- 최신 run 보기
- 보고서 열기

## 9. 화면별 상세 브리프

## 9.1 `workspace.html`

### 목적

사용자가 현재 회사의 전체 상태를 가장 빨리 이해하게 하는 홈 화면

### 반드시 포함할 블록

- 현재 회사 요약 카드
- 최근 run 상태 카드
- 최근 업로드 상태 카드
- 빠른 액션 버튼
- 최근 보고서 또는 최근 경고 요약

### 보여줄 mock 데이터 예시

- company name: `Hangyeol Pharma`
- company key: `hangyeol_pharma`
- last run: `RUNNING` 또는 `WARN`
- last updated: `2026-03-30 21:40`
- recent reports: `CRM`, `Territory`, `Total Validation`

### 디자인 포인트

- 요약 카드 중심
- 첫 화면에서 “지금 상태”가 바로 읽혀야 함
- 관리자용 콘솔 인상이 나야 함

## 9.2 `upload.html`

### 목적

단순 업로드 화면이 아니라
`입력 상태를 점검하고 설명하는 화면`

### 반드시 포함할 블록

- 업로드 요약 영역
- 일반 업로드 섹션
- 월별 raw 업로드 섹션
- 저장된 파일 목록
- intake 설명 패널
- 기간 차이 / 공통 분석 구간 안내

### 반드시 보여줘야 하는 문장 예시

- `일부 source의 기간이 서로 다르지만 공통 분석 구간 기준으로는 검증을 진행할 수 있습니다.`
- `처방 데이터는 2025-12까지 존재하고, 판매/목표 데이터는 2026-06까지 존재합니다.`

### 상태 예시

- `uploaded`
- `saved`
- `needs_review`
- `invalid`

### 디자인 포인트

- 일반 업로드와 월별 업로드를 시각적으로 분리
- 테이블 또는 카드가 너무 복잡하지 않게
- “이 데이터로 진행 가능한가”가 핵심 질문처럼 보여야 함

## 9.3 `pipeline.html`

### 목적

실행 준비, 실행 시작, 현재 진행 상태를 한 화면에서 이해시키는 화면

### 반드시 포함할 블록

- 실행 준비 상태 카드
- 실행 가능/불가 사유 설명
- 실행 모드 선택 카드
- 실행 버튼
- 현재 또는 최근 run 진행 카드
- 단계별 진행 상태 요약

### 실행 모드 예시

- `CRM -> Sandbox`
- `Sandbox -> HTML`
- `CRM -> PDF`
- `통합 실행`

### 진행 상태 예시

- 현재 단계: `Validation Layer`
- 완료 단계 수: `4 / 7`
- 마지막 갱신: `2 minutes ago`

### 디자인 포인트

- 실행 버튼은 분명히 강조
- 현재 진행 중인 단계가 가장 눈에 띄어야 함
- 단순 로더보다 “운영 통제 화면”처럼 보여야 함

## 9.4 `run-detail.html`

### 목적

하나의 run에서 무슨 일이 일어났는지,
왜 WARN/FAIL이 났는지,
어떤 결과물이 생겼는지 보여주는 화면

### 반드시 포함할 블록

- run 기본 정보 카드
- overall status / score 요약
- step list 또는 vertical progress list
- reasoning 문장
- evidence / metric 카드
- artifact 링크
- report 링크

### 반드시 보여줘야 하는 UX

- 상태 배지 + 설명 문장
- 근거 수치 카드
- 다음 행동 버튼

### 디자인 포인트

- 수직 스텝 구조가 잘 어울림
- 상세 설명과 숫자 근거를 같이 보여줘야 함
- “기술 로그”처럼 보이면 안 되고 “운영 판단 화면”처럼 보여야 함

## 10. 선택 화면 브리프

## 10.1 `runs.html`

- run 목록 비교 중심
- 상태 / 점수 / 시간 / 모드가 빨리 읽혀야 함
- 표와 카드의 중간 정도 밀도 권장

## 10.2 `reports.html`

- 보고서 카드형 목록
- 생성됨 / 미생성 구분이 분명해야 함
- `열기`, `다운로드`, `관련 run 보기` 액션 포함

## 11. 꼭 써야 하는 샘플 문구 스타일

### 좋은 문장 스타일

- 짧지만 의미가 분명함
- 운영자가 다음 행동을 떠올릴 수 있음
- 차이를 숨기지 않음
- 실패처럼 보이지 않지만 경고를 설명함

예:

- `공통 분석 구간 기준으로는 검증을 계속 진행할 수 있습니다.`
- `담당자 배치 불균형이 감지되어 운영 검토가 필요합니다.`
- `필수 입력 일부가 누락되어 통합 실행은 아직 시작할 수 없습니다.`

### 피해야 하는 문장 스타일

- 너무 기술 로그처럼 딱딱한 문장
- 이유 없는 짧은 코드값
- 과도하게 장황한 설명

## 12. Antigravity용 직접 지시문

아래 문장을 그대로 도구 입력 프롬프트에 포함해도 된다.

```text
Design a desktop-first operational web app for Sales Data OS.
This is not a generic SaaS dashboard and not a marketing page.
It is a structured console for upload readiness, pipeline execution, validation-aware run tracking, and report delivery.

Use a calm light theme with dense but readable information layout.
Prefer deep blue or blue-green accents, not purple.
Show status with badge + icon + explanation text.
Keep current company and current run context highly visible.

Create realistic static HTML mockups with mock data for:
- workspace.html
- upload.html
- pipeline.html
- run-detail.html

The UI should feel operational, credible, and productized.
It should help managers understand status, reason, and next action.
```

## 13. 최종 체크리스트

- 이 화면이 일반 SaaS 대시보드처럼 보이지 않는가
- 현재 회사와 현재 run 문맥이 보이는가
- 상태 옆에 설명 문장이 붙어 있는가
- Upload 화면이 단순 파일 업로드 화면이 아닌가
- Pipeline 화면이 실행 통제 화면처럼 보이는가
- Run Detail 화면에 근거 수치와 설명이 같이 있는가
- Reports가 최종 결과물 화면처럼 보이는가
