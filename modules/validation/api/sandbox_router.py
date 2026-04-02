"""
Sandbox validation helpers for the Sales Data OS validation layer.
"""

from __future__ import annotations

from common.types import QualityGateStatus
from modules.validation.api._shared import ValidationEvaluation, _round_score


def evaluate_sandbox_asset(asset) -> ValidationEvaluation:
    summary = asset.analysis_summary
    join_quality = asset.join_quality

    sales_amount = float(summary.total_sales_amount or 0.0)
    join_rate = float(join_quality.crm_sales_join_rate or 0.0)
    full_join_rate = float(join_quality.full_join_rate or 0.0)
    attainment = summary.avg_attainment_rate
    attainment_score = 0.0 if attainment is None else min(1.0, max(0.0, float(attainment)))

    score = _round_score((join_rate * 45.0) + (full_join_rate * 35.0) + (attainment_score * 20.0))
    if sales_amount <= 0:
        status = QualityGateStatus.FAIL
    elif join_rate >= 0.7:
        status = QualityGateStatus.PASS
    elif join_rate >= 0.4:
        status = QualityGateStatus.WARN
    else:
        status = QualityGateStatus.FAIL

    next_modules = ["territory", "builder"] if status != QualityGateStatus.FAIL else []
    note = (
        f"Sandbox 전달 판단은 CRM-Sales 조인율 {join_rate * 100:.1f}%, "
        f"완전 조인율 {full_join_rate * 100:.1f}% 기준입니다."
    )
    return ValidationEvaluation(
        quality_status=status,
        quality_score=score,
        reasoning_note=note,
        next_modules=next_modules,
        gate_details={
            "crm_sales_join_rate": round(join_rate, 4),
            "full_join_rate": round(full_join_rate, 4),
            "total_sales_amount": round(sales_amount, 0),
        },
    )
