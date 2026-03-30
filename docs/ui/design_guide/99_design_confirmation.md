# Design Confirmation

작성일: 2026-03-31  
상태: `confirmed-for-implementation`

## 목적

이 문서는 `docs/ui/design_guide` 안의 HTML 시안을
실제 구현 기준으로 어떻게 해석할지 고정하는 문서다.

즉,

- 어떤 시안은 그대로 채택할지
- 어떤 시안은 일부 수정 후 채택할지
- 어떤 화면은 별도 페이지가 아니라 흡수할지

를 정한다.

## 현재 확인한 시안

- `00_workspace_cinematic.html`
- `01_upload_cinematic.html`
- `02_pipeline_cinematic.html`
- `03_artifacts_cinematic.html`
- `04_reports_cinematic.html`
- `05_agent_cinematic.html`
- `run_detail_cinematic.html`

## 전체 결론

현재 시안들은
`Sales Data OS`의 1차 제품 방향과 충분히 맞는다.

특히 아래 세 가지가 잘 잡혀 있다.

1. 일반 SaaS 대시보드가 아니라 운영 제품처럼 보인다
2. 상태와 설명을 함께 보여주는 방향이 살아 있다
3. 상단 중심 cinematic/editorial 톤이 공통 레이아웃으로 묶일 수 있다

따라서 이 시안들은
`디자인 참고 수준`이 아니라
`실제 구현의 기준 뼈대`
로 채택한다.

## 공통 디자인 확정 사항

아래 요소는 공통 디자인 베이스로 확정한다.

### 1. 상단 네비게이션 구조

- 좌측 사이드바 대신 상단 네비게이션 사용
- `Sales Data OS` 브랜드와 현재 메뉴를 상단에서 보여줌
- 넓은 캔버스를 확보하는 방향 유지

### 2. 시각 톤

- cinematic + editorial + operational
- 라이트 베이스
- 딥 블루 / 블루-그린 포인트
- 유리 질감 / 글래스 패널 / 소프트 그림자 유지

### 3. 상태 표현

- 상태 배지 + 설명 문장 조합 유지
- WARN / FAIL / CLEARED / GENERATED 같은 판정은 기계적 코드보다 해석 중심 문장과 함께 배치

### 4. 카드 밀도

- 너무 넓게 비는 SaaS 카드 구조보다
  정보 밀도가 있는 운영 콘솔 스타일 유지

## 페이지별 확정 결과

## 1. Workspace

대상 파일:

- `00_workspace_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- 상단 네비게이션 구조가 잘 잡혀 있음
- 회사 문맥, 최근 run, 최근 업로드, 빠른 액션 구조가 자연스러움
- Bento 구조가 첫 화면 홈으로 적합함

구현 시 주의:

- 현재 더미 액션 버튼은 실제 라우트에 연결
- quick action은 나중에 실제 페이지 흐름과 연결

## 2. Upload

대상 파일:

- `01_upload_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- 단순 파일 업로드가 아니라 intake / readiness 성격이 잘 드러남
- 기간 차이와 공통 분석 구간을 설명하는 구조가 맞음
- 일반 업로드와 월별 업로드를 분리하기 좋은 베이스임

구현 시 주의:

- 실제 구현에서는 월별 raw 영역과 저장 목록 영역을 더 명확히 분리
- 업로드 상태 모델은 mock보다 실제 데이터 기준으로 연결

## 3. Pipeline

대상 파일:

- `02_pipeline_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- 실행 전 readiness / 실행 모드 / 실행 상태가 잘 나뉘어 있음
- 실행 버튼 강조가 적절함
- 오른쪽 진행 패널 구조가 worker 상태 추적 UI로 잘 맞음

구현 시 주의:

- 모드 비활성 조건은 실제 입력 상태와 연결
- live trace 영역은 이후 worker 상태와 연결

## 4. Artifacts

대상 파일:

- `03_artifacts_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- report와 artifact의 차이가 분명하게 드러남
- artifact investigation 화면으로서 구조가 좋음
- 상태, 분류, 액션, 설명 레이어가 충분함

구현 시 주의:

- result asset을 artifact와 어떻게 구분해서 보여줄지 구현 시 확정
- 현재 context 보드는 유지

## 5. Reports

대상 파일:

- `04_reports_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- 최종 전달물 화면이라는 성격이 분명함
- 생성됨 / 경고 포함 / 실패 / 미생성 상태가 잘 구분됨
- artifact 화면과 명확히 다른 UX를 가짐

구현 시 주의:

- 관련 run 이동 버튼 또는 링크를 실제 구현에서 강화
- stale 상태 처리 규칙은 실제 run 문맥과 연결

## 6. Agent

대상 파일:

- `05_agent_cinematic.html`

판정:

- 그대로 구현 기준 채택

채택 이유:

- 일반 채팅 UI가 아니라 운영 해석 화면처럼 보임
- run context, evidence stack, result asset 구분이 잘 들어가 있음
- 최종 전략 기능의 방향성이 명확함

구현 시 주의:

- Agent는 가장 마지막 구현 단계
- result asset / artifact / report / validation 결과를 근거로 쓰는 구조를 유지
- consumer chat UI처럼 단순화하지 않음

## 7. Run Detail

대상 파일:

- `run_detail_cinematic.html`

판정:

- 수정 반영된 현재 버전을 기준으로 채택

채택 이유:

- run selector를 일부 흡수한 passport 형태가 맞음
- run 해석 중심 상세 화면으로 적절함

구현 해석:

- `Run Detail`은 상단 주 메뉴 페이지가 아님
- 경로 진입 상세 화면으로 구현
- 독립 `Runs` 페이지는 당장 만들지 않음
- 최근 run selector / switcher는 이 화면 안에서 처리

## 별도 Runs 페이지에 대한 결정

현재 결정:

- 독립 상단 메뉴 `Runs` 페이지는 만들지 않음
- `run_detail_cinematic.html` 안에 run selector / run switcher를 넣는 구조로 시작

이유:

- MVP 단계에서는 이 구조가 더 단순하고 자연스럽다
- 사용자는 Pipeline / Workspace에서 특정 run 상세로 들어가는 흐름이 더 자연스럽다

후속 가능성:

- run 이력이 많아지면 2차 이후 독립 `Runs` 페이지로 분리 가능

## 구현 시 바로 고쳐야 하는 공통 사항

현재 시안은 디자인 기준으로는 충분하지만,
구현 전 아래는 정리해야 한다.

### 1. 파일 링크 정리

일부 HTML 안의 링크 이름은 현재 실제 파일명과 다를 수 있다.

예:

- `workspace_cinematic.html`
- `pipeline_cinematic.html`
- `reports_cinematic.html`
- `artifacts_cinematic.html`

실제 구현에서는 문서용 파일명과 Next 라우트 기준으로 다시 매핑한다.

### 2. 더미 액션 정리

현재 버튼은 대부분 더미 상태다.

구현 시 연결 대상만 정하면 된다.

예:

- Open
- Download
- Start Execution
- View Exceptions
- Commit & Publish

### 3. 상태 문구 유지

시안의 강점은 상태 설명 문장이다.
이건 구현에서 절대 삭제하지 않는다.

## 최종 구현 기준 순서

구현 기준 페이지 순서는 아래로 확정한다.

1. `Workspace`
2. `Upload`
3. `Pipeline`
4. `Reports`
5. `Artifacts`
6. `Run Detail`
7. `Agent`

주의:

- `Run Detail`은 경로 진입 상세 화면
- `Agent`는 가장 마지막 구현 단계

## 다음 작업

이 문서 기준으로 다음 작업은 아래 순서로 한다.

1. 공통 App Shell 추출
2. 공통 디자인 토큰 추출
3. Workspace 구현
4. Upload 구현
5. Pipeline 구현
6. Reports 구현
7. Artifacts 구현
8. Run Detail 구현
9. Agent 구현
