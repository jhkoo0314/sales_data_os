# System Boundaries And Flow

Source basis:

- `docs/SALES_DATA_OS_DETAIL.md`

## One-line definition

Sales Data OS is a sales operations system that connects:

`intake -> standardization -> KPI calculation -> validation/orchestration -> intelligence -> report rendering`

## Why this matters

This is not a single report or dashboard.
It is a repeatable operating flow that starts from raw company data and ends with decision-support outputs.

## Official flow

`raw data -> intake/onboarding -> adapter -> module/core engine -> result asset -> validation layer (OPS) -> intelligence (RADAR) -> builder`

## System-level rules

- Whole system name: `Sales Data OS`
- `OPS` means only `Validation / Orchestration Layer`
- KPI single source: `modules/kpi/*`
- Builder is render-only
- Result handoff between modules should happen through `Result Asset`
- The practical operating entry point is one shared intake/onboarding engine

## Layer responsibilities

### Data Layer

- Hold raw company data as-is
- Do not calculate here

### Intake / Onboarding Layer

- Check required inputs
- Infer column meaning
- Normalize dates and month fields
- Deduplicate rows
- Compute source coverage ranges
- Explain time-range gaps and readiness
- Help decide whether processing should continue

This layer is not just a gate.
It is the entry stage that makes messy data understandable and operable.

### Adapter Layer

- Convert company-specific raw files into common structures
- Preserve original meaning

### Core Engine / KPI Layer

- Perform official KPI calculations
- Produce result assets for downstream use

Do not use the web, Builder, or OPS to recreate KPI formulas.

### Validation / Orchestration Layer (OPS)

- Validate quality
- Validate mappings
- Decide whether results can move forward
- Control execution order and state

Do not:

- Calculate KPI
- Render reports
- Act as the whole system name

### Intelligence Layer (RADAR)

- Detect signals
- Prioritize issues
- Structure decision options

Do not:

- Recalculate KPI
- Make final field decisions automatically

### Presentation Layer (Builder)

- Render approved payload into final HTML outputs

Do not:

- Calculate KPI
- Reinterpret raw data

## Operating UX implications

When building the web:

- Do not show upload as only "success or failure"
- Explain what is missing, adjusted, misaligned, or still review-worthy
- Explain common analysis window when source periods differ
- Show what is validated and what is still only uploaded

## Important interpretation

If source periods differ, that does not always mean execution must stop.
The correct behavior is often:

- explain the difference clearly
- state the common analyzable period
- proceed when validation says that shared window is still usable
