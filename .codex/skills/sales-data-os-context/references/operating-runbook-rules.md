# Operating Runbook Rules

Source basis:

- `docs/sales_data_os_runbook.md`

## System definition

- Entire system: `Sales Data OS`
- `OPS`: `Validation / Orchestration Layer`

## Core operating flow

`raw data -> adapter -> module/core engine -> result asset -> validation layer (OPS) -> intelligence (RADAR) -> builder`

## Responsibility split

- KPI calculation: `modules/kpi/*`
- Validation/Orchestration primary package: `modules/validation/*`
- Compatibility path: `ops_core/*`
- Builder: render-only

## Module notes

- Sandbox: analysis and exploration
- Territory: region and coverage analysis
- Prescription: prescription-flow validation
- RADAR: signal detection, issue prioritization, decision option templating
- Builder: final HTML rendering

## Execution behavior that matters during build

- KPI calculations happen in `modules/kpi/*`
- Sandbox-based execution mode automatically includes RADAR
- `CRM -> PDF` mode does not automatically run RADAR because Sandbox is not part of that mode
- Validation API primary entry is `modules.validation.main:app`
- `ops_core.main:app` remains only for compatibility

## Non-negotiable operating rules

- OPS handles validation and pass-through decisions only
- Builder only consumes approved payload and renders it
- Only validation-approved assets should move to Intelligence or Builder

## UX implications

When building run pages or pipeline pages:

- Reflect execution mode differences honestly
- Do not imply RADAR always runs in every mode
- Make approved vs not-approved flow clear
- Keep validation boundary visible in wording and status
