# Sales Data OS 백엔드 설계 문서 02. Web API 명세

작성일: 2026-03-31  
문서 구분: 백엔드 설계 문서  
대상: 웹 백엔드 API를 정리해야 하는 설계/연동 세션  
작성 기준: 비개발자도 읽을 수 있게 운영 흐름 중심으로 작성

## 문서 목적

이 문서는 `Sales Data OS Web`이 화면 뒤에서 어떤 API를 가져야 하는지 정리한 운영 기준 문서다.

중요:

- 이 프로젝트는 단순 웹앱이 아니라 `Sales Data OS 운영 체계`다.
- 따라서 API도 `버튼 클릭용 API`가 아니라 `입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset -> builder` 흐름을 기준으로 설계해야 한다.
- `Builder`는 계산하지 않고 payload만 읽는다.

---

## 1. API 설계 원칙

### 1-1. 기본 원칙

- 모든 실행 기준은 `company_key`다.
- 업로드 직후 바로 계산하지 않고, 먼저 `intake`로 상태를 점검한다.
- KPI 계산은 `modules/kpi/*`가 단일 소스다.
- `validation`은 계산 이후 전달 가능 여부를 판단한다.
- `builder`는 승인된 payload만 받아 HTML을 만든다.

### 1-2. API 구분

운영상 API는 크게 8개 묶음으로 나누는 것이 맞다.

- 회사/프로필 API
- 입력 업로드 API
- intake/onboarding API
- 파이프라인 실행 API
- 모듈 결과 조회 API
- builder/report API
- run/history API
- agent/context API

---

## 2. 권장 API 목록

## 2-1. 회사/프로필 API

### `GET /api/companies`

- 목적
  - 등록된 회사 목록 조회
- 응답 예시

```json
{
  "items": [
    {
      "company_key": "hangyeol_pharma",
      "company_name": "한결제약"
    }
  ]
}
```

### `POST /api/companies`

- 목적
  - 신규 회사 등록
- 요청 예시

```json
{
  "company_key": "company_000003",
  "company_name": "신규제약"
}
```

### `GET /api/companies/{company_key}`

- 목적
  - 특정 회사 기본 정보 조회

---

## 2-2. 입력 업로드 API

### `POST /api/companies/{company_key}/sources/upload`

- 목적
  - 일반 raw 파일 업로드
- 입력
  - multipart 파일 업로드
  - source 종류 정보
- 처리
  - 원본 파일을 `data/company_source/{company_key}/...`에 저장
- 응답 예시

```json
{
  "saved": true,
  "company_key": "hangyeol_pharma",
  "source_key": "crm_activity",
  "target_path": "data/company_source/hangyeol_pharma/crm/crm_activity_raw.xlsx"
}
```

### `POST /api/companies/{company_key}/sources/monthly-upload`

- 목적
  - 월별 raw 파일 업로드
- 처리
  - 파일명에서 월을 읽어 `monthly_raw/YYYYMM/`에 저장
- 대상 source
  - `crm_activity`
  - `sales`
  - `target`
  - `prescription`

### `GET /api/companies/{company_key}/sources`

- 목적
  - 현재 회사에 어떤 입력 파일이 저장돼 있는지 조회

---

## 2-3. intake / onboarding API

### `POST /api/companies/{company_key}/intake/analyze`

- 목적
  - 입력 파일의 상태를 먼저 점검
- 하는 일
  - 필수 파일 확인
  - 필수 컬럼 확인
  - 컬럼 별칭 매핑
  - 날짜/월/중복 자동 보정
  - period coverage 계산
  - advisory / needs_review / blocked 판단
- 응답 핵심

```json
{
  "company_key": "hangyeol_pharma",
  "status": "ready_with_fixes",
  "ready_for_adapter": true,
  "analysis_start_month": "202601",
  "analysis_end_month": "202606",
  "analysis_month_count": 6,
  "analysis_summary_message": "일부 입력 데이터의 기간이 서로 다르지만, 공통 분석 구간 기준으로 진행 가능합니다.",
  "packages": []
}
```

### `GET /api/companies/{company_key}/intake/result`

- 목적
  - 가장 최근 intake 결과 조회

### `POST /api/companies/{company_key}/intake/confirm`

- 목적
  - 기간 차이나 advisory가 있어도 사용자가 진행을 확정
- 필요한 경우에만 사용

---

## 2-4. 파이프라인 실행 API

### `POST /api/companies/{company_key}/pipeline/run`

- 목적
  - 선택한 실행모드로 실제 파이프라인 실행
- 요청 예시

```json
{
  "execution_mode": "통합 실행",
  "stop_on_fail": true
}
```

- 내부 처리 순서
  1. source 파일 반영 확인
  2. `monthly_raw` 자동 병합
  3. intake staging 기준 입력 준비
  4. adapter 실행
  5. 모듈/KPI 실행
  6. validation 실행
  7. radar / builder 실행
  8. run 저장

- 응답 예시

```json
{
  "run_id": "20260331_101530",
  "company_key": "hangyeol_pharma",
  "execution_mode": "통합 실행",
  "status": "started"
}
```

### `GET /api/companies/{company_key}/pipeline/runs/{run_id}`

- 목적
  - 특정 실행의 현재 상태 조회

### `GET /api/companies/{company_key}/pipeline/latest`

- 목적
  - 최근 실행 결과 조회

---

## 2-5. 단계 결과 조회 API

### `GET /api/companies/{company_key}/validation/summary`

- 목적
  - 최근 validation 단계 결과 조회
- 응답 핵심

```json
{
  "overall_status": "PASS",
  "steps": [
    {"step": "CRM", "status": "PASS"},
    {"step": "Sandbox", "status": "PASS"},
    {"step": "Territory", "status": "WARN"},
    {"step": "RADAR", "status": "APPROVED"},
    {"step": "Builder", "status": "PASS"}
  ]
}
```

### `GET /api/companies/{company_key}/modules/{module_name}/result`

- 목적
  - 특정 모듈의 최신 result asset 조회
- 가능한 `module_name`
  - `crm`
  - `sandbox`
  - `territory`
  - `prescription`
  - `radar`

### `GET /api/companies/{company_key}/modules/{module_name}/summary`

- 목적
  - 특정 모듈의 요약 정보 조회

---

## 2-6. builder / report API

### `POST /api/companies/{company_key}/builder/render`

- 목적
  - 특정 보고서만 다시 렌더
- 요청 예시

```json
{
  "report_type": "territory",
  "period_mode": "month",
  "year": "2026",
  "sub_period": "03"
}
```

### `GET /api/companies/{company_key}/builder/reports`

- 목적
  - 현재 생성된 보고서 목록 조회

### `GET /api/companies/{company_key}/builder/reports/{report_type}`

- 목적
  - 특정 보고서 HTML 경로/메타 조회

### `GET /api/companies/{company_key}/builder/artifacts`

- 목적
  - 보고서 asset, payload, HTML 파일 목록 조회

---

## 2-7. run / history API

### `GET /api/companies/{company_key}/runs`

- 목적
  - 실행 이력 목록 조회

### `GET /api/companies/{company_key}/runs/{run_id}/summary`

- 목적
  - `pipeline_summary.json` 기반 실행 요약 조회

### `GET /api/companies/{company_key}/runs/{run_id}/artifacts`

- 목적
  - `artifacts.index.json` 기반 산출물 목록 조회

---

## 2-8. agent / context API

### `GET /api/companies/{company_key}/runs/{run_id}/report-context`

- 목적
  - Agent가 읽을 report context 조회
- 포함 대상
  - `report_context.full.json`
  - `report_context.prompt.json`

### `POST /api/companies/{company_key}/runs/{run_id}/agent/chat`

- 목적
  - 특정 run 문맥 기준 질의응답
- 주의
  - Agent는 KPI를 재계산하지 않는다
  - 이미 저장된 run artifact와 report context를 읽어 답한다

---

## 3. 주요 요청/응답 구조

## 3-1. Intake 응답 구조

핵심 필드:

- `status`
  - `ready`, `ready_with_fixes`, `needs_review`, `blocked`
- `ready_for_adapter`
- `findings`
- `fixes`
- `suggestions`
- `period_coverages`
- `timing_alerts`
- `analysis_start_month`
- `analysis_end_month`
- `analysis_month_count`
- `analysis_summary_message`
- `proceed_confirmation_message`
- `packages`

## 3-2. Pipeline 실행 응답 구조

핵심 필드:

- `run_id`
- `company_key`
- `execution_mode`
- `status`
- `started_at`

## 3-3. Validation 요약 구조

핵심 필드:

- `overall_status`
- `overall_score`
- `steps`
- `reasoning_note`
- `interpreted_reason`
- `evidence`

## 3-4. Result asset 조회 구조

핵심 필드:

- `asset_type`
- `schema_version`
- `company_key`
- `period`
- `summary`
- `metrics`
- `quality`

실제 키 이름은 모듈별로 조금씩 다를 수 있다.

---

## 4. 상태값 설계

### 4-1. Intake 상태

- `ready`
- `ready_with_fixes`
- `needs_review`
- `blocked`

### 4-2. Pipeline/Validation 상태

- `PASS`
- `WARN`
- `FAIL`
- `APPROVED`
- `SKIP`

운영 의미:

- `PASS`: 정상 통과
- `WARN`: 진행 가능하지만 점검 필요
- `FAIL`: 차단 또는 수정 필요
- `APPROVED`: 인텔리전스 활용 승인
- `SKIP`: 이번 실행모드에서는 생략

---

## 5. 권장 실행 흐름

웹 백엔드에서는 아래 흐름으로 API를 연결하는 것이 자연스럽다.

1. 회사 선택
2. raw 업로드
3. intake analyze
4. intake 결과 확인
5. 필요 시 진행 확인
6. pipeline run
7. run status polling
8. validation summary 조회
9. 보고서 목록 조회
10. HTML/asset 열람

---

## 6. Builder 관련 API 원칙

중요한 원칙:

- Builder API는 계산 API가 아니다
- Builder API는 payload 소비 API다

즉 아래는 하면 안 된다.

- `builder`에서 CRM KPI 다시 계산
- `builder`에서 Sandbox KPI 다시 계산
- 템플릿 단계에서 validation 판정 다시 만들기

Builder API는 아래만 해야 한다.

- payload 로드
- 필요 시 asset 분리
- 템플릿 주입
- HTML 결과 저장/반환

---

## 7. 저장 구조와 API 연결

API 응답은 결국 아래 저장 구조와 연결된다.

- `data/company_source/{company_key}/`
- `data/company_source/{company_key}/_intake_staging/`
- `data/standardized/{company_key}/`
- `data/validation/{company_key}/`
- `data/validation/{company_key}/runs/{run_id}/`

run 기준 핵심 파일:

- `pipeline_summary.json`
- `artifacts.index.json`
- `report_context.full.json`
- `report_context.prompt.json`

---

## 8. 한 줄 결론

`Sales Data OS Web` 백엔드 API는 화면 위젯용 API가 아니라,  
`입력 수용 -> intake 판단 -> 파이프라인 실행 -> validation 결과 조회 -> 승인된 payload 기반 builder 출력` 흐름을 안정적으로 연결하는 운영 API로 설계해야 한다.
