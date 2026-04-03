# Sales Data OS 운영 점검 체크리스트

작성일: 2026-04-03

## 1. 가장 먼저 확인할 것

- 회사가 선택되어 있는가
  - 주소에 `?company=123456`처럼 `company`가 있어야 한다
- Supabase 연결값이 들어 있는가
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Agent를 쓸 계획이면 Gemini 키가 들어 있는가
  - `GEMINI_API_KEY`

## 2. 회사 등록이 안 될 때

- 회사 이름만 보내고 있는지 확인
  - `POST /api/companies`
  - 요청 예시:

```json
{
  "company_name": "신규제약"
}
```

- 기대 동작
  - 서버가 랜덤 `6자리 숫자` `company_key` 생성
  - `company_registry` 저장
  - `data/company_source/{company_key}/_onboarding/` 폴더 준비

- 실패 시 확인 순서
  1. Supabase 연결값이 있는지
  2. `company_registry` 테이블이 있는지
  3. 응답 오류 문구에 `duplicate`, `unique`가 있는지

## 3. Pipeline run이 안 잡힐 때

- `Pipeline` 화면에서 먼저 intake 준비 상태를 확인
- `ready_for_adapter=false`면 run을 막는 것이 정상
- `POST /api/companies/{companyKey}/pipeline-runs` 호출 후에도 진행이 안 되면 확인
  1. `pipeline_runs`에 `pending` row가 생성됐는지
  2. worker가 실행 중인지
  3. worker 로그에서 실패 지점이 있는지

## 4. 보고서 / 산출물이 안 보일 때

- 먼저 `Run Detail`에서 run 상태를 확인
- 그 다음 확인 순서
  1. `data/validation/{company_key}/pipeline/pipeline_validation_summary.json`
  2. `data/validation/{company_key}/builder/builder_validation_summary.json`
  3. `data/validation/{company_key}/builder/*.html`
  4. `data/validation/{company_key}/{module}/...`

- 화면 해석
  - `Reports`가 비어 있으면 builder preview HTML이 아직 없는 상태
  - `Artifacts`가 비어 있으면 validation 또는 builder 결과 파일이 아직 없는 상태

## 5. Agent가 답을 못 할 때

- 가장 흔한 원인
  - `company`가 없음
  - `run` 문맥이 없음
  - `GEMINI_API_KEY`가 없음
  - validation / RADAR / report 파일이 아직 없음

- 확인 순서
  1. 주소에 `company`가 있는지
  2. 현재 run이 선택되어 있는지
  3. `.env`에 `GEMINI_API_KEY`가 있는지
  4. `Reports`, `Artifacts`, `Run Detail`이 먼저 열리는지

## 6. 공통 로그 키

운영 중에는 아래 이벤트 이름으로 보면 된다.

- `companies.list.success`
- `companies.list.failed`
- `companies.create.success`
- `companies.create.failed`
- `pipeline-runs.list.success`
- `pipeline-runs.list.failed`
- `pipeline-runs.create.success`
- `pipeline-runs.create.failed`
- `files.open.success`
- `files.open.failed`
- `agent.answer.success`
- `agent.answer.failed`

## 7. 인증/권한 확장 준비 메모

현재는 무로그인 상태다.

나중에 붙일 수 있게 아래 기준으로 보면 된다.

- 회사 접근 제한
  - 사용자별 허용 `company_key` 목록
- 운영자 권한
  - 회사 등록
  - run 재실행
  - 파일 다운로드
- 결과 다운로드 권한
  - `files` route 앞단에 권한 체크 삽입

## 8. 출시 전 최종 점검

1. 회사 등록이 되는가
2. 회사 선택 없이 들어오면 선택 화면이 뜨는가
3. 업로드 화면이 선택한 회사 기준으로 열리는가
4. intake 문장이 보이는가
5. Pipeline에서 run 생성이 되는가
6. Run Detail polling이 되는가
7. Reports / Artifacts가 실제 파일을 여는가
8. Agent가 현재 run 기준으로 답하는가
