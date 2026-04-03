# Sales Data OS Web

이 저장소는 `Sales Data OS` 운영 웹 앱의 현재 작업 기준 저장소입니다.

핵심 원칙은 단순합니다.

- 계산은 웹이 하지 않습니다.
- KPI 계산, validation, builder 산출은 Python/worker 결과를 기준으로 봅니다.
- 웹은 회사 선택, 업로드, 실행, 상태 추적, 결과 확인, 보고서 열람, 해석을 맡습니다.
- 모든 문맥은 `company_key`와 `run_id` 기준으로 유지합니다.

## 현재 상태

현재 공식 기준으로 완료된 단계:

- `Phase 1 ~ Phase 15`
- `Phase 17`
- `Phase 18`

현재 다음 시작점:

- `Phase 16. 보조 기능 확장`

현재 구현된 큰 흐름:

1. 회사 등록
   - 회사 이름만 입력하면 서버가 랜덤 `6자리 숫자` `company_key`를 생성
2. 회사 선택
   - 기본 회사 자동 선택 없음
   - 사용자가 항상 `company_key`를 선택해서 들어감
3. Upload / Pipeline
   - 실제 source / intake / run 데이터 기준으로 동작
4. Run Detail
   - 단계 상태, validation, RADAR 우선순위, 다음 행동 표시
5. Reports / Artifacts
   - 실제 저장된 결과 파일과 builder preview HTML 연결
6. Agent
   - 현재 회사와 run 기준으로만 Gemini 해석 응답 제공
7. 운영 안정화
   - 공통 로딩/오류 화면
   - 운영 로그 키
   - 기본 API 테스트
   - 운영 런북 문서

## 지금 바로 볼 문서

- 현재 구현 상태: [docs/current_implementation_status.md](C:\sales_os\docs\current_implementation_status.md)
- 구현 순서 / 체크: [docs/task.md](C:\sales_os\docs\task.md)
- 운영 점검 문서: [docs/operations_runbook.md](C:\sales_os\docs\operations_runbook.md)
- 문서 안내: [docs/README.md](C:\sales_os\docs\README.md)

## 중요한 구현 원칙

- `TypeScript`는 KPI를 계산하지 않음
- `Builder`는 render-only
- `RADAR`는 새 계산기가 아니라, 이미 검증된 결과를 읽는 우선순위 해석 레이어
- `Agent`는 일반 채팅이 아니라 현재 run 기준 운영 해석 도구

## 기술 스택

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Supabase`
- `Python polling worker`
- `pnpm`

## 실행 명령

개발 서버:

```bash
pnpm dev
```

타입 체크:

```bash
pnpm typecheck
```

빌드 확인:

```bash
pnpm build
```

기본 테스트 예시:

```bash
pnpm test app/api/companies/route.test.ts app/api/companies/[companyKey]/files/route.test.ts
```

## 환경 변수

예시 파일:

- [\.env.example](C:\sales_os\.env.example)

핵심 값:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- 선택: `GEMINI_MODEL`

현재 Agent 기본 모델:

- `gemini-3.1-flash-lite-preview`

## 참고

- 회사 선택 없이 화면에 들어오면 자동으로 아무 회사도 잡지 않습니다.
- 먼저 회사 등록 또는 회사 선택이 필요합니다.
- 남아 있는 Turbopack 경고는 동적 파일 읽기 범위 경고이며, 현재 기능 동작과는 별개입니다.
