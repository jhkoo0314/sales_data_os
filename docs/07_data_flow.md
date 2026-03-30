# 07. Data Flow

작성일: 2026-03-30  
상태: `draft`

## 1. 문서 목적

이 문서는 웹, Supabase, Python worker 사이에서
데이터가 어떻게 이동하고 저장되는지 정리한다.

쉽게 말하면
`어떤 데이터가 어디서 만들어지고, 어디로 가고, 어디에 남는가`
를 설명하는 문서다.

## 2. 가장 중요한 전제

웹 전환 후에도
Sales Data OS의 공식 시스템 흐름은 바뀌지 않는다.

공식 흐름:

`입력 -> 검증 -> 정규화 -> KPI 계산 -> validation -> result asset / payload -> builder`

웹은 이 흐름의 앞뒤를 연결해서 보여주는 역할이다.

즉 웹이 새 계산 단계를 만드는 것이 아니다.

공식 모듈 구조는 아래 `9개`다.

- `intake`
- `kpi`
- `crm`
- `sandbox`
- `territory`
- `prescription`
- `validation`
- `radar`
- `builder`

주의:

- 겉으로 드러나는 운영/결과 모듈은 `crm / sandbox / prescription / territory / radar` 총 5개다
- `intake / kpi / validation / builder`는 내부 엔진 모듈이다
- 데이터 흐름 문서는 항상 `9개 모듈` 기준으로 읽고, 화면 설명은 `겉으로 보이는 5개 모듈` 기준으로 읽는다

## 3. 웹 기준 전체 흐름

웹에서 보면 큰 흐름은 아래와 같다.

`browser -> next.js frontend -> supabase -> python worker -> result files / run metadata -> supabase -> frontend`

## 4. 데이터 종류

이 프로젝트에서 중요한 데이터는 아래처럼 나눌 수 있다.

### 4.1 입력 데이터

- 업로드한 raw 파일
- 월별 raw 파일
- 회사별 source 파일

### 4.2 중간 처리 데이터

- adapter 결과
- standard 데이터
- intake staging 결과

### 4.3 계산/검증 데이터

- KPI engine 결과
- result asset
- validation summary
- radar 결과

### 4.4 최종 표시 데이터

- builder payload
- HTML 보고서
- run summary
- artifact index

### 4.5 대화/설명 데이터

- report context
- agent summary
- agent chat history

## 5. 입력 데이터 흐름

## 5.1 일반 업로드 흐름

1. 사용자가 브라우저에서 파일 선택
2. 프론트엔드가 Storage 업로드와 메타 저장을 요청
3. Supabase가 파일 메타를 받음
4. `company_key` 기준 메타와 경로를 저장
5. 저장 결과 반환
6. 프론트가 업로드 목록 갱신

이때 중요한 메타:

- `company_key`
- `source_type`
- `uploaded_at`
- `is_monthly`
- `period`

## 5.2 월별 raw 업로드 흐름

1. 사용자가 여러 파일 업로드
2. 파일명 또는 입력값으로 월 정보 파악
3. Storage와 메타 테이블에 월 정보와 함께 저장
4. 업로드 상태 반환
5. 프론트가 월별 리스트 표시

월별 raw에서 중요한 것은
“여러 파일이 같은 source_type 아래 월 단위로 쌓일 수 있다”는 점이다.

## 6. 저장 기준 원칙

모든 파일과 결과는 `company_key` 기준으로 저장한다.

핵심 저장 위치:

- `data/company_source/{company_key}/`
- `data/standard/{company_key}/`
- `data/validation/{company_key}/`
- `data/validation/{company_key}/runs/{run_id}/`

즉 웹은 파일명을 기준으로 회사를 판단하면 안 되고,
항상 `company_key`를 기준으로 요청해야 한다.

## 7. 실행 데이터 흐름

## 7.1 실행 시작

1. 프론트가 실행 요청을 등록
2. 요청에 `company_key`와 `execution_mode` 포함
3. Supabase에 새 run 생성
4. `run_id` 발급
5. Python worker가 run을 가져가 파이프라인 실행 시작

이 단계에서 생성되는 핵심 문맥:

- `company_key`
- `run_id`
- `execution_mode`
- `started_at`

## 7.2 실행 중

실행 중에는 아래 데이터가 누적될 수 있다.

- 단계별 상태
- 중간 에러
- validation 메모
- 최신 진행 단계
- 산출물 생성 메타

프론트는 polling으로 이 상태를 읽는다.

## 7.3 실행 완료

실행이 끝나면 아래 정보가 정리된다.

- 전체 상태
- 전체 점수
- 단계별 상태
- artifact 목록
- 보고서 목록
- run bundle

## 8. run 중심 데이터 흐름

웹에서는 현재 세션보다 `run`이 더 중요하다.

이유:

- 나중에 다시 봐도 같은 기준으로 확인 가능
- Agent가 어떤 실행을 기준으로 말하는지 분명해짐
- 보고서와 artifact를 특정 실행에 연결할 수 있음

따라서 아래 값은 거의 모든 화면에서 중요하다.

- `company_key`
- `run_id`
- `execution_mode`
- `status`
- `started_at`
- `finished_at`

## 9. 결과 데이터 흐름

## 9.1 run 상세 조회 흐름

1. 프론트가 run 상세 요청
2. Supabase가 run 상태와 단계별 요약 반환
3. 프론트가 상태 카드와 단계 리스트 렌더링

## 9.2 artifact 조회 흐름

1. 프론트가 artifact 목록 요청
2. Supabase가 run 또는 company 기준 artifact 메타 반환
3. 프론트가 파일 목록 렌더링

## 9.3 reports 조회 흐름

1. 프론트가 reports 목록 요청
2. Supabase가 생성된 보고서 메타 반환
3. 프론트가 보고서 카드 렌더링

## 10. standard/result/builder 데이터 관계

데이터는 아래 식으로 이어진다.

### 입력

- raw source

### 정리

- adapter output
- standard data

### 계산/검증

- KPI engine output
- result asset
- validation summary

### 표현

- builder payload
- HTML report

웹은 이 중 마지막 표현과 요약 정보를 주로 읽지만,
필요할 때 artifact를 통해 앞단 결과도 확인할 수 있어야 한다.

## 11. Builder 관련 데이터 흐름

Builder는 아래 입력을 사용한다.

- result asset
- validated payload

Builder가 만드는 것은 아래다.

- report html
- report asset files
- report metadata

웹은 Builder의 결과를 보여줄 뿐,
Builder 대신 계산하지 않는다.

## 12. Agent 관련 데이터 흐름

Agent는 아래 순서로 문맥을 읽는 것이 바람직하다.

1. 현재 회사 확인
2. 현재 run 확인
3. run bundle 확인
4. report context 확인
5. artifact index 확인
6. 관련 artifact 내용 확인
7. 답변 생성

즉 Agent는 “현재 화면만 보고 대답하는 구조”가 아니라
`run 중심 저장 데이터`를 읽는 구조여야 한다.

## 13. polling 데이터 흐름

초기 실행 상태 추적은 아래 방식으로 본다.

1. 실행 시작
2. `run_id` 반환
3. 프론트가 일정 간격으로 `GET run detail`
4. 상태가 `running`이면 계속 갱신
5. 상태가 완료로 바뀌면 polling 중지

필수 표시 데이터:

- `status`
- `current_step`
- `updated_at`
- `steps`

## 14. 캐시 원칙

프론트에서 캐시해도 되는 것:

- 회사 목록
- run 목록
- report 목록

즉시 최신 상태가 중요한 것:

- 현재 run 상세
- 실행 상태
- 업로드 직후 목록

## 15. 데이터 흐름에서 절대 지킬 것

- company_key를 무시하지 않는다.
- run_id 없는 상태 추적을 만들지 않는다.
- 프론트가 KPI를 다시 계산하지 않는다.
- Builder 결과를 웹에서 다시 계산하지 않는다.
- validation을 화면 로직으로 바꾸지 않는다.

## 16. 체크리스트

- 입력 데이터와 결과 데이터가 구분되는가
- run 중심 흐름이 유지되는가
- 프론트가 조회만 하고 계산은 하지 않는가
- 보고서와 artifact의 위치가 구분되는가
