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

완료 기준으로 반영된 내용:

- 월별 raw 병합 서비스 추가
- 공식 월별 입력 경로를 `data/company_source/{company_key}/monthly_raw/YYYYMM/` 기준으로 읽도록 연결
- 월별 병합 대상 source를 `crm_activity`, `sales`, `target`, `prescription`으로 고정
- 병합 결과를 공식 raw 경로에 다시 생성하도록 연결
- 병합 결과 요약을 `_onboarding/latest_monthly_merge_result.json`과 이력 파일로 저장
- intake analyze 시작 전에 월별 병합이 먼저 돌도록 연결
- normalization run 시작 전에도 월별 병합을 다시 확인하도록 연결
- `company_000002` 기준 실검증과 재검증까지 완료

현재 해석:

- `Phase 5-1`은 완료로 본다
- 기준은 아래 3가지다
  - dirty raw가 `ready_with_fixes` 또는 `completed_with_review`까지 실제로 이어진다
  - `monthly_raw -> merged raw -> intake -> _intake_staging -> normalization` 흐름이 실제 테스트와 실데이터 검증으로 확인됐다
  - 자동보정 / registry / 병합 메타 / 테스트 세트가 함께 고정됐다
- 남아 있는 일부 항목은 완료 조건이 아니라 운영 기준 문서화 또는 후속 정리 메모로 본다

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

1. `Phase 6. KPI 계산과 Result Asset Base 구현`
2. `Phase 7. validation 구현`
3. `Phase 8. payload 조립 구현`
4. `Phase 9. Builder 구현`
5. `Phase 10. Worker Runtime 구현`
6. `Phase 11 ~ Phase 14` 프론트 연결

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
