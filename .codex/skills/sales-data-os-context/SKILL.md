---
name: sales-data-os-context
description: Preserve Sales Data OS architecture and operating context when building or changing the product. Use when the task mentions Sales Data OS, OPS, Builder, RADAR, intake, pipeline, runbook, Part2 baseline, KPI single source, run tracking, upload readiness, Supabase schema, Python worker flow, reports, or Sales Data OS web implementation. Also trigger for Korean requests mentioning 세일즈 데이터 OS, 운영체계, 상세설명서, 런북, 파이프라인, 인테이크, 검증 레이어, 오케스트레이션, 빌더, KPI 단일 소스, 업로드 준비상태, 실행 흐름, 리포트, 워커, 또는 웹 구현 맥락 유지. Trigger this skill for requests about system boundaries, module responsibility, validated operating flow, or web/worker/backend implementation that must not lose the original Sales Data OS model.
---

# Sales Data OS Context

Use this skill whenever work touches the Sales Data OS product model, not only the UI.

This skill exists to stop common mistakes:

- Treating Sales Data OS like a simple dashboard
- Moving KPI calculation into the web layer
- Expanding OPS beyond validation and orchestration
- Treating Builder like a calculation engine instead of a rendering layer

## Core rules

- Keep the product name as `Sales Data OS`
- Treat `OPS` as the validation and orchestration layer
- Keep KPI calculation as a single source in `modules/kpi/*`
- Keep Builder render-only
- Keep the web responsible for input, execution, tracking, explanation, and result viewing
- Keep long-running execution in the worker, not inside a web request

## How to use this skill

1. Before planning or coding, align on the system boundaries in `references/system-boundaries-and-flow.md`
2. When the task changes execution flow, module order, or operating behavior, read `references/operating-runbook-rules.md`
3. When the task risks reopening already-decided architecture choices, read `references/part2-completion-baseline.md`

## What to preserve

- Sales Data OS is an operating system for sales data flow, not just a dashboard
- Upload is not only file transfer; it must also explain readiness and data caveats
- Runs must stay traceable by `company_key` and `run_id`
- `WARN` and `FAIL` states must include human-readable reasons
- The web should expose the validated operating flow, not recreate it with separate business logic

## Module boundaries

- `intake` checks and normalizes input files
- `kpi` is the only source of KPI calculation
- `validation` decides delivery readiness after KPI processing
- `builder` consumes prepared payloads and renders outputs only
- `crm`, `sandbox`, `prescription`, `territory`, and `radar` are visible operating and result modules

Do not move calculation logic into Builder, page components, or ad hoc helper code.

## Web implementation guidance

- `Upload` shows intake visibility and input readiness
- `Pipeline` shows execution readiness, mode choice, and current run state
- `Artifacts` and run detail pages show step status, evidence, and explanation
- `Reports` focuses on final deliverables, not intermediate calculations

Every screen should help the user understand:

- Which company they are working on
- Which run they are looking at
- Why the current state is `READY`, `WARN`, `FAIL`, or running
- What can be done next

## Backend and worker guidance

- Store company, upload, run, report, and artifact metadata in the backend
- Let the worker handle heavy calculation, polling, and rendering
- Let the web register work, read status, and explain progress
- Keep step-level status updates explicit so the UI can describe what is happening

## Communication guidance

- Explain system behavior in simple language because the main user is not a developer
- Prefer meaning first, code second
- Do not describe Builder, validation, OPS, or KPI ownership in a way that breaks the established boundaries

## References

- `references/system-boundaries-and-flow.md`
- `references/operating-runbook-rules.md`
- `references/part2-completion-baseline.md`
