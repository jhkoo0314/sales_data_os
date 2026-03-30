---
name: sales-data-os-context
description: Preserve Sales Data OS architecture and operating context when building or changing the product. Use when the task mentions Sales Data OS, OPS, Builder, RADAR, intake, pipeline, runbook, Part2 baseline, KPI single source, run tracking, upload readiness, Supabase schema, Python worker flow, reports, or Sales Data OS web implementation. Also trigger for Korean requests mentioning 세일즈 데이터 OS, 운영체계, 상세설명서, 런북, 파이프라인, 인테이크, 검증 레이어, 오케스트레이션, 빌더, KPI 단일 소스, 업로드 준비상태, 실행 흐름, 리포트, 워커, 또는 웹 구현 맥락 유지. Trigger this skill for requests about system boundaries, module responsibility, validated operating flow, or web/worker/backend implementation that must not lose the original Sales Data OS model.
---

# Sales Data OS Context

Use this skill whenever work touches the Sales Data OS product model, not just UI code.

This skill exists to prevent four common mistakes:

- Treating Sales Data OS like a simple dashboard
- Moving KPI calculation logic into the web layer
- Expanding OPS beyond validation/orchestration responsibility
- Treating Builder like a calculation layer instead of a rendering layer

## Core rules

- Keep the system name as `Sales Data OS`
- Treat `OPS` only as `Validation / Orchestration Layer`
- Keep KPI calculation as a single source in `modules/kpi/*`
- Keep Builder as render-only
- Treat the web as input, execution, tracking, explanation, and viewing layer
- Treat long-running execution as worker responsibility, not web request responsibility

## How to use this skill

1. Before planning or coding, align on the system boundaries in:
   `references/system-boundaries-and-flow.md`
2. When the task affects execution flow, module order, or operational behavior, read:
   `references/operating-runbook-rules.md`
3. When the task risks re-opening already settled architecture questions, read:
   `references/part2-completion-baseline.md`

## What to preserve during build

- Sales Data OS is an operating system for sales data flow, not a dashboard
- Upload is not only file transfer; it must explain readiness and data caveats
- Runs must be tracked by `company_key` and `run_id`
- WARN and FAIL states must include human-readable reasoning
- The web should expose the validated operating flow, not reinvent it

## When implementing web screens

- Keep `Upload` responsible for intake visibility and input readiness
- Keep `Pipeline` responsible for execution readiness, mode choice, and current run state
- Keep `Runs` and run detail responsible for step status, evidence, and reasoning
- Keep `Reports` focused on final outputs, not intermediate calculations

## When implementing backend or worker flows

- Store company, upload, run, report, and artifact metadata in the chosen backend
- Let the worker perform heavy calculation and rendering
- Let the web register work and read status
- Keep step-level status updates explicit so the UI can explain progress

## Reference guide

- `references/system-boundaries-and-flow.md`
  Read for system definition, layer responsibilities, and what each module must not do.
- `references/operating-runbook-rules.md`
  Read for official operating order, execution behavior, and module responsibility rules.
- `references/part2-completion-baseline.md`
  Read for what has already been validated and should be treated as baseline, not as open-ended redesign territory.