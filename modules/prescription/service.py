from __future__ import annotations

import json
from typing import Any

import pandas as pd

from common.pipeline_paths import ensure_parent, result_asset_root, standardized_root
from modules.kpi.prescription_engine import build_prescription_context
from result_assets.prescription_result_asset import PrescriptionResultAsset


def build_prescription_result_asset(company_key: str) -> dict[str, Any]:
    root = standardized_root(company_key, "prescription")
    frame = pd.read_excel(root / "ops_prescription_standard.xlsx", dtype=str).fillna("")
    frame = frame.assign(
        quantity_num=frame.get("quantity", "").map(_to_float),
        amount_num=frame.get("amount", "").map(_to_float),
    )

    engine_result = build_prescription_context(frame.to_dict(orient="records"))
    gaps = engine_result.get("gaps", [])
    result_asset = PrescriptionResultAsset(
        company_key=company_key,
        metric_version=str(engine_result.get("metric_version", "prescription_kpi_engine_v1")),
        lineage_summary=_build_lineage_summary(frame),
        reconciliation_summary=_build_reconciliation_summary(frame),
        validation_gap_summary=_build_validation_gap_summary(frame, gaps),
        mapping_quality=_build_mapping_quality(frame),
        flow_series=engine_result.get("flow_series", []),
        pipeline_steps=engine_result.get("pipeline_steps", []),
        claims=engine_result.get("claims", []),
        hospital_traces=engine_result.get("hospital_traces", []),
        rep_kpis=engine_result.get("rep_kpis", []),
        gaps=gaps,
        notes=_build_notes(frame),
    )

    payload = result_asset.to_dict()
    target_path = result_asset_root(company_key, "prescription") / "prescription_result_asset.json"
    ensure_parent(target_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def _to_float(value: Any) -> float:
    text = str(value or "").strip().replace(",", "")
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


def _build_lineage_summary(frame: pd.DataFrame) -> dict[str, Any]:
    months = sorted({str(value).strip() for value in frame.get("metric_month", pd.Series(dtype=str)).tolist() if str(value).strip()})
    return {
        "row_count": int(len(frame)),
        "metric_months": months,
        "metric_month_start": months[0] if months else "",
        "metric_month_end": months[-1] if months else "",
        "pharmacy_count": _count_distinct(frame, "pharmacy_name"),
        "brand_count": _count_distinct(frame, "brand_name"),
    }


def _build_reconciliation_summary(frame: pd.DataFrame) -> dict[str, Any]:
    return {
        "total_quantity": round(float(frame.get("quantity_num", pd.Series(dtype=float)).sum()), 1),
        "total_amount": round(float(frame.get("amount_num", pd.Series(dtype=float)).sum()), 1),
        "nonzero_amount_rows": int(sum(1 for value in frame.get("amount_num", pd.Series(dtype=float)).tolist() if float(value) > 0)),
    }


def _build_validation_gap_summary(frame: pd.DataFrame, gaps: list[dict[str, Any]]) -> dict[str, Any]:
    total_rows = max(len(frame), 1)
    amount_missing = sum(1 for value in frame.get("amount", pd.Series(dtype=str)).tolist() if not str(value).strip())
    quantity_missing = sum(1 for value in frame.get("quantity", pd.Series(dtype=str)).tolist() if not str(value).strip())
    return {
        "gap_count": len(gaps),
        "amount_missing_rate": round((amount_missing / total_rows) * 100.0, 1),
        "quantity_missing_rate": round((quantity_missing / total_rows) * 100.0, 1),
    }


def _build_mapping_quality(frame: pd.DataFrame) -> dict[str, Any]:
    total_rows = max(len(frame), 1)
    return {
        "ship_date_fill_rate": _fill_rate(frame, "ship_date", total_rows),
        "metric_month_fill_rate": _fill_rate(frame, "metric_month", total_rows),
        "pharmacy_name_fill_rate": _fill_rate(frame, "pharmacy_name", total_rows),
        "brand_name_fill_rate": _fill_rate(frame, "brand_name", total_rows),
        "quantity_fill_rate": _fill_rate(frame, "quantity", total_rows),
        "amount_fill_rate": _fill_rate(frame, "amount", total_rows),
    }


def _build_notes(frame: pd.DataFrame) -> list[str]:
    notes: list[str] = []
    if "amount" not in frame.columns or not frame["amount"].astype(str).str.strip().any():
        notes.append("출고금액 정보가 약해 수량 중심 해석이 더 중요합니다.")
    return notes


def _fill_rate(frame: pd.DataFrame, column: str, total_rows: int) -> float:
    if frame.empty or column not in frame.columns:
        return 0.0
    filled = sum(1 for value in frame[column].tolist() if str(value).strip())
    return round((filled / total_rows) * 100.0, 1)


def _count_distinct(frame: pd.DataFrame, column: str) -> int:
    if frame.empty or column not in frame.columns:
        return 0
    return len({str(value).strip() for value in frame[column].tolist() if str(value).strip()})
