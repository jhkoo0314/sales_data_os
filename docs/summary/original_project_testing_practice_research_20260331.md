# 원본 Streamlit 프로젝트 테스트 방식 조사

작성일: 2026-03-31  
조사 대상: `C:\sfe_master_ops`  
주의: 원본 폴더는 읽기만 했고, 코드 수정은 하지 않았다.

## 1. 한 줄 결론

원본 Streamlit 프로젝트는 테스트를 `한 가지만` 한 것이 아니다.

- 자동 테스트: `pytest`
- 실제 운영 검증: 샘플/실데이터로 파이프라인 끝까지 실행
- 결과물 검증: HTML, JSON, result asset, validation summary 확인
- 회귀 검증: 이전에 되던 결과가 다시 깨지지 않는지 확인
- 성능 검증: 파일 크기, 파싱 속도, 스크립트 실행 시간 확인

즉, "테스트 코드가 있나?" 수준이 아니라  
`자동 테스트 + 실제 데이터 재실행 + 산출물 확인`을 같이 쓰던 프로젝트였다.

## 2. 실제 확인한 내용

### 2-1. 자동 테스트 도구

실제 확인:

- `pytest`가 개발 의존성으로 들어가 있다.
  - [pyproject.toml](C:\sfe_master_ops\pyproject.toml)
- `tests/` 폴더를 공식 테스트 위치로 잡아 두었다.
  - [pyproject.toml](C:\sfe_master_ops\pyproject.toml)
- `python_files = ["test_*.py"]` 규칙도 설정되어 있다.
  - [pyproject.toml](C:\sfe_master_ops\pyproject.toml)

쉽게 말하면:

- 테스트는 임시로 몇 개 만든 수준이 아니라
- `pytest` 기준으로 공식 구조를 갖춘 상태였다.

### 2-2. 테스트 범위

실제 확인:

- `tests/` 아래 테스트 파일이 다수 존재한다.
- 대략 다음 범위가 확인됐다.
  - `test_common`
  - `test_intake`
  - `test_crm`
  - `test_sandbox`
  - `test_territory`
  - `test_prescription`
  - `test_radar`
  - `test_builder`
  - `test_scripts`
  - `test_ui`
  - `test_workflow`
- 저장소 인덱스 문서도 이 구조를 공식 테스트 범위로 적고 있다.
  - [docs/index.md](C:\sfe_master_ops\docs\index.md)

쉽게 말하면:

- 일부 기능만 테스트한 것이 아니라
- 입력, 계산, 검증, 결과물, 콘솔 흐름까지 넓게 확인했다.

### 2-3. 실제 발견한 대표 테스트 코드

#### A. 입력 검증 테스트

실제 확인:

- intake가 너무 엄격하게 막지 않는지 테스트한다.
  - [test_intake_relaxed_gate.py](C:\sfe_master_ops\tests\test_intake\test_intake_relaxed_gate.py)

무엇을 확인했나:

- 컬럼이 조금 애매해도 바로 차단하지 않는지
- `ready_for_adapter`가 유지되는지
- 사람 검토 권장 메시지만 남기는지

즉:

- "업로드를 막을지 말지" 로직을 자동 테스트로 확인했다.

#### B. 모듈 통합 테스트

실제 확인:

- CRM 통합 테스트가 있다.
  - [test_crm_flow.py](C:\sfe_master_ops\tests\test_crm\test_crm_flow.py)
- Sandbox 통합 테스트가 있다.
  - [test_sandbox_flow.py](C:\sfe_master_ops\tests\test_sandbox\test_sandbox_flow.py)
- Territory 통합 테스트가 있다.
  - [test_territory_flow.py](C:\sfe_master_ops\tests\test_territory\test_territory_flow.py)
- Prescription, RADAR도 비슷한 구조의 테스트가 있다.
  - [test_prescription_flow.py](C:\sfe_master_ops\tests\test_prescription\test_prescription_flow.py)
  - [test_radar_flow.py](C:\sfe_master_ops\tests\test_radar\test_radar_flow.py)

무엇을 확인했나:

- 원천 레코드가 표준 구조로 잘 바뀌는지
- result asset이 생성되는지
- KPI/요약 값이 기대 범위인지
- validation 결과가 `PASS/WARN/FAIL` 규칙에 맞는지
- 사람이 읽는 설명 문구가 비어 있지 않은지

즉:

- "함수 하나만" 보는 테스트보다
- `입력 -> 모듈 -> result asset -> validation` 흐름을 확인하는 테스트가 많았다.

#### C. 결과물 구조 테스트

실제 확인:

- builder payload 분할 구조 테스트가 있다.
  - [test_crm_builder_payload_chunks.py](C:\sfe_master_ops\tests\test_crm\test_crm_builder_payload_chunks.py)
  - [test_sandbox_template_payload_chunks.py](C:\sfe_master_ops\tests\test_sandbox\test_sandbox_template_payload_chunks.py)
  - [test_territory_adapter_payload.py](C:\sfe_master_ops\tests\test_territory\test_territory_adapter_payload.py)
- 버전 계약 테스트가 있다.
  - [test_version_contracts.py](C:\sfe_master_ops\tests\test_builder\test_version_contracts.py)

무엇을 확인했나:

- Builder에 넘기는 재료 구조가 깨지지 않았는지
- 큰 데이터를 분할 저장하는 규칙이 유지되는지
- payload 계약이 바뀌어 화면이 깨지지 않는지

즉:

- "숫자만 맞으면 끝"이 아니라
- 다음 단계가 읽을 파일 구조까지 테스트했다.

#### D. 화면 결과물 확인 테스트

실제 확인:

- Sandbox 렌더 스냅샷 성격의 테스트가 있다.
  - [test_sandbox_renderer_snapshot.py](C:\sfe_master_ops\tests\test_sandbox\test_sandbox_renderer_snapshot.py)

무엇을 확인했나:

- HTML 안에 핵심 블록이 실제로 들어갔는지
- 주요 화면 id나 slot 구조가 남아 있는지
- 렌더된 HTML이 최소 계약을 지키는지

즉:

- 단순 계산뿐 아니라
- 최종 HTML이 너무 크게 깨지지 않았는지도 봤다.

#### E. 성능 회귀 테스트

실제 확인:

- Sandbox 성능 회귀 테스트가 있다.
  - [test_sandbox_performance_regression.py](C:\sfe_master_ops\tests\test_sandbox\test_sandbox_performance_regression.py)
- Territory 성능 회귀 테스트가 있다.
  - [test_territory_performance_regression.py](C:\sfe_master_ops\tests\test_territory\test_territory_performance_regression.py)
- 공통 유틸도 있다.
  - [performance_regression_utils.py](C:\sfe_master_ops\tests\performance_regression_utils.py)

무엇을 확인했나:

- JSON 파일 크기가 너무 커지지 않았는지
- 분할 asset 개수가 너무 많아지지 않았는지
- JSON 파싱 속도가 느려지지 않았는지
- 검증 스크립트 실행 시간이 기준보다 느려지지 않았는지

즉:

- 결과가 "되기만 하면 된다"가 아니라
- 너무 무거워져서 운영이 힘들어지지 않는지도 같이 봤다.

#### F. 스크립트/파이프라인 테스트

실제 확인:

- 전체 파이프라인 진입 스크립트 테스트가 있다.
  - [test_validate_full_pipeline.py](C:\sfe_master_ops\tests\test_scripts\test_validate_full_pipeline.py)
- 실제 실행 스크립트도 있다.
  - [validate_full_pipeline.py](C:\sfe_master_ops\scripts\validate_full_pipeline.py)

무엇을 확인했나:

- 공통 실행 서비스가 실제로 호출되는지
- 실행 요약 JSON이 생성되는지
- 통합 실행 결과가 지정한 형식으로 저장되는지

즉:

- 스크립트가 단순 수동 도구가 아니라
- 테스트 대상에도 포함되어 있었다.

## 3. 실제 발견한 수동 검증 방식

### 3-1. 실제 회사 데이터 재실행

실제 확인:

- `hangyeol_pharma`, `daon_pharma`, `monthly_merge_pharma` 기준 회귀 검증 통과 기록이 문서에 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [docs/ai/07_current_phase.md](C:\sfe_master_ops\docs\ai\07_current_phase.md)
  - [docs/architecture/12_part2_status_source_of_truth.md](C:\sfe_master_ops\docs\architecture\12_part2_status_source_of_truth.md)
- `company_000001`, `company_000002` 기준 실사용/보정 검증 기록도 있다.
  - [docs/ai/07_current_phase.md](C:\sfe_master_ops\docs\ai\07_current_phase.md)

무슨 뜻인가:

- 테스트 fixture만 본 것이 아니라
- 실제 회사 raw를 넣고 파이프라인을 끝까지 돌려본 것이다.

### 3-2. 월별 raw 업로드부터 끝까지 확인

실제 확인:

- 월별 raw 업로드 -> 자동 병합 -> intake -> 파이프라인 -> Builder 흐름 검증 완료 기록이 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [docs/ai/07_current_phase.md](C:\sfe_master_ops\docs\ai\07_current_phase.md)

무슨 뜻인가:

- 파일 한 개만 읽는 테스트가 아니라
- 실제 운영자가 쓰는 흐름을 따라가며 검증했다.

### 3-3. 최종 산출물 생성 여부 확인

실제 확인:

- HTML 6종 생성 검증 통과 기록이 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [docs/ai/07_current_phase.md](C:\sfe_master_ops\docs\ai\07_current_phase.md)
- `통합 실행` 시 어떤 HTML이 생성되어야 하는지도 문서화돼 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [RUNBOOK.md](C:\sfe_master_ops\RUNBOOK.md)

무슨 뜻인가:

- 결과 숫자만 본 것이 아니라
- 보고서가 실제로 열리는 상태까지 확인했다.

### 3-4. 실행 후 해석 문서 확인

실제 확인:

- 실행 후 `latest_execution_analysis.md`가 저장된다고 적혀 있다.
  - [RUNBOOK.md](C:\sfe_master_ops\RUNBOOK.md)

이 문서에 들어가는 것:

- 단계별 `PASS/WARN/APPROVED`
- 원래 판정 메모
- 사람이 읽는 해석 문장
- 근거 수치

무슨 뜻인가:

- "실행 성공/실패"만 보는 게 아니라
- 왜 그런 결과가 나왔는지까지 검토했다.

## 4. 실행 명령 또는 검증 절차

### 4-1. 자동 테스트

실제 확인:

- 공식 테스트 도구는 `pytest`
  - [pyproject.toml](C:\sfe_master_ops\pyproject.toml)
- 문서에도 `uv run pytest`가 주요 회귀 확인 항목으로 적혀 있다.
  - [02_refactor_plan_sales_data_os.md](C:\sfe_master_ops\docs\architecture\02_refactor_plan_sales_data_os.md)

추정이 아닌 안전한 실행 예:

```bash
uv run pytest
```

### 4-2. 콘솔 수동 검증

실제 확인:

- Streamlit 콘솔 실행 명령이 문서에 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [RUNBOOK.md](C:\sfe_master_ops\RUNBOOK.md)

```bash
uv run python -m streamlit run ui/ops_console.py --server.port 8501
```

이후 사람이 확인했을 가능성이 매우 높은 것:

- 회사 선택
- 업로드 상태 확인
- 실행 모드 선택
- 통합 실행
- 보고서 카드/미리보기/다운로드 확인

주의:

- 위 확인 항목은 문서와 구조상 매우 강하게 뒷받침되지만,
- "어느 버튼을 몇 번 눌렀는지" 같은 상세 절차 문서는 조사 범위에서 직접 발견하지 못했다.

### 4-3. 전체 파이프라인 재실행

실제 확인:

- 전체 파이프라인 smoke check가 문서에 있다.
  - [02_refactor_plan_sales_data_os.md](C:\sfe_master_ops\docs\architecture\02_refactor_plan_sales_data_os.md)
- 전체 파이프라인 실행 스크립트가 있다.
  - [validate_full_pipeline.py](C:\sfe_master_ops\scripts\validate_full_pipeline.py)

실행 예:

```bash
uv run python scripts/validate_full_pipeline.py
```

이 스크립트가 만드는 핵심 확인물:

- `pipeline_validation_summary.json`
  - [validate_full_pipeline.py](C:\sfe_master_ops\scripts\validate_full_pipeline.py)

### 4-4. 샘플 raw 생성 후 검증

실제 확인:

- 샘플 raw 생성 진입 스크립트가 있다.
  - [README.md](C:\sfe_master_ops\README.md)
  - [RUNBOOK.md](C:\sfe_master_ops\RUNBOOK.md)
  - [generate_source_raw.py](C:\sfe_master_ops\scripts\generate_source_raw.py)
- raw generator 관련 테스트도 있다.
  - [test_generate_source_raw.py](C:\sfe_master_ops\tests\test_scripts\test_generate_source_raw.py)
  - [test_raw_generator_engine.py](C:\sfe_master_ops\tests\test_scripts\test_raw_generator_engine.py)

쉽게 말하면:

- 테스트 raw를 만들고
- 그걸로 실제 파이프라인을 다시 돌리는 방식도 같이 썼다.

## 5. Sales Data OS 웹 프로젝트에 그대로 가져올 수 있는 부분

### 5-1. 모듈별 자동 테스트

가져올 수 있는 것:

- intake
- normalization
- KPI
- validation

적용 방식:

- 작은 fixture 데이터로
- 입력 -> 결과 구조 -> 상태값을 자동 확인

### 5-2. 전체 흐름 smoke test

가져올 수 있는 것:

- `정규화 -> 다음 단계 실행`이 실제로 이어지는지 보는 짧은 전체 테스트

적용 방식:

- 샘플 회사 1개
- 샘플 raw 1세트
- 실행 후 요약 JSON과 산출물 경로만 확인

### 5-3. 결과 파일 계약 테스트

가져올 수 있는 것:

- JSON 구조가 깨지지 않았는지 확인
- 다음 단계가 읽을 필드가 빠지지 않았는지 확인

적용 대상:

- normalization result
- KPI result asset
- validation summary
- builder payload

### 5-4. 성능/크기 경계 테스트

가져올 수 있는 것:

- 결과 파일이 갑자기 너무 커지지 않았는지
- 실행 시간이 갑자기 너무 느려지지 않았는지

이건 지금 당장은 꼭 필요하지 않지만,
Builder/Worker 단계로 갈수록 중요해진다.

## 6. 지금 `C:\sales_os`에서 바로 필요한 최소 테스트 방식 제안

현재 상태:

- `C:\sales_os`는 `Phase 3~5`까지 구현된 상태다.
- 즉 지금 당장 필요한 최소 테스트는 `업로드 -> intake -> 정규화` 확인이다.

추천 최소 세트:

1. intake 판단 테스트
- 필수 컬럼이 맞을 때 `ready`
- 애매하지만 보정 가능할 때 `ready_with_fixes` 또는 비슷한 허용 상태
- 정말 읽을 수 없을 때만 차단

2. 정규화 결과 구조 테스트
- `_intake_staging/{source}.json` 생성 여부
- `data/standardized/{company_key}/{module}/standardized_*.json` 생성 여부
- `normalization_report.json` 생성 여부

3. 샘플 raw 실제 실행 테스트
- 사용자가 줄 raw 1세트로
- analyze -> confirm -> normalization run
- 결과 파일 생성과 핵심 필드만 확인

4. 실패 케이스 테스트
- 컬럼명이 흔들린 경우
- 월/날짜 형식이 흔들린 경우
- 시트 이름이 예상과 다른 경우

5. 아주 짧은 smoke test
- 회사 1개
- run 1개
- intake부터 normalization까지 실제 API 또는 서비스로 한 번 연결

## 7. 확인한 사실과 추측 구분

### 확인한 사실

- 원본 프로젝트에는 공식 `pytest` 설정이 있다.
- `tests/` 아래 자동 테스트가 폭넓게 존재한다.
- 모듈 통합 테스트, 결과물 구조 테스트, 스크립트 테스트, 성능 회귀 테스트가 있다.
- `validate_full_pipeline.py` 같은 실제 실행 스크립트도 테스트 대상에 포함됐다.
- 문서상 실제 회사 데이터를 써서 회귀 검증, 실사용 검증, HTML 생성 검증을 수행한 기록이 있다.

### 추측 또는 해석

- Streamlit 콘솔에서 버튼을 누르며 수동 점검했을 가능성은 매우 높다.
- 다만 "정확히 어떤 순서로 클릭했다"는 체크리스트 문서는 이번 조사에서 직접 확인하지 못했다.
- 따라서 콘솔 수동 검증의 존재는 강하게 뒷받침되지만, 세부 절차는 일부 해석이 포함된다.

## 8. 최종 정리

원본 Streamlit 프로젝트는 테스트를 꽤 진지하게 했다.

- 자동 테스트로 로직을 확인했고
- 실제 회사 raw로 파이프라인을 다시 돌렸고
- 생성된 HTML/JSON/result asset까지 확인했고
- 속도와 파일 크기까지 회귀 검증했다

그래서 `C:\sales_os`도 나중에 한 번에 테스트하는 방식보다,
지금 단계에 맞춰 `intake/정규화 최소 테스트`부터 바로 붙이는 것이
원본 프로젝트 방식과도 가장 가깝다.
