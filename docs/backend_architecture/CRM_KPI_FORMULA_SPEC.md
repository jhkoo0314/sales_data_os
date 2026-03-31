# Sales Data OS 백엔드 설계 문서 05-1. CRM KPI 계산 규칙 명세

작성일: 2026-03-31  
문서 구분: 백엔드 설계 문서  
대상: CRM KPI 계산 규칙을 별도로 고정해야 하는 설계 세션  
작성 기준: `docs/backend_architecture/03_metrics-logic-v2.md` 기반 정리

## 1. 문서 목적

이 문서는 `Phase 5. KPI 계산 상세` 중
`CRM KPI 계산 규칙`
만 따로 분리해 정리한 문서다.

쉽게 말하면:

- 메인 설계 문서는 전체 흐름을 설명하고
- 이 문서는 CRM 지표가 어떤 뜻이고 어떻게 계산되는지 따로 고정하는 문서다

중요:

- 공식 계산 위치는 `modules/kpi/crm_engine.py` 기준으로 본다
- 이 문서는 계산 규칙 명세 문서이지, 화면 설명 문서가 아니다
- Builder, validation, Agent는 이 계산을 다시 하지 않는다

---

## 2. CRM KPI 설계 방향

CRM KPI는 단순 입력량 평가가 아니라
`좋은 행동을 유도하는 선행지표 중심 구조`
로 본다.

핵심 방향:

- 입력을 많이 했는지보다
  `의미 있는 행동을 했는지`를 본다
- 결과지표보다
  `선행 행동 지표`를 먼저 본다
- 자기기입 데이터는 신뢰도 한계를 반영한다
- 결측값은 `0`이 아니라 `unscored`로 처리한다

---

## 3. 공통 규칙

### 3-1. 계산 단위

- 기본 계산 단위는 `사용자 x 기간`이다
- 기간은 일/주/월 단위로 볼 수 있다
- 타임존은 `Asia/Seoul` 기준으로 본다

### 3-2. 데이터 신뢰도 등급

- `verified`
  - 객관 증빙 기반
- `assisted`
  - 일부 증빙 + 사용자 보정
- `self_only`
  - 자기기입만 존재

### 3-3. 점수 반영 공통 규칙

1. `self_only` 데이터는 핵심 점수 반영 상한을 둔다
2. 동일 계정/동일 텍스트 반복은 감점한다
3. 추상적인 Next Action은 무효 처리한다
4. 결측값은 `0`이 아니라 `unscored`로 처리한다

---

## 4. CRM KPI 구조

CRM KPI는 3개 층으로 본다.

### 4-1. 선행행동 계층

- `HIR`
- `RTR`
- `BCR`
- `PHR`

이 계층은
`좋은 행동이 실제로 일어나고 있는가`
를 본다.

### 4-2. 운영관리 계층

- `NAR`
- `AHS`
- `PV`

이 계층은
`행동이 운영 품질로 이어지고 있는가`
를 본다.

### 4-3. 결과검증 계층

- `FGR`
- `PI`
- `TRG`
- `SWR`

이 계층은
`행동과 운영의 결과가 실제 성과로 이어졌는가`
를 본다.

주의:

- `TRG`, `SWR`는 개인 코칭 1차 지표가 아니라 경영 리포팅 보조 지표다

---

## 5. CRM 11개 KPI 상세

### 5-1. HIR

- 한글 이름
  - High-Impact Rate
- 뜻
  - 성과기여 가능성이 높은 행동의 실행 품질 지수
- 계산식
  - `HIR = SUM(activity_weight * quality_factor * impact_factor * trust_factor) / total_activities`
- 핵심 파라미터
  - `activity_weight`
    - 예: `visit 1.3`, `presentation 1.4`, `follow_up 1.2`, `call 0.9`, `message 0.6`
  - `quality_factor`
    - `0.7 ~ 1.3`
  - `impact_factor`
    - `0.8 ~ 1.5`
  - `trust_factor`
    - `verified 1.0`, `assisted 0.85`, `self_only 0.7`
- 예외 규칙
  - 설명 20자 미만 또는 중복 의심 건은 `0.3배`
  - `self_only`만 존재하는 기간은 HIR 상한 적용
- 해석
  - HIR 낮음 + 활동수 높음: 행동 품질 문제
  - HIR 낮음 + 활동수 낮음: 우선순위/실행량 문제

### 5-2. RTR

- 한글 이름
  - Relationship Temperature Rate
- 뜻
  - 계정 관계의 현재 온도를 나타내는 지표
- 계산식
  - `RTR = SUM(sentiment_score * time_decay * trust_factor) / relationship_events`
- 보조 규칙
  - 최근 7일 가중치 최대
  - 30일 초과 이벤트는 감쇠 반영
- 해석
  - RTR 하락: 관계 냉각 조짐, 접촉 전략 재설계 필요

### 5-3. BCR

- 한글 이름
  - Behavior Consistency Rate
- 뜻
  - 실행의 규칙성과 루틴 품질을 측정하는 지표
- 계산식
  - `BCR = 0.4 * volume_score + 0.6 * regularity_score`
- 보조 규칙
  - `regularity_score`는 활동 간격 표준편차 역수 기반
  - 몰아치기 입력 패턴은 감점
- 해석
  - BCR 낮음: 단기 집중/장기 공백 패턴 개선 필요

### 5-4. PHR

- 한글 이름
  - Proactive Health Rate
- 뜻
  - 활동이 구체적 Next Action으로 연결되는 비율
- 계산식
  - `PHR = valid_next_actions / total_activities`
- 유효 기준
  - 미래 날짜 존재
  - 실행 주체/행동/기한이 명확
  - `추후 연락`, `검토 예정` 같은 추상 메모는 제외
- 해석
  - PHR 낮음: 미팅이 파이프라인 전진으로 연결되지 않음

### 5-5. NAR

- 한글 이름
  - Next Action Reliability
- 뜻
  - 계획된 Next Action이 기한 내 실제 이행되는 신뢰도
- 계산식
  - `NAR = executed_on_time_next_actions / due_next_actions`
- 판정 규칙
  - `due`: 기준 기간 내 예정일 도래
  - `on_time`: 예정일 +2일 이내 실행
  - `due_next_actions < 5`: 참고지표 플래그
- 해석
  - NAR 낮음 + PHR 높음: 계획은 세우나 실행력이 약함

### 5-6. AHS

- 한글 이름
  - Account Health Score
- 뜻
  - 계정의 접점/관계/경쟁 리스크를 통합한 건강도
- 계산식
  - `AHS = 0.35*recency + 0.25*rtr_component + 0.20*coverage + 0.20*competitor_risk_inverse`
- 해석
  - AHS 저하: 관계/커버리지/경쟁 대응 중 취약축 보완 필요

### 5-7. PV

- 한글 이름
  - Pipeline Velocity
- 뜻
  - 파이프라인 전진 가치의 시간 대비 이동 속도
- 계산식
  - `PV = SUM(stage_value * stage_progress_prob) / avg_stage_dwell_days`
- 해석
  - PV 저하 + dwell 증가: 병목 단계 코칭 필요

### 5-8. FGR

- 한글 이름
  - Field Growth Rate
- 뜻
  - 담당 영역의 성장률
- 계산식
  - `FGR = 0.6*quantity_growth + 0.4*revenue_growth`
- 보조 규칙
  - 약가/공급/정책 이슈 발생 시 보정 플래그

### 5-9. PI

- 한글 이름
  - Prescription Index
- 뜻
  - 계정 난이도와 처방 성과를 보정한 종합 성과지수
- 계산식
  - `PI = (weighted_prescription * 0.7) + (growth_component * 0.3)`
- 보정 요소
  - 계정 유형 가중치
  - 제품 전략 가중치
  - 지역/포트폴리오 난이도 보정

### 5-10. TRG

- 한글 이름
  - Target Revenue Growth
- 뜻
  - 기준 대비 매출 성장률
- 계산식
  - `TRG = (revenue_current - revenue_baseline_adjusted) / revenue_baseline_adjusted`
- 사용 원칙
  - 개인 코칭 1차 지표로 사용하지 않는다
  - 월/분기 경영 리포팅 보조 지표로 사용한다

### 5-11. SWR

- 한글 이름
  - Share Win Rate
- 뜻
  - 목표 계정 중 기준 점유 달성 비율
- 계산식
  - `SWR = accounts_meeting_target_share / target_accounts`
- 사용 원칙
  - 개인 코칭 1차 지표로 사용하지 않는다
  - 월/분기 경영 리포팅 보조 지표로 사용한다

---

## 6. 운영 종합 스코어

### 6-1. 목적

운영 종합 스코어는
보상 직접 연계용이 아니라
`코칭 우선순위 선정용 내부 지표`
로 본다.

### 6-2. 예시 계산식

`CoachScore = 0.30*HIR + 0.20*RTR + 0.15*BCR + 0.15*PHR + 0.10*NAR + 0.10*AHS`

### 6-3. 사용 원칙

- 결과지표 `FGR / PI / TRG / SWR`는 검증 레이어에서 별도 확인한다
- `CoachScore` 단독으로 개인 평가를 하면 안 된다

---

## 7. 구현 반영 원칙

### 7-1. 계산 위치

- CRM KPI 계산 공식은 `modules/kpi/crm_engine.py` 기준으로 구현한다
- 다른 모듈이나 Builder에서 CRM KPI를 다시 계산하면 안 된다

### 7-2. 출력 기준

CRM KPI 계산 결과는 최소한 아래 구조로 다음 단계에 전달될 수 있어야 한다.

- KPI별 점수
- KPI별 `unscored` 여부
- `metric_version`
- 신뢰도 등급 또는 신뢰도 분포
- 요약 해석 문장
- 품질/예외 플래그

즉 계산 결과는
단순 숫자만이 아니라
`해석과 품질 정보가 같이 있는 result asset 재료`
여야 한다.

### 7-3. 계산 금지 구역

아래는 CRM KPI를 다시 계산하면 안 된다.

- `validation`
- `radar`
- `builder`
- Agent 응답 단계

---

## 8. 품질보증 체크리스트

아래 항목은 구현 시 함께 확인한다.

1. `unscored` 처리 일관성
2. `self_only` 반영 상한 정책 준수
3. 중복/추상 입력 로그 보존
4. 월간 시차 상관 분석
   - `HIR / RTR / BCR / PHR -> FGR / PI`
5. `metric_version` 태깅 유지

---

## 9. 결론

CRM KPI 설계의 핵심은
`입력 많이 하기`가 아니라
`고효과 행동을 반복 실행하게 만드는 것`
이다.

따라서 운영 중심은 아래다.

- 선행지표
  - `HIR`, `RTR`, `BCR`, `PHR`
- 운영관리 지표
  - `NAR`, `AHS`, `PV`
- 결과검증 지표
  - `FGR`, `PI`, `TRG`, `SWR`

즉 CRM KPI는
단순 실적 집계가 아니라
행동 -> 운영 -> 결과를 하나의 흐름으로 보는 계산 체계로 이해하면 된다.
