# Sales Data OS Web - 현재 구현 진행사항

작성일: 2026-03-31  
업데이트 원칙: **현재 구현 진행사항은 이 문서에만 기록한다.**

## 1. 이 문서의 목적

이 문서는 지금까지 무엇을 구현했는지,
어디까지 끝났는지,
다음에 무엇을 해야 하는지를
한 곳에서 바로 볼 수 있게 만든 현재 상태 문서다.

주의:

- 진행 체크는 `docs/task.md`를 기준으로 본다
- 실제 구현 상태 설명은 이 문서에만 누적한다
- 앞으로 새로운 진행사항은 이 문서만 업데이트한다

## 2. 현재 완료 상태

완료된 Phase:

- `Phase 1. 기반 고정`
- `Phase 2. 앱 프레임과 디자인 베이스`
- `Phase 3. 입력 수용 구현`
- `Phase 4. 입력 검증 구현`
- `Phase 5. 정규화 구현`

현재 진행 중 Phase:

- `Phase 5-1. 지저분한 raw 대응 보강`

아직 남은 Phase:

- `Phase 6. KPI 계산과 Result Asset Base 구현`
- `Phase 7. validation 구현`
- `Phase 8. payload 조립 구현`
- `Phase 9. Builder 구현`
- `Phase 10. Worker Runtime 구현`
- `Phase 11 ~ Phase 18`

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

- `src/lib/source-registry.ts`
- `src/lib/server/source-storage.ts`
- `app/api/companies/[companyKey]/sources/route.ts`
- `app/api/companies/[companyKey]/sources/upload/route.ts`
- `app/api/companies/[companyKey]/sources/monthly-upload/route.ts`

### Phase 4. 입력 검증

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

- `src/lib/server/intake-analysis.ts`
- `src/lib/server/source-schema.ts`
- `app/api/companies/[companyKey]/intake/analyze/route.ts`
- `app/api/companies/[companyKey]/intake/result/route.ts`
- `app/api/companies/[companyKey]/intake/confirm/route.ts`

### Phase 5. 정규화

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

- `src/lib/server/normalization.ts`
- `src/lib/server/tabular-file.ts`
- `src/lib/server/source-schema.ts`
- `app/api/companies/[companyKey]/normalization/run/route.ts`
- `app/api/companies/[companyKey]/normalization/result/route.ts`

### Phase 5-1. 지저분한 raw 대응 보강

현재까지 반영된 내용:

- 월별 raw 병합 서비스 추가
- 공식 월별 입력 경로를 `data/company_source/{company_key}/monthly_raw/YYYYMM/` 기준으로 읽도록 연결
- 월별 병합 대상 source를 `crm_activity`, `sales`, `target`, `prescription`으로 고정
- 병합 결과를 공식 raw 경로에 다시 생성하도록 연결
- 병합 결과 요약을 `_onboarding/latest_monthly_merge_result.json`과 이력 파일로 저장
- intake analyze 시작 전에 월별 병합이 먼저 돌도록 연결
- normalization run 시작 전에도 월별 병합을 다시 확인하도록 연결
- `company_000002` 기준 월별 raw 검증 준비용 폴더 구조와 파일명 정리를 진행 중

현재 해석:

- 코드 기준으로는 `monthly_raw -> merged raw -> intake -> _intake_staging -> normalization` 흐름의 뼈대가 이미 들어갔다
- 다만 `company_000002` 기준 실제 intake/정규화 재검증은 아직 이번 세션에서 다시 돌리지 않았다
- 따라서 이 단계는 `완료`가 아니라 `진행 중`으로 보는 것이 맞다

핵심 파일:

- `src/lib/server/monthly-merge.ts`
- `src/lib/server/intake-analysis.ts`
- `src/lib/server/normalization.ts`
- `src/lib/server/source-storage.ts`

## 4. 현재 고정된 구현 원칙

- 프론트는 계산하지 않는다
- intake는 차단보다 자동보정과 다음 단계 연결이 우선이다
- 정규화는 회사별 raw를 표준 입력 구조로 바꾸는 단계다
- KPI 계산은 `modules/kpi/*` 단일 소스로 구현해야 한다
- validation은 KPI 이후 전달 판단 레이어다
- Builder는 payload 소비 전용이다

## 5. 다음 구현 우선순위

바로 다음 작업:

1. `Phase 5-1`에서 `company_000002` 기준 intake / normalization 실제 검증 재확인
2. 지저분한 raw 자동보정 규칙과 결과 기록 보강
3. `Phase 6. KPI 계산과 Result Asset Base 구현`
4. `Phase 7. validation 구현`
5. `Phase 8. payload 조립 구현`
6. `Phase 9. Builder 구현`
7. `Phase 10. Worker Runtime 구현`

## 6. 참고 문서

- 구현 순서: `docs/task.md`
- 백엔드 설계 기준: `docs/13_backend_logic_request_prompt.md`
- 상세 참고: `docs/backend_architecture/`
- 조사 요약: `docs/summary/`
