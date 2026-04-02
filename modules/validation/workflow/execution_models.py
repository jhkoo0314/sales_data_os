from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class ExecutionContext:
    project_root: str
    company_key: str
    company_name: str
    source_targets: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionStepResult:
    step: int
    module: str
    status: str
    score: float
    summary: dict[str, Any] = field(default_factory=dict)
    duration_ms: int = 0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ExecutionRunResult:
    run_id: str
    execution_mode: str
    execution_mode_label: str
    company_key: str
    company_name: str
    overall_status: str
    overall_score: float
    total_duration_ms: int
    steps: list[ExecutionStepResult] = field(default_factory=list)
    summary_by_module: dict[str, Any] = field(default_factory=dict)
