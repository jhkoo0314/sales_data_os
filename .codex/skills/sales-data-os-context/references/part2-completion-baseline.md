# Part2 Completion Baseline

Source basis:

- `docs/23_part2_completion_declaration.md`

## What this file means

Treat this as validated baseline context, not as an open question.
It marks what is already working enough to build on.

## Official completion meaning

Part2 is considered complete based on real operating-flow validation, not only document completion.

## What is already settled

### 1. KPI separation is complete

- Official KPI source is fixed to `modules/kpi/*`
- Builder, Sandbox, Territory, Prescription, and RADAR must not recalculate KPI

### 2. Real operating flow is connected

- Monthly raw upload
- Automatic merge
- intake / staging
- integrated pipeline
- Builder final output

### 3. Real validation cases exist

- `company_000001` monthly raw upload and UI-based run validation completed
- `company_000002` messy raw intake correction and full pipeline validation completed

### 4. Report usability issues were resolved

- Territory report opening stabilized with local Leaflet bundle handling
- Prescription report monthly filter and monthly detail asset loading were normalized against actual generated outputs

## Practical meaning for new work

Do not redesign these areas as if they were still speculative:

- KPI split architecture
- intake / staging / orchestration boundary
- Builder render-only principle
- integrated run flow as a real operating baseline

## What is not a blocker

These items remain, but they are optimization or next-phase items:

- Territory `WARN`
  This is an operating warning, not a pipeline failure.
- Final physical relocation of `modules.validation`
  Direction is already agreed; compatibility remains for stability.
- Intake advisory refinement
  Current state is already operational; further refinement is incremental.

## Build implication

When planning the web or worker flow:

- Assume the core system is already validated enough to expose
- Focus on preserving and surfacing the validated flow
- Do not reopen settled responsibilities unless there is a concrete implementation blocker
