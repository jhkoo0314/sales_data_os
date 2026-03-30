# 06. Backend API Plan

작성일: 2026-03-30  
상태: `draft`

## 1. 문서 목적

이 문서는 새 웹 프로젝트가 Supabase와 Python worker 구조로 어떻게 연결될지 정리한다.

쉽게 말하면
`웹이 무엇을 저장/조회하고, worker가 무엇을 실행하는가`
를 정하는 문서다.

## 2. 백엔드의 역할

웹 전환 이후에는 역할을 두 층으로 나눈다.

### Python worker가 계속 맡는 일

- adapter 처리
- KPI 계산
- result asset 생성
- validation/orchestration
- builder 산출물 생성
- artifact 저장

### Supabase가 맡는 일

- 회사 메타 저장
- 업로드 메타 저장
- run 메타 저장
- report 메타 저장
- 상태 조회용 테이블 제공
- 파일 저장소 제공

### 웹을 위해 추가되는 일

- 업로드 상태 조회
- run 상태 조회
- report 목록 조회
- Agent 질의응답 연결

## 3. 데이터 설계 원칙

### 3.1 company_key 중심

API는 항상 `company_key` 기준으로 움직인다.

### 3.2 run 중심

실행 결과와 상태 조회는 `run_id` 기준으로 추적한다.

### 3.3 계산 노출이 아니라 실행/조회 연결

웹은 KPI 공식을 노출받는 것이 아니다.
웹에서 필요한 입력/실행/조회 흐름만 연결하면 된다.

### 3.4 설명 가능한 응답

단순 코드값만 보내지 않는다.
가능하면 사람이 읽는 설명도 같이 보낸다.

## 4. 데이터 그룹

## 4.1 Companies API

목적:

- 회사 목록 조회
- 현재 선택 가능한 회사 확인
- 회사 상세 정보 조회

예상 엔드포인트:

- `GET /api/companies`
- `GET /api/companies/{companyKey}`
- `POST /api/companies`
- `PATCH /api/companies/{companyKey}`

## 4.2 Uploads API

목적:

- raw 파일 업로드
- 저장된 파일 상태 조회
- 월별 raw 업로드 상태 조회

예상 엔드포인트:

- `POST /api/companies/{companyKey}/uploads`
- `GET /api/companies/{companyKey}/uploads`
- `DELETE /api/companies/{companyKey}/uploads/{uploadId}`

## 4.3 Pipeline Runs API

목적:

- 파이프라인 실행 시작
- run 상태 조회
- run 목록 조회

예상 엔드포인트:

- `POST /api/companies/{companyKey}/pipeline-runs`
- `GET /api/companies/{companyKey}/pipeline-runs`
- `GET /api/companies/{companyKey}/pipeline-runs/{runId}`

## 4.4 Artifacts API

목적:

- run별 결과 파일 목록 확인
- artifact 메타데이터 확인

예상 엔드포인트:

- `GET /api/companies/{companyKey}/pipeline-runs/{runId}/artifacts`
- `GET /api/companies/{companyKey}/artifacts`

## 4.5 Reports API

목적:

- 보고서 목록 확인
- 보고서 열람/다운로드 정보 제공

예상 엔드포인트:

- `GET /api/companies/{companyKey}/reports`
- `GET /api/companies/{companyKey}/reports/{reportKey}`

## 4.6 Agent API

목적:

- 특정 run 기준 질문
- 답변과 근거 반환

예상 엔드포인트:

- `POST /api/companies/{companyKey}/agent/chat`
- `GET /api/companies/{companyKey}/agent/chats/{chatId}`

## 5. 최소 데이터 구조 1차 확정안

초기 MVP에서 먼저 필요한 테이블 또는 저장 단위는 아래다.

- `companies`
- `uploads`
- `pipeline_runs`
- `pipeline_run_steps`
- `artifacts`
- `reports`

Agent는 2차로 미뤄도 된다.

## 6. 엔드포인트별 요구사항

## 6.1 회사 목록 조회

### 목적

- 회사 선택 드롭다운 구성
- 기본 정보 표시

### 응답에 필요한 필드

- `company_key`
- `company_name`
- `is_active`
- `last_run_status`
- `last_run_at`

## 6.2 회사 상세 조회

### 목적

- 현재 회사의 기본 문맥 제공
- Workspace 화면 초기 데이터 제공

### 응답에 필요한 필드

- `company_key`
- `company_name`
- `available_sources`
- `last_run_summary`
- `available_reports`

## 6.3 업로드 API

### 목적

- 파일 업로드
- source type 식별
- 월별 raw 처리

### 요청에 필요한 필드

- 파일
- `source_type`
- `is_monthly`
- `period` 또는 파일명 기반 월 정보

### 응답에 필요한 필드

- `upload_id`
- `file_name`
- `saved_path`
- `status`
- `detected_period`

## 6.4 업로드 목록 조회

### 목적

- 저장된 입력 상태를 확인
- 실행 준비 상태를 보여주기 위함

### 응답에 필요한 필드

- `source_type`
- `file_name`
- `uploaded_at`
- `status`
- `is_monthly`

## 6.5 실행 시작 API

### 목적

- 실행 모드 전달
- 새 run 생성
- 백엔드 실행 시작

### 요청에 필요한 필드

- `execution_mode`
- `requested_by`
- 필요 시 `confirm_flags`

### 응답에 필요한 필드

- `run_id`
- `status`
- `started_at`
- `execution_mode`

## 6.6 run 목록 조회

### 목적

- 실행 이력 리스트 구성

### 응답에 필요한 필드

- `run_id`
- `execution_mode`
- `status`
- `overall_score`
- `started_at`
- `finished_at`

## 6.7 run 상세 조회

### 목적

- 단계별 상태 표시
- reasoning 표시
- 보고서/아티팩트 연결

### 응답에 필요한 필드

- `run_id`
- `company_key`
- `execution_mode`
- `status`
- `overall_score`
- `started_at`
- `finished_at`
- `steps`
- `summary`
- `reports`

## 6.8 artifacts 조회

### 목적

- run별 산출물 목록 제공

### 응답에 필요한 필드

- `artifact_id`
- `artifact_type`
- `module_name`
- `file_name`
- `path`
- `created_at`

## 6.9 reports 조회

### 목적

- 어떤 HTML 보고서가 준비되어 있는지 보여주기 위함

### 응답에 필요한 필드

- `report_key`
- `report_name`
- `status`
- `generated_at`
- `run_id`
- `open_url`
- `download_url`

## 7. 응답 원칙

### 7.1 공통 응답 필드

가능하면 아래를 공통으로 유지한다.

- `success`
- `message`
- `data`

### 7.2 상태 응답 원칙

상태는 아래 기준을 우선한다.

- `ready`
- `running`
- `pass`
- `warn`
- `fail`
- `approved`

### 7.3 설명 문장 포함

경고나 실패는 코드만 주지 않는다.
짧은 설명 문장도 함께 준다.

## 8. 실행 상태 처리 전략

초기에는 polling 방식으로 간다.

흐름:

1. 프론트가 실행 요청을 등록
2. Supabase에 `run_id`와 `pending` 상태 저장
3. Python worker가 `pending` run을 가져감
4. worker가 단계 상태를 갱신
5. 프론트가 일정 간격으로 상태 조회
6. 완료되면 결과 카드와 보고서 목록 표시

이 방식의 장점:

- 단순하다
- 구현이 쉽다
- 운영 안정성이 높다

## 9. 업로드 처리 원칙

- 파일은 `company_key` 기준 저장
- source type을 명확히 식별
- 월별 raw는 월 메타를 유지
- 업로드 성공과 실행 준비 완료는 다르다는 점을 API도 반영

## 10. report 처리 원칙

- Builder가 생성한 결과를 그대로 존중
- 웹 API는 보고서 생성기가 아니라 보고서 연결 계층
- 보고서가 없으면 비활성 사유를 반환하는 것이 좋다

## 11. Agent 처리 원칙

- Agent는 KPI를 계산하지 않는다.
- Agent는 `run_report_context`, `run_artifacts`, 최신 run bundle을 읽는다.
- 응답에는 근거 artifact 정보가 함께 가는 것이 좋다.

## 12. 에러 처리 원칙

### 예시 에러 유형

- 회사 없음
- 파일 업로드 실패
- 실행 준비 미완료
- run 없음
- artifact 없음
- 내부 실행 실패

### 응답 원칙

- HTTP 상태코드 사용
- 짧은 에러 코드
- 사람이 읽는 설명 문장

## 13. 백엔드에서 하지 않을 것

- 프론트 화면 전용 계산 로직 추가
- KPI 공식 중복 구현
- Builder를 API 안에서 새 계산기로 확장
- 프론트 편의를 이유로 시스템 책임을 섞기

## 14. 구현 우선순위

1. Companies 테이블
2. Uploads 테이블 + Storage
3. Pipeline Runs 테이블
4. Pipeline Run Steps 테이블
5. Reports / Artifacts 메타
6. Agent 관련 구조

## 15. 다음 문서와 연결

이 문서를 기준으로
데이터 흐름과 API 상세 스펙 문서를 더 구체화할 수 있다.
