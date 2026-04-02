from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from common.types import QualityGateStatus


class ValidationEvaluation(BaseModel):
    quality_status: QualityGateStatus = Field(default=QualityGateStatus.FAIL)
    quality_score: float = Field(default=0.0)
    reasoning_note: str = Field(default="")
    next_modules: list[str] = Field(default_factory=list)
    gate_details: dict[str, Any] = Field(default_factory=dict)


def _round_score(value: float) -> float:
    return round(max(0.0, min(100.0, float(value))), 1)
