# Report Template Dependencies

작성일: 2026-03-31  
상태: `template-reviewed`

## 목적

이 문서는
`workers/templates/reports/`
안의 보고서 템플릿을 실제로 확인한 뒤,

- Python 패키지로 필요한 것
- Python 패키지가 아닌 외부 정적 자산 의존성
- PDF/브라우저 렌더 시 주의점

을 정리한 문서다.

## 확인한 템플릿

- `crm_analysis_template.html`
- `sandbox_report_template.html`
- `prescription_flow_template.html`
- `territory_optimizer_template.html`
- `radar_report_template.html`
- `total_valid_templates.html`

## 최종 Python 패키지

현재 템플릿 기준으로 필요한 Python 패키지는 아래다.

### 핵심 실행 / worker

- `supabase`
- `pydantic`
- `python-dotenv`
- `httpx`
- `tenacity`
- `loguru`

### 데이터 처리 / intake / result asset

- `pandas`
- `pyarrow`
- `numpy`
- `openpyxl`
- `python-dateutil`
- `chardet`
- `orjson`

### 검증

- `pandera`

### 템플릿 렌더

- `jinja2`

### 브라우저 렌더 / PDF 대비

- `playwright`

### 개발 보조

- `pytest`
- `ruff`

## 왜 `playwright`가 필요한가

현재 템플릿은 단순 정적 HTML만 쓰지 않는다.

확인된 요소:

- `Chart.js`
- `chartjs-plugin-annotation`
- `chartjs-plugin-datalabels`
- `Tailwind CDN`
- `Font Awesome CDN`
- inline script 기반 데이터 바인딩
- iframe 기반 HTML hub

즉 일부 템플릿은:

- 브라우저에서 JavaScript가 실제 실행되어야 하고
- 차트가 그려져야 하며
- 동적 DOM이 완성된 뒤 결과를 저장해야 한다

그래서 현재 템플릿 구조는
`weasyprint`보다 `playwright` 쪽이 더 맞다.

## 확인된 외부 CDN 의존성

Python 패키지가 아니지만,
실제 템플릿 실행에는 아래 외부 자산 의존성이 있다.

### 공통적으로 보인 항목

- `https://cdn.jsdelivr.net/npm/chart.js`
- `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/...`

### 일부 템플릿에서 추가 확인

- `https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation`
- `https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels`
- `https://cdn.tailwindcss.com`

## 중요한 판단

현재 구조는
`템플릿은 동작할 수 있지만 외부 CDN에 의존`
하고 있다.

즉 다음 위험이 있다.

- 사내망 / 폐쇄망에서 깨질 수 있음
- PDF 자동 생성 시 외부 로드 실패 가능
- 템플릿 실행 결과가 환경에 따라 달라질 수 있음

## 권장 대응

### 1. 템플릿 위치

현재 위치 유지:

- `workers/templates/reports/`

이유:

- 이건 `lib` 성격이 아니라 Builder 자산이기 때문
- Python worker / Builder가 직접 읽는 구조가 더 자연스럽다

### 2. 정적 자산 분리

권장 폴더:

- `workers/templates/assets/js/`
- `workers/templates/assets/css/`
- `workers/templates/assets/fonts/`

### 3. CDN 의존 축소

가능하면 아래는 로컬 자산으로 고정:

- `chart.js`
- `chartjs-plugin-annotation`
- `chartjs-plugin-datalabels`
- `font-awesome`

### 4. Builder 렌더 기준

권장 기준:

1. `jinja2`로 HTML 생성
2. `playwright`로 실제 브라우저 렌더 확인
3. 필요 시 같은 브라우저 컨텍스트에서 PDF 생성

## 결론

현재 보고서 템플릿 기준으로 보면:

- 템플릿 렌더 핵심은 `jinja2`
- 동적 차트/스크립트 실행 때문에 `playwright` 포함이 안전
- 템플릿 위치는 `workers/templates/reports/` 유지가 맞음
- 장기적으로는 CDN 의존을 로컬 자산으로 치환하는 것이 좋다
