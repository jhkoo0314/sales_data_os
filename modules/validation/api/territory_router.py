"""
Territory validation helpers for the Sales Data OS validation layer.
"""

from __future__ import annotations

from common.types import QualityGateStatus
from modules.validation.api._shared import ValidationEvaluation, _round_score


def evaluate_territory_asset(asset) -> ValidationEvaluation:
    coverage = float(asset.coverage_summary.coverage_rate or 0.0)
    marker_count = len(asset.markers)
    gap_count = len(asset.gaps)
    gap_penalty = min(20.0, float(gap_count))
    score = _round_score((coverage * 100.0) - gap_penalty)

    if marker_count <= 0:
        status = QualityGateStatus.FAIL
    elif coverage >= 0.7:
        status = QualityGateStatus.PASS
    elif coverage >= 0.4:
        status = QualityGateStatus.WARN
    else:
        status = QualityGateStatus.FAIL

    next_modules = ["builder"] if status != QualityGateStatus.FAIL else []
    note = (
        f"Territory 품질은 권역 커버리지 {coverage * 100:.1f}%와 "
        f"갭 병원 {gap_count}건 기준입니다."
    )
    return ValidationEvaluation(
        quality_status=status,
        quality_score=score,
        reasoning_note=note,
        next_modules=next_modules,
        gate_details={
            "coverage_rate": round(coverage, 4),
            "marker_count": marker_count,
            "gap_count": gap_count,
        },
    )
