"""
Prescription validation helpers for the Sales Data OS validation layer.
"""

from __future__ import annotations

from common.types import QualityGateStatus
from modules.validation.api._shared import ValidationEvaluation, _round_score


def evaluate_prescription_asset(asset) -> ValidationEvaluation:
    mapping = asset.mapping_quality
    completion = float(mapping.flow_completion_rate or 0.0)
    coverage = float(mapping.hospital_coverage_rate or 0.0)
    score = _round_score((completion * 70.0) + (coverage * 30.0))

    if completion >= 0.8:
        status = QualityGateStatus.PASS
    elif completion >= 0.5:
        status = QualityGateStatus.WARN
    else:
        status = QualityGateStatus.FAIL

    next_modules = ["sandbox"] if status != QualityGateStatus.FAIL else []
    note = (
        f"Prescription 흐름 완결률 {completion * 100:.1f}%, "
        f"병원 연결 활용률 {coverage * 100:.1f}% 기준입니다."
    )
    return ValidationEvaluation(
        quality_status=status,
        quality_score=score,
        reasoning_note=note,
        next_modules=next_modules,
        gate_details={
            "flow_completion_rate": round(completion, 4),
            "hospital_coverage_rate": round(coverage, 4),
            "gap_count": int(asset.validation_gap_summary.total_gap_records or 0),
        },
    )
