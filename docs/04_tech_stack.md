# 04. Tech Stack

작성일: 2026-03-30  
상태: `draft`

## 1. 문서 목적

이 문서는 새 웹 프로젝트를 시작할 때
어떤 기술을 선택하고,
왜 그 기술을 쓰며,
어디까지를 1차 확정으로 볼지 정리하는 문서다.

쉽게 말하면
`개발 시작 전에 도구를 고정하는 문서`다.

## 2. 기술 선택의 큰 원칙

기술 선택은 화려함보다 아래 기준을 우선한다.

### 2.1 Python 계산 구조를 흔들지 않는다

웹은 계산기를 새로 만드는 작업이 아니다.
Python 기반 Sales Data OS와 가장 잘 연결되는 기술이어야 한다.

### 2.2 운영 화면에 강한 기술을 쓴다

이 제품은 마케팅 사이트가 아니라 운영 콘솔이다.

즉 아래가 중요하다.

- 표와 리스트
- 상태 화면
- 폼
- 업로드
- 상세 페이지
- 장기 실행 상태 추적

### 2.3 초기 개발 속도와 유지보수 균형

너무 무거운 구조는 피하고,
하지만 나중에 커졌을 때 무너지지 않는 기술 조합이 필요하다.

### 2.4 타입 안정성 확보

API 응답 구조가 길고 복잡할 가능성이 높다.
따라서 타입 안정성이 매우 중요하다.

## 3. 1차 확정 기술 스택

## 3.1 프론트엔드 프레임워크

- `Next.js 16`
- `React 19`
- `TypeScript 5.x`

### 선택 이유

- 페이지 라우팅이 강하다.
- 서버/클라이언트 조합이 유연하다.
- 운영 콘솔과 상세 화면 구조를 만들기 좋다.
- React 생태계와 궁합이 좋다.

## 3.2 스타일링

- `Tailwind CSS 4`

### 선택 이유

- 빠르게 일관된 UI를 구축하기 좋다.
- 상태 배지, 카드, 리스트, 테이블 같은 운영 콘솔 UI에 유리하다.
- 디자인 토큰 관리가 쉬운 편이다.

## 3.3 UI 컴포넌트 방향

- 기본 방향: `shadcn/ui` 스타일 기반
- 아이콘: `lucide-react`

### 선택 이유

- 운영 콘솔에 필요한 공통 컴포넌트를 빠르게 만들 수 있다.
- 과도한 디자인 시스템 구축 전에 실용적으로 시작할 수 있다.

## 3.4 상태관리

### 전역 상태

- `Zustand`

### 서버 상태

- `TanStack Query`

### 선택 이유

`Zustand`는 아래에 적합하다.

- 현재 회사
- 현재 선택 run
- 전역 필터
- UI 패널 상태

`TanStack Query`는 아래에 적합하다.

- 회사 목록 조회
- run 목록 조회
- run 상태 polling
- artifact 목록 조회
- 캐시와 재조회 처리

## 3.5 폼과 검증

- `React Hook Form`
- `Zod`

### 선택 이유

- 업로드 화면
- 회사 등록 화면
- 필터 입력 화면

이런 폼이 많아질 가능성이 높다.
입력값 검증도 명확하게 다룰 수 있어야 한다.

## 3.6 데이터 테이블

- 초기 1차: 기본 테이블 직접 구현
- 확장 시: `TanStack Table`

### 선택 이유

처음부터 너무 무거운 표 라이브러리를 붙이기보다,
정말 필요할 때 확장하는 편이 안전하다.

## 3.7 백엔드 / 데이터 계층

- `Supabase`
- `Supabase Storage`
- `Python polling worker`

### 선택 이유

- 회사, 업로드, run, report 메타를 빠르게 구조화할 수 있다.
- 지금은 무로그인 개발 환경으로 시작하고, 나중에 인증과 권한 구조를 확장하기 쉽다.
- 파일 저장과 메타 조회를 한 축으로 관리하기 좋다.
- 무거운 계산과 렌더링은 Python worker로 분리할 수 있다.

## 3.8 장기 실행 처리

- 1차: `run_id` 생성 후 `Supabase + Python polling worker`
- 2차: 필요 시 `SSE` 또는 `WebSocket` 검토

### 선택 이유

초기에는 polling이 가장 단순하고 안정적이다.
웹은 run을 등록하고,
worker가 실제 계산과 보고서 생성을 맡는 구조가 더 안전하다.
실시간 연결은 나중에 필요성이 분명할 때 도입한다.

## 3.9 테스트

- 유닛 테스트: `Vitest`
- UI/E2E 테스트: `Playwright`
- 타입 검사: `tsc`
- 린트: `ESLint`
- 포맷: `Prettier`

### 선택 이유

- 프론트 로직 검증
- 핵심 사용자 흐름 검증
- 타입 안정성 보장

## 4. 버전 고정 초안

- Node.js: `22 LTS`
- pnpm: `10.x`
- Next.js: `16.x`
- React: `19.x`
- TypeScript: `5.x`
- Tailwind CSS: `4.x`

Python은 현재 운영 저장소 기준 버전을 유지한다.

## 5. 대체안 검토와 제외 이유

## 5.1 왜 Vue/Nuxt가 아닌가

가능은 하지만,
현재 요청 기준은 `Next.js + React + Tailwind` 방향이 명확하다.
또 React 생태계가 운영 콘솔과 라이브러리 선택 폭에서 유리하다.

## 5.2 왜 Redux가 아닌가

이 프로젝트는 글로벌 상태가 필요하지만
초기에는 Redux까지는 과하다.
`Zustand + TanStack Query` 조합이 더 가볍고 실용적이다.

## 5.3 왜 별도 무거운 백엔드 프레임워크를 바로 두지 않는가

초기에는 Supabase가 메타 저장과 파일 저장소 역할을 충분히 맡을 수 있다.
복잡한 별도 API 서버는 꼭 필요할 때만 추가하는 편이 안전하다.

## 5.4 왜 WebSocket을 바로 쓰지 않는가

실시간성이 있으면 좋지만,
초기 구현 복잡도를 높인다.
`run_id + polling`으로도 충분히 운영 가능하다.

## 6. 프론트엔드 개발 규칙

### 6.1 TypeScript 필수

새 코드에는 타입을 반드시 둔다.

### 6.2 API 타입 분리

API 응답 타입과 화면 전용 타입을 구분한다.

### 6.3 feature 기반 구조 우선

페이지가 커질수록 기능별 폴더가 필요하다.

예:

- upload
- pipeline
- runs
- reports
- agent

### 6.4 프론트 계산 금지

프론트는 아래를 하지 않는다.

- KPI 계산
- validation 판정 로직 재구현
- Builder payload 생성

## 7. 데이터 통신 원칙

- Supabase 조회/저장 우선
- JSON 기반 데이터 구조 우선
- 파일 업로드는 Storage 기준 우선
- 상태 조회는 polling 우선
- `company_key`, `run_id` 기준 식별 우선

## 8. 저장/파일 구조 원칙

웹 프로젝트가 시작돼도
기존 저장 구조는 그대로 존중한다.

- `data/company_source/{company_key}/`
- `data/standard/{company_key}/`
- `data/validation/{company_key}/`
- `data/validation/{company_key}/runs/{run_id}/`

## 9. 배포 초안

## 9.1 프론트엔드

후보:

- `Vercel`
- 사내 Node 서버
- reverse proxy 뒤 정적/SSR 배포

1차는 환경에 맞게 가장 단순한 배포를 택한다.

## 9.2 Python Worker

- 기존 실행 환경 유지
- worker는 별도 프로세스로 실행
- 필요 시 이후 API 서버를 추가할 수 있음

## 9.3 보고서 파일

- Builder HTML은 파일 기반 유지
- 웹은 링크, 다운로드, 내부 viewer 방식으로 연결

## 10. 로그와 운영 도구

### 프론트 로그

- 브라우저 에러 추적 도입 검토

### 백엔드 로그

- 기존 Python 로그 유지

### 공통 운영 포인트

- request id
- run_id
- company_key

이 세 값은 로그 연결에 중요하다.

## 11. 보안과 인증 초기 방향

1차 단계에서는 개발용 무로그인으로 간다.

- 로그인 화면 없음
- 세션 흐름 없음
- 권한 분기 없음

2차 이후에는 아래를 검토한다.

- 역할 기반 접근 제어
- 회사별 권한 분리

## 12. 최종 1차 확정안

현재 기준으로 1차 확정하는 기술은 아래다.

- `Next.js 15`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Zustand`
- `TanStack Query`
- `React Hook Form`
- `Zod`
- `lucide-react`
- `Supabase`
- `Supabase Storage`
- `Python polling worker`
- `run_id + polling`
- `Vitest`
- `Playwright`
- `ESLint`
- `Prettier`

## 13. 다음 문서와 연결

이 문서를 기준으로 다음을 설계한다.

- 프론트 폴더 구조
- 상태관리 구조
- API 연결 구조
- 테스트 전략
