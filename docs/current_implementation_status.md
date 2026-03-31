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

핵심 파일:

- `src/lib/server/normalization.ts`
- `src/lib/server/tabular-file.ts`
- `src/lib/server/source-schema.ts`
- `app/api/companies/[companyKey]/normalization/run/route.ts`
- `app/api/companies/[companyKey]/normalization/result/route.ts`

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

## 6. 참고 문서

- 구현 순서: `docs/task.md`
- 백엔드 설계 기준: `docs/13_backend_logic_request_prompt.md`
- 상세 참고: `docs/backend_architecture/`
- 조사 요약: `docs/summary/`
