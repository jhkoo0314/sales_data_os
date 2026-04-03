# Sales Data OS 백엔드 설계 문서 04. 프론트 연동 API 표

작성일: 2026-03-31  
문서 구분: 백엔드 설계 문서  
대상: 프론트엔드 연동자, 화면-API 연결 담당자  
작성 기준: 화면에서 어떤 API를 언제 호출하고 무엇을 받아야 하는지 빠르게 보는 표 문서

## 문서 목적

이 문서는 프론트엔드가 `Sales Data OS Web` 화면을 붙일 때 필요한 API를 표 형태로 빠르게 확인하기 위한 문서다.

중요:

- 이 표는 화면 위젯용 단순 API가 아니라 `Sales Data OS 운영 흐름` 기준으로 정리했다.
- `Builder`는 계산 API가 아니라 payload 소비/HTML 생성 API다.
- `validation`은 입력 검증이 아니라 계산 이후 전달 판단 단계다.

---

## 1. 화면 기준 호출 흐름

| 화면 단계 | 프론트 동작 | 호출 API | 목적 |
| --- | --- | --- | --- |
| 회사 선택 | 회사 목록 불러오기 | `GET /api/companies` | 등록된 회사 목록 표시 |
| 회사 등록 | 신규 회사 저장 | `POST /api/companies` | 새 `company_key` 생성 |
| 업로드 화면 진입 | 현재 source 상태 조회 | `GET /api/companies/{company_key}/sources` | 이미 저장된 파일 확인 |
| 일반 업로드 | raw 파일 저장 | `POST /api/companies/{company_key}/sources/upload` | source 파일 저장 |
| 월별 업로드 | monthly raw 저장 | `POST /api/companies/{company_key}/sources/monthly-upload` | `monthly_raw/YYYYMM/` 저장 |
| 업로드 후 점검 | intake 실행 | `POST /api/companies/{company_key}/intake/analyze` | 입력 상태 점검/보정 |
| intake 결과 표시 | 최근 intake 읽기 | `GET /api/companies/{company_key}/intake/result` | findings/fixes/period 안내 |
| 사용자 진행 확정 | 진행 확인 저장 | `POST /api/companies/{company_key}/intake/confirm` | 기간 차이 등 확인 후 진행 |
| 파이프라인 실행 | 실제 실행 시작 | `POST /api/companies/{company_key}/pipeline/run` | adapter -> module -> validation -> builder 실행 |
| 실행 중 상태 표시 | run 상태 갱신 | `GET /api/companies/{company_key}/pipeline/runs/{run_id}` | 진행 상황 polling |
| 실행 완료 요약 | 최신 결과 보기 | `GET /api/companies/{company_key}/pipeline/latest` | 최근 실행 결과 표시 |
| 판정 화면 | validation 요약 표시 | `GET /api/companies/{company_key}/validation/summary` | PASS/WARN/FAIL/APPROVED 표시 |
| 보고서 목록 | 생성 보고서 표시 | `GET /api/companies/{company_key}/builder/reports` | 열기/다운로드 대상 표시 |
| 보고서 상세 | 특정 보고서 메타 조회 | `GET /api/companies/{company_key}/builder/reports/{report_type}` | HTML 경로/메타 표시 |
| 개별 재렌더 | 보고서 다시 생성 | `POST /api/companies/{company_key}/builder/render` | 특정 보고서 재생성 |
| 실행 이력 | 과거 실행 목록 표시 | `GET /api/companies/{company_key}/runs` | run history 표시 |
| Agent 탭 | report context 로드 | `GET /api/companies/{company_key}/runs/{run_id}/report-context` | Agent 질의 문맥 로드 |

---

## 2. API 표

### 2-1. 회사 / 프로필 API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies` | `GET` | 회사 선택 드롭다운 진입 시 | 없음 | `items[]`, `company_key`, `company_name` | 최초 로딩용 |
| `/api/companies` | `POST` | 회사 등록 저장 시 | `company_name` | 저장 결과, 회사 기본 정보 | `company_key`는 서버가 랜덤 6자리 숫자로 생성 |
| `/api/companies/{company_key}` | `GET` | 특정 회사 정보 확인 시 | path: `company_key` | 회사 상세 정보 | 선택 후 상단 카드용 |

### 2-2. 입력 업로드 API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/sources` | `GET` | 업로드 탭 진입 시 | path: `company_key` | source 목록, 저장 경로, 존재 여부 | 업로드 전 상태 확인 |
| `/api/companies/{company_key}/sources/upload` | `POST` | 일반 raw 업로드 시 | multipart file, `source_key` | `saved`, `target_path`, `source_key` | 회사 폴더 저장 |
| `/api/companies/{company_key}/sources/monthly-upload` | `POST` | 월별 파일 업로드 시 | multipart file, `source_key` | `saved`, `target_path`, `month_token` | `monthly_raw/YYYYMM/` 저장 |

### 2-3. Intake / Onboarding API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/intake/analyze` | `POST` | 업로드 후 점검 버튼 클릭 시 | path: `company_key`, 필요 시 `execution_mode` | `status`, `ready_for_adapter`, `findings`, `fixes`, `suggestions`, `period_coverages` | 가장 중요한 입력 점검 API |
| `/api/companies/{company_key}/intake/result` | `GET` | 최근 intake 결과 다시 표시할 때 | path: `company_key` | 최근 intake 전체 결과 | 새로고침 대응 |
| `/api/companies/{company_key}/intake/confirm` | `POST` | 기간 차이/주의사항 확인 후 진행 시 | `confirmed`, `execution_mode` | 진행 확인 결과 | advisory 있어도 계속 진행할 때 |

### 2-4. 파이프라인 실행 API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/pipeline/run` | `POST` | 파이프라인 실행 버튼 클릭 시 | `execution_mode`, `stop_on_fail` | `run_id`, `status`, `execution_mode` | 실제 실행 시작 |
| `/api/companies/{company_key}/pipeline/runs/{run_id}` | `GET` | 실행 중 상태 polling | path: `company_key`, `run_id` | run 상태, 단계 진행 상황 | 2~5초 polling 용도 |
| `/api/companies/{company_key}/pipeline/latest` | `GET` | 실행 종료 후 최신 결과 반영 시 | path: `company_key` | 최근 run 요약 | 대시보드/분석 탭 공용 |

### 2-5. Validation / 모듈 결과 API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/validation/summary` | `GET` | 분석 인텔리전스 탭 진입 시 | path: `company_key` | `overall_status`, `steps[]`, `reasoning_note`, `evidence` | 판정 화면 핵심 API |
| `/api/companies/{company_key}/modules/{module_name}/result` | `GET` | 모듈별 상세 결과 열람 시 | path: `company_key`, `module_name` | 최신 `result_asset` | `crm`, `sandbox`, `territory`, `prescription`, `radar` |
| `/api/companies/{company_key}/modules/{module_name}/summary` | `GET` | 모듈 카드 요약 표시 시 | path: `company_key`, `module_name` | 모듈 요약 정보 | 카드형 UI에 적합 |

### 2-6. Builder / 보고서 API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/builder/reports` | `GET` | 빌더 탭 진입 시 | path: `company_key` | 보고서 목록, 생성 여부, 경로 | 열기/다운로드 버튼 기준 |
| `/api/companies/{company_key}/builder/reports/{report_type}` | `GET` | 특정 보고서 선택 시 | path: `company_key`, `report_type` | HTML 경로, 메타 정보 | iframe/open 버튼용 |
| `/api/companies/{company_key}/builder/render` | `POST` | 특정 보고서 다시 생성 시 | `report_type`, `period_mode`, `year`, `sub_period` | 생성 결과, output 경로 | Builder는 계산 금지 |
| `/api/companies/{company_key}/builder/artifacts` | `GET` | 보고서 asset 목록이 필요할 때 | path: `company_key` | HTML, payload, asset 파일 목록 | 다운로드 UI 대응 |

### 2-7. Run / History API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/runs` | `GET` | 실행 이력 탭 진입 시 | path: `company_key` | run 목록 | 정렬은 최신 우선 권장 |
| `/api/companies/{company_key}/runs/{run_id}/summary` | `GET` | 특정 run 요약 보기 | path: `company_key`, `run_id` | `pipeline_summary` | 과거 실행 비교용 |
| `/api/companies/{company_key}/runs/{run_id}/artifacts` | `GET` | 특정 run 산출물 보기 | path: `company_key`, `run_id` | `artifacts.index` | 파일 리스트 UI 대응 |

### 2-8. Agent / Context API

| API | 메서드 | 프론트에서 언제 호출 | 요청값 | 응답 핵심 | 비고 |
| --- | --- | --- | --- | --- | --- |
| `/api/companies/{company_key}/runs/{run_id}/report-context` | `GET` | Agent 탭에서 run 선택 시 | path: `company_key`, `run_id` | `report_context.full`, `report_context.prompt` | Agent 질의 문맥 |
| `/api/companies/{company_key}/runs/{run_id}/agent/chat` | `POST` | Agent 질문 전송 시 | `message` | answer, evidence, scope | KPI 재계산 없이 문맥 기반 응답 |

---

## 3. 프론트가 바로 써야 하는 상태값 표

### 3-1. Intake 상태

| 값 | 의미 | 프론트 표시 권장 |
| --- | --- | --- |
| `ready` | 바로 진행 가능 | 초록 |
| `ready_with_fixes` | 자동 보정 후 진행 가능 | 초록 또는 노랑 |
| `needs_review` | 사람 확인 필요 | 노랑 |
| `blocked` | 진행 불가 | 빨강 |

### 3-2. Pipeline / Validation 상태

| 값 | 의미 | 프론트 표시 권장 |
| --- | --- | --- |
| `PASS` | 정상 통과 | 초록 |
| `WARN` | 진행 가능하지만 점검 필요 | 노랑 |
| `FAIL` | 차단 또는 수정 필요 | 빨강 |
| `APPROVED` | 승인 완료 | 파랑 또는 초록 |
| `SKIP` | 이번 실행모드에서는 생략 | 회색 |

---

## 4. 프론트가 특히 주의할 점

| 항목 | 주의 내용 |
| --- | --- |
| `company_key` | 모든 요청과 저장 기준은 회사명이 아니라 `company_key`다 |
| intake와 validation | 둘은 다른 단계다. intake는 입력 점검, validation은 계산 이후 전달 판단이다 |
| Builder | Builder는 계산 API가 아니다. payload 기반 렌더 API다 |
| 기간 차이 | 기간이 다르다고 무조건 실패가 아니다. 공통 분석 구간 기준으로 진행 가능할 수 있다 |
| run 기준 조회 | 상세 화면은 가능하면 최신 단일 파일이 아니라 `run_id` 기준으로 읽는 쪽이 안전하다 |

---

## 5. 한 줄 정리

프론트 연동은 `업로드 -> intake 결과 확인 -> 실행 -> validation 결과 확인 -> 보고서 열기` 흐름으로 붙이는 것이 맞고,  
각 화면은 그 단계에 맞는 API만 읽어야 구조가 흔들리지 않는다.
