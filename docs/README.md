# Sales Data OS Docs

이 폴더는 현재 `Sales Data OS Web`의 설계 기준과 운영 문서를 모아둔 곳입니다.

지금 기준으로는
`초기 설계 문서 보관소`
라기보다
`현재 구현 상태를 읽고 다음 작업을 이어가기 위한 문서 세트`
에 가깝습니다.

## 지금 먼저 볼 문서

1. [current_implementation_status.md](C:\sales_os\docs\current_implementation_status.md)
2. [task.md](C:\sales_os\docs\task.md)
3. [operations_runbook.md](C:\sales_os\docs\operations_runbook.md)

쉽게 말하면:

- `current_implementation_status.md`
  - 지금 무엇이 구현됐는지
- `task.md`
  - Phase가 어디까지 끝났는지
- `operations_runbook.md`
  - 실제 운영 중 무엇을 먼저 확인해야 하는지

## 현재 공식 상태

완료:

- `Phase 1 ~ Phase 15`
- `Phase 17`
- `Phase 18`

다음 시작점:

- `Phase 16. 보조 기능 확장`

## 현재 제품 해석

현재 웹 앱은 아래 흐름까지 연결된 상태입니다.

1. 회사 등록
   - 회사 이름만 입력
   - 서버가 랜덤 `6자리 숫자` `company_key` 생성
2. 회사 선택
   - 기본 회사 자동 선택 없음
   - 항상 `company_key` 문맥으로 진입
3. Upload
   - source 상태 / intake 결과 확인
4. Pipeline
   - run 접수 / 상태 polling
5. Run Detail
   - 단계 / validation / RADAR / 다음 행동
6. Reports / Artifacts
   - 실제 결과 파일 열람
7. Agent
   - 현재 run 기준 Gemini 해석
8. 운영 안정화
   - 공통 로딩/오류
   - 로그 키
   - 운영 런북
   - 기본 API 테스트

## 이 폴더 문서 분류

핵심 진행 문서:

- [current_implementation_status.md](C:\sales_os\docs\current_implementation_status.md)
- [task.md](C:\sales_os\docs\task.md)
- [operations_runbook.md](C:\sales_os\docs\operations_runbook.md)

설계 문서:

- [01_prd.md](C:\sales_os\docs\01_prd.md)
- [02_user_flow.md](C:\sales_os\docs\02_user_flow.md)
- [03_information_architecture.md](C:\sales_os\docs\03_information_architecture.md)
- [04_tech_stack.md](C:\sales_os\docs\04_tech_stack.md)
- [05_frontend_architecture.md](C:\sales_os\docs\05_frontend_architecture.md)
- [06_backend_api_plan.md](C:\sales_os\docs\06_backend_api_plan.md)
- [07_data_flow.md](C:\sales_os\docs\07_data_flow.md)
- [08_design_system.md](C:\sales_os\docs\08_design_system.md)

구현 참고 문서:

- [11_antigravity_html_design_brief.md](C:\sales_os\docs\11_antigravity_html_design_brief.md)
- [12_report_template_dependencies.md](C:\sales_os\docs\12_report_template_dependencies.md)
- [13_backend_logic_request_prompt.md](C:\sales_os\docs\13_backend_logic_request_prompt.md)
- [backend_architecture](C:\sales_os\docs\backend_architecture)
- [summary](C:\sales_os\docs\summary)

디자인 예시:

- [ui/design_guide](C:\sales_os\docs\ui\design_guide)

## 문서 운영 원칙

- 현재 구현 진행사항은 `current_implementation_status.md`에만 누적
- Phase 체크는 `task.md` 기준
- 실제 운영 확인 순서는 `operations_runbook.md` 기준

## 현재 기준으로 중요한 원칙

- 웹은 계산하지 않음
- Python 결과를 읽어서 설명함
- `company_key`, `run_id` 문맥을 잃지 않음
- 상태는 색만이 아니라 설명 문장으로 보여줌
