"""
CRM validation helpers for the Sales Data OS validation layer.
"""

from __future__ import annotations

from common.types import QualityGateStatus
from modules.validation.api._shared import ValidationEvaluation, _round_score


def evaluate_crm_asset(asset) -> ValidationEvaluation:
    mapping = asset.mapping_quality
    hospital_rate = float(mapping.hospital_mapping_rate or 0.0)
    rep_rate = float(mapping.rep_coverage_rate or 0.0)
    score = _round_score((hospital_rate * 70.0) + (rep_rate * 30.0))

    if hospital_rate >= 0.9 and rep_rate >= 0.9:
        status = QualityGateStatus.PASS
    elif hospital_rate >= 0.6:
        status = QualityGateStatus.WARN
    else:
        status = QualityGateStatus.FAIL

    next_modules = ["prescription", "sandbox"] if status != QualityGateStatus.FAIL else []
    note = (
        f"CRM 매핑 품질은 병원 연결 {hospital_rate * 100:.1f}%, "
        f"담당자 커버리지 {rep_rate * 100:.1f}% 기준입니다."
    )
    return ValidationEvaluation(
        quality_status=status,
        quality_score=score,
        reasoning_note=note,
        next_modules=next_modules,
        gate_details={
            "hospital_mapping_rate": round(hospital_rate, 4),
            "rep_coverage_rate": round(rep_rate, 4),
            "activity_count": int(asset.activity_context.total_activity_records or 0),
        },
    )
