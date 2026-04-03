# Sales Data OS Web - 현재 구현 진행사항

작성일: 2026-03-31  
최근 업데이트: 2026-04-03  
업데이트 원칙: **현재 구현 진행사항은 이 문서에만 기록한다.**

## 최신 동기화 메모 (2026-04-03)

이 문단은 긴 이력 본문보다 우선하는 최신 기준이다.

- 공식 완료 단계:
  - `Phase 1 ~ Phase 15`
  - `Phase 17`
  - `Phase 18`
- 현재 다음 시작점:
  - `Phase 16. 보조 기능 확장`
- 공식 산출 경로:
  - `data/standard/{company_key}/...`
  - `data/validation/{company_key}/...`
- 경로 호환:
  - 코드 내부에서 과거 키(`ops_standard`, `ops_validation`)를 읽어도
    실제 저장/조회는 위 공식 경로로 매핑되게 정리했다.

실실행 확인:

- `daon_pharma` 기준 통합 실행(`integrated_full`) 성공
- 단계:
  - `crm`, `prescription`, `sandbox`, `territory`, `radar`, `builder` PASS
- 결과 보고서:
  - `crm_analysis_preview.html`
  - `sandbox_report_preview.html`
  - `prescription_flow_preview.html`
  - `territory_map_preview.html`
  - `radar_report_preview.html`
  - `total_valid_preview.html`

`2026-04-03` Phase 10 완료 메모:

- worker runtime 구현 완료
  - `workers/run_worker.py`
  - `workers/services/run_executor.py`
  - `workers/services/status_updater.py`
- 현재 동작 범위:
  - Supabase `pending` run polling
  - `pending -> running -> completed/failed` 상태 갱신
  - 실행 결과 step 요약을 `pipeline_run_steps`에 저장
  - worker 중복 실행 방지를 위한 run 선점 처리
  - 지원하지 않는 `execution_mode` 실패 처리
- 현재 실행 기준:
  - `python workers/run_worker.py --once`
  - Supabase 미설정 상태에서는 안내 문구를 출력하고 종료

`2026-04-03` Phase 10 검증 메모:

- Supabase 스키마 마이그레이션 완료
  - 기준 파일: `supabase/sales_os_supabase_schema.sql`
  - 테이블 조회 확인:
    - `company_registry`
    - `runs`, `run_steps`, `run_artifacts`, `run_report_context`, `agent_chat_logs`
    - `pipeline_runs`, `pipeline_run_steps`
- 테스트 pending run을 생성한 뒤 worker 1회 실행으로 DB 저장 확인
  - `pipeline_runs`: `pending -> running -> completed` 전환 확인
  - `pipeline_run_steps`: 6단계(step) 저장 확인
- builder 단계 초기 FAIL 원인과 조치
  - 원인: worker가 builder summary를 과거 경로(`ops_validation`)에서 읽던 경로 불일치
  - 조치: `modules/validation/workflow/execution_service.py` 경로 해석을 `get_company_root(..., "ops_validation", company_key)` 기준으로 수정
  - 결과: 재실행 기준 builder 단계 `PASS` 확인
- worker 보강 검증
  - `tests/test_workers/test_run_executor.py`
  - `tests/test_workers/test_status_updater.py`
  - `python -m pytest tests/test_workers/test_run_executor.py tests/test_workers/test_status_updater.py tests/test_scripts/test_validate_full_pipeline.py -q`
  - 결과: `5 passed`
- 프론트 연결 착수 메모
  - `Pipeline` 화면에서 run 접수 API 호출 연결
  - `Run Detail` 화면에서 `pipeline_runs`, `pipeline_run_steps` polling 연결
  - 이 부분은 `Phase 11 ~ Phase 12` 초기 연결로 보고, 공식 완료 처리에는 아직 포함하지 않음

`2026-04-03` Phase 11 ~ Phase 13 완료 메모:

- `Phase 11. 운영 진입 화면 연결` 완료
  - `Workspace`, `Upload`, `Pipeline`이 mock이 아니라 실제 회사 / 업로드 / intake / run 데이터 기준으로 동작
  - 회사 선택 문맥이 URL `company` 기준으로 유지되도록 정리
  - `Pipeline`은 intake 준비 상태가 부족하면 실행 버튼을 막고 이유를 설명하도록 연결
- `Phase 12. 실행 추적과 결과 해석 화면 연결` 완료
  - `Run Detail`에서 `pipeline_runs`, `pipeline_run_steps` polling 유지
  - Python 결과 파일인 `pipeline_validation_summary.json`, 모듈별 `*_validation_summary.json`, `builder_validation_summary.json`을 읽어
    모듈 판정, 근거 수치, builder 결과, 다음 행동 문장을 실제 데이터로 표시
  - 중요: 이 단계에서 TypeScript는 새 계산을 하지 않고 이미 저장된 결과만 읽음
- `Phase 13. 결과물 탐색 화면 연결` 완료
  - `Reports`가 실제 builder preview HTML 결과를 읽어 카드와 열기/다운로드 링크로 연결
  - `Artifacts`가 실제 validation / result asset / builder 결과 파일을 상위 목록 기준으로 표시
  - `/api/companies/{companyKey}/files` 라우트를 추가해 허용된 회사 경로 안에서만 파일 열기/다운로드 가능하게 정리
- `Phase 14. 데이터 연결 정리` 진행 메모
  - `/api/companies`
  - `/api/companies/{companyKey}/overview`
  - 회사 목록과 회사별 운영 요약을 공통 데이터 계약으로 정리 시작
  - 이후 화면이 같은 overview 계약을 보도록 정리하는 단계로 진입
- `Phase 15. RADAR 구현` 완료 메모
  - `src/lib/server/console/radar-context.ts`를 추가해 `data/validation/{company_key}/radar/radar_result_asset.json`을 읽는 전용 레이어를 만들었다
  - 중요: TypeScript는 RADAR 점수를 새로 계산하지 않고, 이미 저장된 신호/우선순위/선택지만 화면용으로 정리한다
  - `Run Detail`에 RADAR Priority 섹션을 추가해
    - 가장 먼저 볼 신호
    - 우선순위 점수
    - 근거 값
    - 가능한 대응 선택지
    를 한 번에 읽을 수 있게 했다
  - `Reports`에 RADAR 요약 블록을 추가해
    - 현재 회사 기준 최우선 이슈
    - 신호 개수
    - run / period 문맥
    - 지점/담당자 기준 하이라이트
    를 함께 보여주게 했다
- `Phase 17. Agent 구현` 완료 메모
  - `Agent` 화면을 예시 mock에서 실제 운영 해석 도구로 교체했다
  - `src/lib/server/console/agent-context.ts`에서
    - 현재 `company_key`
    - 선택 `run_id` 역할의 `runKey`
    - validation 요약
    - RADAR 요약
    - report / artifact 링크
    를 한 번에 묶는 읽기 전용 문맥 레이어를 만들었다
  - `app/api/companies/{companyKey}/agent` 라우트를 추가해 Gemini 기반 답변을 생성하게 했다
  - 중요: Agent는 계산을 하지 않고, 현재 저장된 결과만 Gemini에 전달해 해석하게 한다
  - 기본 모델은 현재 공식 문서 기준 `gemini-3.1-flash-lite-preview`로 잡았고, 환경변수 `GEMINI_MODEL`로 바꿀 수 있게 했다
  - 답변 형식은
    - 핵심 요약
    - 근거 링크
    - 다음 행동
    - 한계
    로 고정해 일반 채팅창처럼 새지 않게 제한했다
  - `POST /api/companies`는 이제 회사 등록 시 `company_key`를 사용자가 직접 받지 않고,
    서버가 랜덤 `6자리 숫자`로 생성하도록 바뀌었다

## 1. 이 문서의 목적

이 문서는 지금까지 무엇을 구현했는지,
어디까지 끝났는지,
다음에 무엇을 해야 하는지를
한 곳에서 바로 볼 수 있게 만든 현재 상태 문서다.

주의:

- 진행 체크는 `docs/task.md`를 기준으로 본다
- 실제 구현 상태 설명은 이 문서에만 누적한다
- 앞으로 새로운 진행사항은 이 문서만 업데이트한다

## 2. 현재 공식 상태

현재 공식 완료로 보는 Phase:

- `Phase 1. 기반 고정`
- `Phase 2. 앱 프레임과 디자인 베이스`
- `Phase 3. 입력 수용 구현`
- `Phase 4. 입력 검증 구현`
- `Phase 5. 정규화 구현`
- `Phase 5-1. 지저분한 raw 대응 보강`
- `Phase 6. KPI 계산과 Result Asset Base 구현`
- `Phase 7. validation 구현`
- `Phase 8. payload 조립 구현`
- `Phase 9. Builder 구현`
- `Phase 10. Worker Runtime 구현`
- `Phase 11. 운영 진입 화면 연결`
- `Phase 12. 실행 추적과 결과 해석 화면 연결`
- `Phase 13. 결과물 탐색 화면 연결`
- `Phase 14. 데이터 연결 정리`
- `Phase 15. RADAR 구현`
- `Phase 17. Agent 구현`
- `Phase 18. 운영 안정화`
 
`2026-04-03` Phase 18 진행 메모:

- 공통 로딩/에러 화면 추가
  - `app/(console)/loading.tsx`
  - `app/(console)/error.tsx`
  - 운영 화면 전반에서 첫 진입 로딩과 서버 오류를 같은 문장 규칙으로 보여주게 정리
- 운영 로그 키 정리
  - `src/lib/server/shared/ops-log.ts`
  - 회사 목록, 회사 등록, run 목록, run 생성, 파일 열기, Agent 응답에 공통 이벤트 키를 붙였다
- 테스트 보강
  - `app/api/companies/route.test.ts`
  - `app/api/companies/[companyKey]/files/route.test.ts`
  - 회사 등록 응답 구조와 파일 경로 차단을 확인하는 최소 테스트 추가
- 운영 점검 문서 추가
  - `docs/operations_runbook.md`
  - 회사 등록, run, 보고서, Agent, 공통 로그 키 확인 순서를 문서화

현재 재시작 대상으로 보는 Phase:

- `Phase 16`

현재 다음 시작점:

- `Phase 16. 보조 기능 확장`

현재 저장소 기준 실제 상태:

- `Phase 4 ~ Phase 9`에 해당하는 TypeScript 백엔드 구현은 삭제했다
- 관련 API 라우트도 함께 삭제했다
- 기존 재생성 가능 산출물도 초기화했다
  - `data/standardized`
  - `data/validation`
  - 회사별 `_intake_staging`
  - 회사별 `_onboarding`
- 원본 raw와 `monthly_raw`는 유지 중이다

중요:

- 아래 문서 본문에 남아 있는 `2026-03-31` 완료 기록은 과거 작업 이력 보존용이다
- 현재 공식 진행 기준은 `Phase 4부터 Python 백엔드 로직 기준 재시작`이다

## 3. 현재 구현된 백엔드 범위

### Phase 3. 입력 수용

구현 내용:

- `company_key` 기준 source 저장 구조 생성
- 일반 업로드 API
- 월별 업로드 API
- source 목록 조회 API
- `_onboarding/source_upload_index.json` 기준 업로드 이력 저장
- `upload_session_id`, `run_id` 문맥 저장

핵심 파일:

- `src/lib/shared/source-registry.ts`
- `src/lib/server/shared/source-storage.ts`
- `app/api/companies/[companyKey]/sources/route.ts`
- `app/api/companies/[companyKey]/sources/upload/route.ts`
- `app/api/companies/[companyKey]/sources/monthly-upload/route.ts`

### Phase 4. 입력 검증

현재 상태:

- 과거 TypeScript 구현과 API는 삭제했다
- 현재 공식 구현물로 보지 않는다
- 다음 구현은 원본 Python intake/service 규칙 기준으로 다시 시작한다
- `2026-04-02` Python intake 재구현 시작
  - `modules/intake/rules.py`
  - `modules/intake/fixers.py`
  - `modules/intake/suggestions.py`
  - `modules/intake/service.py`
  - `scripts/intake/analyze.py`
  - `_onboarding/intake_result.latest.json`, source별 onboarding package, `company_onboarding_registry.json` 저장 연결
  - 실검증:
    - `daon_pharma` -> `ready`, `ready_for_adapter=true`
    - `company_000002` -> `needs_review`, 공통 분석 구간 `202504 ~ 202506`

구현 내용:

- intake analyze / result / confirm API
- 실행 모드별 필수 source 판정
- 컬럼 사전 / alias 기준 기본 점검
- 후보 컬럼 추정
- 공통 분석 구간 계산
- `ready / ready_with_fixes / needs_review / blocked` 판정
- `_onboarding` 아래 intake 결과 이력과 source별 onboarding package 저장

중요한 해석:

- 이 단계는 엄격 차단기가 아니라 정규화로 보내기 위한 intake gate다
- `blocked`는 최소한으로만 사용한다

핵심 파일:

- 현재 없음
- 재구현 시 기준:
  - 원본 Python intake/service 규칙
  - `docs/task.md`
  - 관련 summary 문서

### Phase 5. 정규화

현재 상태:

- 과거 TypeScript 구현과 API는 삭제했다
- 현재 공식 구현물로 보지 않는다
- 다음 구현은 원본 Python normalization / adapter 기준으로 다시 시작한다
- `2026-04-02` Python normalization 재구현 시작
  - `modules/intake/staging.py`
  - `modules/normalization/service.py`
  - `scripts/normalization/normalize_all.py`
  - `scripts/normalization/normalize_crm.py`
  - `scripts/normalization/normalize_sandbox.py`
  - `scripts/normalization/normalize_prescription.py`
  - `scripts/normalization/normalize_territory.py`
  - `_intake_staging` 생성 연결
  - `data/standardized/{company_key}/{module}/` 아래 표준 결과와 `normalization_report.json` 생성 연결
  - 실검증:
    - `daon_pharma` -> CRM / Sandbox / Prescription / Territory 표준 결과 생성
    - `company_000002` -> CRM 활동 기준 실행용 assignment/account master 합성 후 표준 결과 생성
  - 검증 구조 정리:
    - 빠른 pytest: `tests/test_phase5_1.py`
    - 실데이터 스모크 검증: `scripts/smoke/validate_phase5_1.py`
    - 빠른 pytest 최근 결과: `11 passed`

구현 내용:

- 정규화 서비스 추가
- `_intake_staging/{source_key}.json` 생성
- `data/standardized/{company_key}/{module}/standardized_*.json` 생성
- 모듈별 `normalization_report.json` 생성
- 정규화 실행 API / 결과 조회 API 추가
- 공식 입력 형식을 `csv`, `xlsx` 중심으로 고정
- source별 우선 시트 이름 규칙 추가

현재 정규화 기준:

- `csv`, `xlsx`, `xls`를 공식 tabular 입력으로 본다
- `xlsx`는 source별 우선 시트 이름을 먼저 찾는다
- 시트를 못 찾으면 마지막에만 첫 번째 시트로 fallback 한다
- `tsv`, `txt`는 공식 입력 기준에서 제외했다

추가 구현 메모:

- `daon_pharma` 기준으로 공식 source 구조를 다시 정리했다
  - `account_master`
  - `crm_rep_master`
  - `crm_account_assignment`
  - `crm_rules`
  - `sales`
  - `target`
  - `prescription`
- `crm_rules`는 `CRM_KPI_FORMULA_SPEC.md` 기준으로 별도 source 파일을 두는 방향으로 정리했다
- `daon_pharma` 기준 intake는 `ready`, normalization은 실데이터 기준 재생성 확인 완료
- 다음 바로 해야 할 일은 `지저분한 raw 대응 보강`이다

핵심 파일:

- 현재 없음
- 재구현 시 기준:
  - 원본 Python normalization 절차
  - `docs/task.md`
  - 관련 summary 문서
- `src/lib/server/shared/tabular-file.ts`
- `src/lib/server/intake/schema.ts`
- `app/api/companies/[companyKey]/normalization/run/route.ts`
- `app/api/companies/[companyKey]/normalization/result/route.ts`

### Phase 5-1. 지저분한 raw 대응 보강

현재 보류 상태 메모:

- 월별 raw 병합 서비스 추가
- 공식 월별 입력 경로를 `data/company_source/{company_key}/monthly_raw/YYYYMM/` 기준으로 읽도록 연결
- 월별 병합 대상 source를 `crm_activity`, `sales`, `target`, `prescription`으로 고정
- 병합 결과를 공식 raw 경로에 다시 생성하도록 연결
- 병합 결과 요약을 `_onboarding/latest_monthly_merge_result.json`과 이력 파일로 저장
- intake analyze 시작 전에 월별 병합이 먼저 돌도록 연결
- normalization run 시작 전에도 월별 병합을 다시 확인하도록 연결
- `company_000002` 기준 실검증과 재검증까지 완료

현재 해석:

- `Phase 5-1`은 현재 완료로 본다
- 완료 기준:
  - dirty raw 기준 회사 `company_000002`로 intake / staging / normalization 재검증 완료
  - `monthly_merge_pharma` 기준 월별 병합 -> intake -> `_intake_staging` -> normalization 검증 완료
  - 빠른 pytest와 실데이터 스모크 검증 구조를 분리해 운영 가능한 검증 체계를 고정
  - 남는 일은 `Phase 6` 이후 결과 설명 고도화이며, `Phase 5-1` 자체의 입구 보강 범위는 완료로 본다

`2026-03-31` `company_000002` 실검증 메모:

- intake analyze API 실행은 성공했다
- 초기 intake 판정은 `needs_review`였다
- 확인된 주요 검토 항목:
  - `account_master`에서 `account_id`를 찾지 못했다
  - `crm_account_assignment`에서 `account_id`를 찾지 못했다
  - `target`의 `target_value`는 후보 컬럼으로만 잡혔다
  - `prescription`의 `pharmacy`, `quantity`도 후보 컬럼으로만 잡혔다
- 기간 판정에 버그가 확인됐다
  - 실제 월별 raw는 `202504 ~ 202506`인데
  - intake 결과의 기간이 `000002 ~ 000002`로 잡혔다
  - 즉 회사 코드 `company_000002`의 숫자를 월처럼 잘못 읽고 있다
- normalization run API는 `120초` 안에 완료되지 않았고,
  그 시점에 `_intake_staging`, `data/standardized/company_000002` 결과도 생성되지 않았다
- 따라서 다음 우선 보강 포인트는 아래 두 가지다
  - 월 추출 로직이 회사 코드 숫자를 월로 오인하지 않도록 수정
  - `company_000002` 기준 normalization 지연 또는 정지 원인 추적

`2026-03-31` Phase 5-1 보강 후 재검증 결과:

- intake 판정이 `ready_with_fixes`로 올라갔다
- `ready_for_adapter`가 `true`로 바뀌었다
- 공통 분석 구간이 `202504 ~ 202506` `3개월`로 정상 계산됐다
- `account_master`, `crm_account_assignment`는 원본 파일만으로 부족한 `account_id`, `account_name`를
  `sales / target` 기준 실행용 보강 대상으로 처리하도록 정리했다
- normalization run API가 실제로 완료됐다
- normalization 결과는 `completed_with_review`였다
- `_intake_staging` 아래 source별 json이 생성됐다
- `data/standardized/company_000002/` 아래 CRM / Sandbox / Prescription 표준화 결과와 `normalization_report.json`이 생성됐다
- 특히 아래 결과가 실제로 생성됐다
  - `crm/standardized_account_master.*`
  - `crm/standardized_crm_account_assignment.*`
  - `sandbox/standardized_sales_records.*`
  - `sandbox/standardized_target_records.*`
  - `prescription/standardized_prescription_records.*`
- 현재 해석:
  - `company_000002`는 이제 `intake -> normalization`까지는 실제로 다시 통과한다
  - 다음 보강 우선순위는 이 결과를 바탕으로 `validation / result explanation / 결과 탭 보완 안내`까지 연결하는 것이다

`2026-03-31` Phase 5-1 1순위 보강 추가 결과:

- `account_master`, `crm_rules` alias / rules 범위를 더 넓혀 지저분한 컬럼명 흔들림을 더 잘 흡수하도록 보강했다
- 정규화 단계에 `공백/빈값 정리`, `중복 행 제거`, `appliedFixes 기록`을 추가했다
- `_intake_staging`과 `data/standardized/...` 결과에 어떤 자동 보정을 했는지 함께 남기도록 정리했다
- `account_master`, `crm_account_assignment`는 `derived_from_support_sources` 기준 실행용 보강으로 기록되도록 바꿨다
- 새 프로덕션 서버 `3003` 기준으로 `company_000002`를 다시 검증했다
  - intake는 `ready_with_fixes`
  - normalization은 `completed_with_review`
  - `crm_activity`, `sales`, `target`, `prescription`에서 중복 제거와 공백/빈값 정리 기록이 실제로 남았다
  - `account_master_onboarding_package.json`에도 source별 fix 설명이 저장되는 것을 확인했다

`2026-03-31` Phase 5-1 2순위 보강 추가 결과:

- `_onboarding/column_mapping_registry.json` 파일을 추가해 source별 확정 매핑을 저장하도록 정리했다
- intake analyze 후 `crm_activity`, `sales`, `target`, `prescription` 등 source별 canonical header가 registry에 누적되는 것을 확인했다
- normalization run 후 `account_master`, `crm_account_assignment`의 `derived_columns`도 registry에 함께 남도록 연결했다
- intake와 normalization은 이제 저장된 registry를 읽어 다음 실행에서 같은 컬럼 구조를 다시 사용할 수 있다
- registry 저장 중 동시 덮어쓰기 문제가 보였기 때문에
  - registry 쓰기를 원자적 저장 방식으로 바꿨고
  - intake 쪽 registry 누적도 순차 저장으로 고쳤다
- 새 프로덕션 서버 `3005` 기준 검증 결과:
  - intake analyze 성공
  - registry 파일 생성 확인
  - normalization run 성공
  - registry에 source별 canonical header와 derived column이 정상 저장되는 것 확인

`2026-03-31` Phase 5-1 3순위 테스트 고정 결과:

- Vitest 실행 환경을 붙이기 위해 `vitest.config.ts`를 추가했다
- `src/lib/server/phase5-1.test.ts`에 Phase 5-1 핵심 테스트 3개를 추가했다
  - 필수 source 부재 시 `blocked`
  - 월별 raw 병합 후 공식 raw 생성
  - dirty raw가 `intake -> normalization -> _intake_staging -> registry`까지 이어지는지 확인
- 테스트 안에서는 임시 회사 데이터를 직접 만들고 지우는 방식으로 실제 파일 흐름을 검증했다
- 실행 결과:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과
  - `3 tests passed`

`2026-03-31` Phase 5-1 월별 파일명 규칙 완화 결과:

- 월별 병합은 이제 월 폴더 안에서 아래 파일명을 모두 허용한다
  - 기본형: `sales_raw.xlsx`
  - 월 suffix 허용형: `sales_raw_202504.xlsx`, `sales_raw202504.xlsx`, `sales_raw-202504.xlsx`
- 규칙은 `crm_activity`, `sales`, `target`, `prescription`에 동일하게 적용되도록 정리했다
- 월 폴더는 여전히 `YYYYMM`만 허용하고,
  파일명 뒤에 붙는 숫자도 해당 월 숫자와 같을 때만 병합 대상으로 읽는다
- 테스트를 2개 더 추가했다
  - 월 suffix 파일명 병합 테스트
  - 일부 월만 source 파일이 있어도 있는 월만 병합되는지 테스트
- 실행 결과:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과
  - `5 tests passed`

`2026-03-31` Phase 5-1 잔여 테스트 마무리 결과:

- 테스트를 `12개`까지 늘려 남아 있던 주요 분기와 예외를 추가로 고정했다
- 새로 확인한 항목:
  - 정상 raw는 `ready`로 통과하는지
  - 후보 컬럼이 있으면 `ready_with_fixes`로 계속 진행되는지
  - 후보도 없으면 `needs_review`로 내려가는지
  - 날짜 / 월 값이 표준 형식으로 자동 정리되는지
  - `crm_rep_master`가 약할 때 support source 기반 보강이 되는지
  - 일반 업로드 raw가 더 최신이면 월별 병합보다 우선하는지
  - 일부 source만 월별 파일이 있을 때 없는 source는 `no_monthly_files`로 남는지
  - 파일명은 맞아 보여도 확장자가 다르면 병합 대상에서 제외되는지
  - 월별 합계 행 수와 merged 결과 행 수 비교가 가능한지
- 월별 병합 메타도 보강했다
  - source별 월 파일 행 수 저장
  - 월별 합계 행 수 저장
  - merged 결과와 월별 합계 일치 여부 저장
- 자동 생성된 실행용 컬럼은 `appliedFixes`에 컬럼명까지 남기도록 정리했다
- 실행 결과:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과
  - `12 tests passed`

핵심 파일:

- `src/lib/server/intake/monthly-merge.ts`
- `src/lib/server/intake/analyze.ts`
- `src/lib/server/normalization/run.ts`
- `src/lib/server/shared/source-storage.ts`

## 4. 현재 고정된 구현 원칙

- 프론트는 계산하지 않는다
- intake는 차단보다 자동보정과 다음 단계 연결이 우선이다
- 정규화는 회사별 raw를 표준 입력 구조로 바꾸는 단계다
- KPI 계산은 `modules/kpi/*` 단일 소스로 구현해야 한다
- validation은 KPI 이후 전달 판단 레이어다
- Builder는 payload 소비 전용이다

## 5. 다음 구현 우선순위

바로 다음 작업:

1. `Phase 4 ~ Phase 9` 백엔드 재시작
2. 그 다음 `Phase 10. Worker Runtime 구현`
3. 그 다음 `Phase 11 ~ Phase 14` 프론트 연결
4. 이후 `Phase 15 ~ Phase 18` 확장 및 안정화

`2026-04-02` 재정렬 판단:

- `Phase 3`의 업로드/원본 저장 껍데기는 유지 가능하다
- 하지만 `Phase 4 ~ Phase 9`는 현재 완료로 볼 수 없다
- 이유:
  - 원본 `Sales Data OS`의 intake, monthly merge, normalization, KPI, validation, builder 흐름은 Python 기준인데
  - 현재 `sales_os`는 중간 단계와 계산 단계를 TypeScript 기준으로 재구성한 부분이 섞여 있다
  - 특히 KPI/result asset 단계는 `modules/kpi/*.py` 연결이 아니라
    `src/lib/server/kpi/*.ts` 재계산 방식으로 구현돼 있어 공식 숫자 기준으로 사용할 수 없다

따라서 현재 공식 재시작 기준은 아래와 같다.

1. `Phase 4`
- Python intake/service 규칙 기준으로 다시 구현

2. `Phase 5`
- Python normalization / adapter 기준으로 다시 구현

3. `Phase 5-1`
- Python monthly merge / dirty raw intake / staging 기준으로 다시 구현

4. `Phase 6`
- Python KPI 엔진 연결 기준으로 다시 구현

5. `Phase 7`
- Python 계산 결과 기준 validation으로 다시 구현

6. `Phase 8`
- Python 결과 기준 payload 조립으로 다시 구현

7. `Phase 9`
- Python 결과 기준 Builder 검증으로 다시 구현

`Phase 6 ~ 10` 문서 기준 정리:

1. `Phase 6`
- 먼저 `CRM -> Sandbox` 순서로 구현
- 참고 문서:
  - `docs/task.md`
  - `docs/summary/phase6_kpi_engine_and_result_asset_research_20260331.md`
  - `docs/summary/kpi_module_research_20260331.md`

2. `Phase 7`
- `result asset`를 읽고 `WARN / FAIL / handoff` 이유를 만드는 단계
- 참고 문서:
  - `docs/task.md`
  - `docs/summary/original_project_validation_layer_research_20260331.md`

3. `Phase 8`
- Builder가 읽을 `payload`를 만드는 단계
- 참고 문서:
  - `docs/task.md`
  - `docs/summary/original_project_result_asset_payload_artifact_research_20260331.md`

4. `Phase 9`
- `templates/` 템플릿에 실제 payload를 주입하는 단계
- 참고 경로:
  - `templates/crm_analysis_template.html`
  - `templates/report_template.html`
  - `templates/territory_optimizer_template.html`
  - `templates/prescription_flow_template.html`
  - `templates/radar_report_template.html`

5. `Phase 10`
- worker가 `intake -> normalization -> kpi -> validation -> payload -> builder` 순서를 한 run으로 묶는 단계
- 참고 문서:
  - `docs/task.md`
  - `docs/summary/original_project_worker_runtime_research_20260331.md`

`2026-04-02` Phase 6 상태 재판정:

- 기존 `Phase 6 완료` 기록은 더 이상 현재 공식 상태로 보지 않는다
- 이유:
  - 공식 KPI 계산은 `modules/kpi/*` Python 엔진이어야 하는데
  - 현재 구현은 TypeScript 서버 코드가 계산을 다시 하고 있기 때문이다
- 따라서 당시 기준으로 `Phase 6`은 `미완료 / 재시작 필요` 상태로 되돌렸다

`2026-04-02` Phase 6 CRM / Sandbox Python 재구현 진행 메모:

- `modules/kpi/crm_engine.py`, `modules/kpi/sandbox_engine.py`를 현재 Python 기준 KPI 엔진 시작점으로 유지한다
- `modules/crm/service.py`를 추가했다
  - `data/standardized/{company_key}/crm/*`를 읽는다
  - CRM KPI 계산을 실행한다
  - `data/result_assets/{company_key}/crm/crm_result_asset.json`을 저장한다
- `modules/sandbox/service.py`를 추가했다
  - `data/standardized/{company_key}/sandbox/*`를 읽는다
  - Sandbox KPI 6 계산을 실행한다
  - `data/result_assets/{company_key}/sandbox/sandbox_result_asset.json`을 저장한다
- `modules/prescription/service.py`를 추가했다
  - `data/standardized/{company_key}/prescription/*`를 읽는다
  - 처방 흐름 요약과 전달용 설명 데이터를 만든다
  - `data/result_assets/{company_key}/prescription/prescription_result_asset.json`을 저장한다
- `modules/territory/service.py`를 추가했다
  - `data/standardized/{company_key}/territory/*`를 읽는다
  - 담당자별 활동 범위와 지도용 문맥 데이터를 만든다
  - `data/result_assets/{company_key}/territory/territory_result_asset.json`을 저장한다
- `modules/radar/service.py`를 추가했다
  - 기존 `crm / sandbox / prescription / territory` result asset을 읽는다
  - KPI 재계산 없이 신호, 우선순위, 액션 후보를 만든다
  - `data/result_assets/{company_key}/radar/radar_result_asset.json`을 저장한다
- 실행 스크립트를 추가했다
  - `scripts/kpi/run_crm_kpi.py`
  - `scripts/kpi/run_sandbox_kpi.py`
  - `scripts/kpi/run_prescription_kpi.py`
  - `scripts/kpi/run_territory_kpi.py`
  - `scripts/kpi/run_radar_kpi.py`
- 테스트를 추가했다
  - `tests/test_phase6_kpi.py`
- 검증:
  - `python -m pytest tests/test_phase6_kpi.py` 통과
  - `python scripts/kpi/run_crm_kpi.py --company-key daon_pharma` 실행 확인
  - `python scripts/kpi/run_sandbox_kpi.py --company-key daon_pharma` 실행 확인
  - `python scripts/kpi/run_prescription_kpi.py --company-key daon_pharma` 실행 확인
  - `python scripts/kpi/run_territory_kpi.py --company-key daon_pharma` 실행 확인
  - `python scripts/kpi/run_radar_kpi.py --company-key daon_pharma` 실행 확인
- 현재 해석:
  - `CRM`, `Sandbox`, `Prescription`, `Territory`, `RADAR`는 Python 기준 `표준화/기존 결과 읽기 -> KPI/문맥/신호 계산 -> result asset 저장`까지 1차 연결됐다
  - 현재 기준 `Phase 6 완료`로 본다
  - 남는 일은 세부 지표 정밀도 보강과 payload/builder 연결 고도화다

과거 구현 기록 보존 메모:

- 아래 `2026-03-31` 기록은 당시 작업 이력 보존용으로만 남긴다
- 현재 공식 진행 기준으로는 완료 판정에 사용하지 않는다

`2026-03-31` Phase 6 완료 상태:

- `src/lib/server/kpi.ts`를 추가했다
- 현재는 `CRM KPI -> crm_result_asset.json`, `Sandbox KPI 6 -> sandbox_result_asset.json`까지 생성된다
- 저장 경로는 `data/validation/{company_key}/crm/`, `data/validation/{company_key}/sandbox/` 기준으로 맞췄다
- API를 추가했다
  - `POST /api/companies/{companyKey}/kpi/run`
  - `GET /api/companies/{companyKey}/kpi/result`
- `runKpi`는 `intake -> normalization -> kpi` 흐름이 이어지도록 연결했다
- 테스트를 추가했다
  - `src/lib/server/kpi/kpi.test.ts`
  - clean 샘플 회사 / `company_000002` 기준 통과 확인
- 현재 해석:
  - `Phase 6`은 완료다
  - `CRM / Sandbox / Territory / Prescription / RADAR`까지 result asset 생성이 실제로 연결됐다
  - 모듈별 result 조회 API도 분리됐다

`2026-03-31` Phase 6 구조 리팩토링 시작:

- `src/lib/server/kpi.ts`를 계속 키우지 않고 역할별 파일로 나누기 시작했다
- 현재 분리한 파일:
  - `src/lib/server/kpi/run.ts`
  - `src/lib/server/kpi/types.ts`
  - `src/lib/server/kpi/shared.ts`
  - `src/lib/server/kpi/crm.ts`
  - `src/lib/server/kpi/sandbox.ts`
- 의미:
  - `run.ts`는 실행 시작점
  - `shared.ts`는 공통 읽기/쓰기와 숫자/날짜 유틸
  - `crm.ts`, `sandbox.ts`는 모듈별 계산
- 테스트도 단계명 기준 파일에서 모듈 기준 파일로 옮겼다
  - `src/lib/server/phase6.test.ts` -> `src/lib/server/kpi/kpi.test.ts`

`2026-03-31` 공통/입력/정규화 파일 구조도 정리:

- `src/lib/shared/`
  - `mock-data.ts`
  - `placeholder.ts`
  - `source-registry.ts`
- `src/lib/server/shared/`
  - `source-storage.ts`
  - `tabular-file.ts`
- `src/lib/server/intake/`
  - `analyze.ts`
  - `registry.ts`
  - `monthly-merge.ts`
  - `schema.ts`
  - `intake-normalization.test.ts`
- `src/lib/server/normalization/`
  - `run.ts`
- 기존 경로는 연결 파일로 남겨서 현재 API와 화면 import는 바로 유지되게 했다
- 검증:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과

`2026-04-02` Phase 7 상태 재판정:

- 기존 `Phase 7 완료` 기록도 현재 공식 상태로 보지 않는다
- 이유:
  - validation은 KPI 이후 전달 판단 레이어인데,
    앞단 KPI/result asset가 TypeScript 재계산 기준이면 validation도 공식 결과가 아니다
- 따라서 당시 기준으로 `Phase 7`은 `미완료 / 재시작 필요` 상태로 되돌렸다

`2026-04-02` Phase 7 Python validation 재구현 메모:

- `modules/validation/service.py`를 추가했다
  - `crm / prescription / sandbox / territory / radar` result asset을 읽는다
  - 모듈별 `quality_status / quality_score / reasoning_note / next_modules / gate_details`를 만든다
  - `data/validation/{company_key}/{module}/*_validation_summary.json`을 저장한다
  - `data/validation/{company_key}/_meta/latest_validation_summary.json`을 함께 저장한다
- 실행 스크립트를 추가했다
  - `scripts/validation/run_validation.py`
- 테스트를 추가했다
  - `tests/test_phase6_kpi.py` 안 validation 통합 테스트 확장
- 검증:
  - `python -m pytest tests/test_phase6_kpi.py` 통과
  - `python scripts/validation/run_validation.py --company-key daon_pharma` 실행 확인
- 현재 해석:
  - `Phase 7`은 Python result asset 기준 validation summary 생성과 전체 요약 생성까지 완료로 본다
  - 다음 시작점은 `Phase 8 payload 조립 구현`이다

`2026-04-02` Phase 8 payload 조립 구현 메모:

- `modules/payloads/service.py`를 추가했다
  - `result asset`와 `validation summary`만 읽는다
  - Builder가 읽을 `builder payload`를 모듈별로 조립한다
  - Builder가 읽을 `builder input standard`도 함께 저장한다
  - 계산은 이 단계에서 다시 하지 않는다
- 저장 파일:
  - `data/validation/{company_key}/crm/crm_builder_payload.json`
  - `data/validation/{company_key}/sandbox/sandbox_builder_payload.json`
  - `data/validation/{company_key}/prescription/prescription_builder_payload.json`
  - `data/validation/{company_key}/territory/territory_builder_payload.json`
  - `data/validation/{company_key}/radar/radar_builder_payload.json`
  - `data/validation/{company_key}/builder/{module}_builder_input_standard.json`
  - `data/validation/{company_key}/builder/builder_payload_index.json`
- 실행 스크립트를 추가했다
  - `scripts/payloads/build_payloads.py`
- 테스트를 추가했다
  - `tests/test_phase6_kpi.py` 안 payload 통합 테스트 확장
- 검증:
  - `python -m pytest tests/test_phase6_kpi.py` 통과
  - `python scripts/payloads/build_payloads.py --company-key daon_pharma` 실행 확인
- 현재 해석:
  - `Phase 8`은 Builder가 계산 없이 payload와 input standard만 읽을 수 있는 상태까지 완료로 본다
  - 다음 시작점은 `Phase 9 Builder 구현`이다

`2026-03-31` Phase 7 완료 상태:

- `src/lib/server/validation/run.ts`를 추가했다
- `validation`은 이제 각 모듈 result asset를 읽어
  - `quality_status`
  - `quality_score`
  - `reasoning_note`
  - `next_modules`
  - `gate_details`
  를 만든다
- 현재 저장되는 파일:
  - `data/validation/{company_key}/crm/crm_validation_summary.json`
  - `data/validation/{company_key}/sandbox/sandbox_validation_summary.json`
  - `data/validation/{company_key}/prescription/prescription_validation_summary.json`
  - `data/validation/{company_key}/territory/territory_validation_summary.json`
  - `data/validation/{company_key}/radar/radar_validation_summary.json`
  - `data/validation/{company_key}/_meta/latest_validation_summary.json`
  - `data/validation/{company_key}/_meta/latest_pipeline_summary.json`
  - `data/validation/{company_key}/runs/{run_id}/run_meta.json`
  - `data/validation/{company_key}/runs/{run_id}/pipeline_summary.json`
  - `data/validation/{company_key}/runs/{run_id}/artifacts.index.json`
  - `data/validation/{company_key}/runs/{run_id}/report_context.full.json`
  - `data/validation/{company_key}/runs/{run_id}/report_context.prompt.json`
  - `data/validation/{company_key}/runs/{run_id}/execution_analysis.md`
- API를 추가했다
  - `POST /api/companies/{companyKey}/validation/run`
  - `GET /api/companies/{companyKey}/validation/summary`
  - `GET /api/companies/{companyKey}/validation/summary/{moduleKey}`
  - `GET /api/companies/{companyKey}/runs`
  - `GET /api/companies/{companyKey}/runs/{runId}/summary`
  - `GET /api/companies/{companyKey}/runs/{runId}/artifacts`
  - `GET /api/companies/{companyKey}/runs/{runId}/report-context`
- `validation summary` 안에는 이제 사람 읽는 근거 목록 `evidence`도 같이 저장된다
- 현재 해석:
  - `Phase 7`은 최소 구현 기준으로 완료다
  - 모듈별 summary 조회, evidence, run 이력, linked artifacts까지 동작한다
  - `runs/{run_id}` 기준 pipeline bundle과 설명 문맥 파일도 함께 생성된다
  - 다음 시작점은 `Phase 8 payload 조립`이다
- 검증:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과

`2026-03-31` Phase 6 추가 구현:

- `src/lib/server/kpi/prescription.ts`를 추가했다
- `src/lib/server/kpi/territory.ts`를 추가했다
- `runKpi`가 이제 아래 5개 result asset를 생성한다
  - `crm_result_asset.json`
  - `sandbox_result_asset.json`
  - `territory_result_asset.json`
  - `prescription_result_asset.json`
  - `radar_result_asset.json`
- 이번 버전의 의미:
  - `Prescription`은 흐름/누락/영역별 요약을 담는 최소 자산
  - `Territory`는 커버리지/병원목록/담당자별 요약을 담는 최소 자산
- `RADAR`는 KPI를 다시 계산하지 않고, 이미 만든 result asset 위에서 우선 신호와 의사결정 옵션 상자를 만든다
- 테스트도 5개 모듈 파일 생성 기준으로 갱신했다
- 모듈별 result 조회 API도 분리했다
  - `GET /api/companies/{companyKey}/kpi/result/{moduleKey}`
  - 지원 모듈: `crm`, `sandbox`, `territory`, `prescription`, `radar`
- 저장 경로 해석 메모:
  - 현재 `result asset`는 `data/validation/{company_key}/{module}/` 아래에 저장한다
  - 이 경로의 `validation`은 “validation 완료본만 두는 폴더”가 아니라
    “정규화 이후 result asset, validation, payload, builder 산출물이 모이는 운영 결과 루트”로 읽는 것이 맞다
  - 원본 프로젝트와 현재 설계 문서도 이 해석에 맞는다
- 검증:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과

`2026-03-31` Validation 3개 회사 실검증:

- 대상 회사:
  - `company_000002`
  - `daon_pharma`
  - `monthly_merge_pharma`
- 공통 결과:
  - `CRM`: `PASS`
  - `Sandbox`: `PASS`
  - `Prescription`: `PASS`
  - `Territory`: `FAIL`
  - `RADAR`: `APPROVED`
  - 전체 상태: `WARN`
- 현재 해석:
  - 이 결과는 현재 버그라기보다,
    로우 생성기 기반 테스트 데이터라 `Territory`가 필요로 하는 동선/권역 재료가 약해서 나온 정상 결과로 본다
  - 즉 `Territory FAIL`은 계산기 오류보다 데이터 성격 반영에 가깝다
- 추가 메모:
  - 위 평가는 `validation 단계 판정` 기준이다
  - 이후 `daon_pharma` Builder 복원 작업으로 Territory 화면 주입 자체는 정상화됐다
  - 즉 현재는 `validation FAIL`과 `Builder 화면 비정상`을 같은 문제로 보지 않는다
- 테스트:
  - `src/lib/server/validation/validation-3companies.test.ts`
  - `pnpm test` 기준 전체 `18개 테스트` 통과

`2026-04-02` Phase 8 상태 재판정:

- 기존 `Phase 8 완료` 기록도 현재 공식 상태로 보지 않는다
- 이유:
  - builder payload는 공식 result asset / validation 결과를 기준으로 조립돼야 하는데,
    현재 앞단이 TS 재계산 기준이므로 payload 역시 다시 만들어야 한다
- 따라서 `Phase 8`은 `미완료 / 재시작 필요` 상태로 되돌린다

`2026-03-31` Phase 8 완료 상태:

- `src/lib/server/builder/run.ts`, `src/lib/server/builder/types.ts`를 추가했다
- 목적은 `validation` 다음 단계에서 Builder가 raw나 KPI를 다시 계산하지 않고,
  이미 승인된 `result asset + validation summary`를 화면용 payload로만 읽게 만드는 것이다
- 현재 생성되는 대표 파일:
  - `data/validation/{company_key}/crm/crm_builder_payload.json`
  - `data/validation/{company_key}/sandbox/sandbox_builder_payload.json`
  - `data/validation/{company_key}/territory/territory_builder_payload.json`
  - `data/validation/{company_key}/prescription/prescription_builder_payload.json`
  - `data/validation/{company_key}/radar/radar_builder_payload.json`
  - `data/validation/{company_key}/builder/{module}_builder_input_standard.json`
  - `data/validation/{company_key}/builder/latest_payload_result.json`
  - `data/validation/{company_key}/builder/builder_payload_index.json`
  - `data/validation/{company_key}/runs/{run_id}/builder_payload_index.json`
- 추가한 API:
  - `POST /api/companies/{companyKey}/payload/run`
  - `GET /api/companies/{companyKey}/payload/result`
  - `GET /api/companies/{companyKey}/payload/result/{moduleKey}`
- run bundle 연결:
  - `artifacts.index.json`에 `builder_payload`, `builder_input_standard`, `payload_index`가 추가된다
  - `report_context.full.json`, `report_context.prompt.json`에도 payload 연결 정보가 함께 들어간다
- 현재 해석:
  - `Phase 8`은 완료다
  - 이제 Builder는 다음 단계에서 모듈별 payload와 input standard를 바로 읽을 수 있다
  - 다음 구현 초점은 `Phase 9`에서 이 payload를 실제 HTML 템플릿에 주입하는 일이다
- 검증:
  - `src/lib/server/builder/builder.test.ts` 추가
  - `pnpm typecheck` 통과
  - `pnpm test` 통과
  - 전체 `19개 테스트` 통과

`2026-04-02` Phase 9 상태 재판정:

- 기존 `Phase 9 완료` 기록도 현재 공식 상태로 보지 않는다
- 이유:
  - Builder 자체는 render-only여야 맞지만,
    현재 입력 payload와 preview 검증은 TS 재계산 결과 위에 서 있다
- 따라서 당시 기준으로 `Phase 9`는 `미완료 / 재시작 필요` 상태로 되돌렸다

`2026-04-02` Phase 9 Builder 재구현 메모:

- `modules/builder/service.py`를 추가했다
  - `builder_input_standard`와 `builder payload`만 읽는다
  - 템플릿 HTML에 payload를 주입해 preview HTML을 만든다
  - preview용 `input_standard`, `payload_standard`, `result_asset`를 같이 저장한다
  - Builder는 계산하지 않는다
- 실행 스크립트를 추가했다
  - `scripts/validate_builder_with_ops.py`
- 현재 생성되는 대표 파일:
  - `data/validation/{company_key}/builder/crm_analysis_preview.html`
  - `data/validation/{company_key}/builder/sandbox_report_preview.html`
  - `data/validation/{company_key}/builder/territory_map_preview.html`
  - `data/validation/{company_key}/builder/prescription_flow_preview.html`
  - `data/validation/{company_key}/builder/radar_report_preview.html`
  - `data/validation/{company_key}/builder/*_preview_input_standard.json`
  - `data/validation/{company_key}/builder/*_preview_payload_standard.json`
  - `data/validation/{company_key}/builder/*_preview_result_asset.json`
  - `data/validation/{company_key}/builder/builder_validation_summary.json`
  - `data/validation/{company_key}/builder/total_valid_preview.html`
- 테스트를 추가했다
  - `tests/test_phase6_kpi.py` 안 builder preview 통합 테스트 확장
- 검증:
  - `python -m pytest tests/test_phase6_kpi.py` 통과
  - `$env:OPS_COMPANY_KEY='daon_pharma'; python scripts/validate_builder_with_ops.py` 실행 확인
- 현재 해석:
  - `Phase 9`는 payload만 읽는 Builder preview 생성 기준으로 완료로 본다
  - 다음 시작점은 `Phase 10 Worker Runtime 구현`이다

`2026-03-31` Phase 9 완료 상태:

- `src/lib/server/builder/render.ts`를 추가했다
- 목적은 `Phase 8`에서 만든 payload를 실제 템플릿 HTML에 넣어
  모듈별 preview 결과물과 Builder 표준 파일을 생성하는 것이다
- 현재 생성되는 대표 파일:
  - `data/validation/{company_key}/builder/crm_analysis_preview.html`
  - `data/validation/{company_key}/builder/sandbox_report_preview.html`
  - `data/validation/{company_key}/builder/territory_map_preview.html`
  - `data/validation/{company_key}/builder/prescription_flow_preview.html`
  - `data/validation/{company_key}/builder/radar_report_preview.html`
  - `data/validation/{company_key}/builder/*_preview_input_standard.json`
  - `data/validation/{company_key}/builder/*_preview_payload_standard.json`
  - `data/validation/{company_key}/builder/*_preview_result_asset.json`
  - `data/validation/{company_key}/builder/builder_validation_summary.json`
  - `data/validation/{company_key}/builder/total_valid_preview.html`
- 추가한 API:
  - `POST /api/companies/{companyKey}/builder/render`
  - `GET /api/companies/{companyKey}/builder/reports`
  - `GET /api/companies/{companyKey}/builder/reports/{reportType}`
  - `GET /api/companies/{companyKey}/builder/artifacts`
- run bundle 연결:
  - `runs/{run_id}/builder_reports_index.json` 생성
  - `artifacts.index.json`에 `builder_html`, `builder_preview_result_asset`, `builder_reports_index`가 추가된다
  - `report_context.full.json`, `report_context.prompt.json`에도 builder reports 연결 정보가 함께 들어간다
- 현재 해석:
  - `Phase 9`는 최소 버전 기준으로 완료다
  - Builder는 이제 payload만 읽어 모듈별 preview HTML과 표준 결과 파일을 실제로 생성한다
  - 다음 시작점은 `Phase 10 Worker Runtime 구현`이다
- 검증:
  - `pnpm typecheck` 통과
  - `pnpm test` 통과
  - 전체 `20개 테스트` 통과

`2026-03-31` Phase 9 Territory/CRM 템플릿 복원 보강:

- 템플릿 디자인 파일은 수정하지 않고,
  현재 프로젝트 경로 기준 `result asset -> payload -> preview html` 주입 경로만 다시 맞췄다
- `CRM`은 원본 payload 계약에 맞게 다시 조립했다
  - 11대 지표
  - scope 데이터
  - 팀/담당자/기간 선택 구조
  - lazy-load용 scope chunk 분리
- `Territory`는 원본 방식에 가깝게 lazy-load 구조를 다시 만들었다
  - 담당자별 catalog chunk
  - 월별 month chunk
  - 월/일 선택 구조
  - 병원 마커 좌표
  - 이동거리 / 반경 / 방문수 / 매출
  - 병원별 목표금액 / attainment
- `daon_pharma` 기준 Territory는 아래까지 실제 확인했다
  - 월 선택 동작
  - 일 선택 동작
  - 병원 마커 표시
  - 마커 클릭 시 `누적매출`, `누적목표`, `Attainment` 표시
- `sandbox` 목표 집계도 함께 보정했다
  - `standardized_target_records.json`의 `거래처코드`를 병원 ID로 읽도록 수정
  - 이 수정으로 Territory 병원 popup의 목표금액/달성률도 정상화됐다
- 현재 해석:
  - `Phase 9`는 단순 preview 생성이 아니라
    실제 템플릿 계약 복원과 lazy-load 주입 정상화까지 끝난 상태다
  - `daon_pharma`는 Builder 화면 검증 기준 정상 상태로 본다

`2026-03-31` Prescription 원본 동기화 보강(추가):

- `prescription` payload/상세 자산을 원본(`C:\sfe_master_ops`) 기준으로 다시 맞췄다
- `daon_pharma` 기준 현재 일치 확인:
  - `detail_asset_counts.hospital_traces = 43414`
  - `detail_asset_counts.rep_kpis = 6360`
  - `detail_asset_counts.claims = 300`
  - `diagnostics.rule_applied_count = 118`
  - `overview.flow_completion_rate = 1`
- 추가 완료:
  - CSV 파서를 quote-safe 방식으로 교체해서 주소 필드 쉼표로 인한 열 밀림을 제거했다
  - `Data Flow Distribution` 값 차이를 해소했다
  - `Ingest Merge` 단계 `83 row` 차이를 해소했다 (`42000` 기준 복원)
- 다음 작업 예정:
  - `RADAR` 템플릿 원본 대조 점검/보정
  - `total_valid` 템플릿 원본 대조 점검/보정

## 5-1. 후속 메모

아래는 `Phase 5-1 완료 조건`은 아니지만,
운영 문서 또는 샘플 기준을 더 정리하고 싶을 때 후속으로 볼 수 있는 메모다.

- `intake용 fixers` 계층을 더 명확히 분리할지 검토
- `필수 항목 / 있으면 좋은 항목` 구분 문서화
- `monthly_merge_pharma`를 월별 병합 예시 회사로 고정할지 검토
- 월별 병합 운영 절차 문서화 보강

## 6. 참고 문서

- 구현 순서: `docs/task.md`
- 백엔드 설계 기준: `docs/13_backend_logic_request_prompt.md`
- 상세 참고: `docs/backend_architecture/`
- 조사 요약: `docs/summary/`
