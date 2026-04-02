from __future__ import annotations

from typing import Any


def build_prescription_context(records: list[dict[str, Any]]) -> dict[str, Any]:
    if not records:
        return {
            "flow_series": [],
            "pipeline_steps": [],
            "claims": [],
            "hospital_traces": [],
            "rep_kpis": [],
            "gaps": [],
            "metric_version": "prescription_kpi_engine_v1",
        }

    month_brand_totals: dict[tuple[str, str], dict[str, float | str]] = {}
    month_totals: dict[str, dict[str, float | str]] = {}
    pharmacy_totals: dict[str, dict[str, float | str]] = {}

    for row in records:
        metric_month = str(row.get("metric_month", "")).strip()
        brand_name = str(row.get("brand_name", "")).strip()
        pharmacy_name = str(row.get("pharmacy_name", "")).strip()
        quantity = float(row.get("quantity_num", 0.0) or 0.0)
        amount = float(row.get("amount_num", 0.0) or 0.0)

        if metric_month and brand_name:
            key = (metric_month, brand_name)
            bucket = month_brand_totals.setdefault(
                key,
                {"metric_month": metric_month, "brand_name": brand_name, "quantity": 0.0, "amount": 0.0},
            )
            bucket["quantity"] = float(bucket["quantity"]) + quantity
            bucket["amount"] = float(bucket["amount"]) + amount

        if metric_month:
            month_bucket = month_totals.setdefault(metric_month, {"metric_month": metric_month, "quantity": 0.0, "amount": 0.0})
            month_bucket["quantity"] = float(month_bucket["quantity"]) + quantity
            month_bucket["amount"] = float(month_bucket["amount"]) + amount

        if pharmacy_name:
            pharmacy_bucket = pharmacy_totals.setdefault(
                pharmacy_name,
                {"pharmacy_name": pharmacy_name, "quantity": 0.0, "amount": 0.0, "record_count": 0.0},
            )
            pharmacy_bucket["quantity"] = float(pharmacy_bucket["quantity"]) + quantity
            pharmacy_bucket["amount"] = float(pharmacy_bucket["amount"]) + amount
            pharmacy_bucket["record_count"] = float(pharmacy_bucket["record_count"]) + 1.0

    flow_series = sorted(month_brand_totals.values(), key=lambda item: (str(item["metric_month"]), str(item["brand_name"])))
    monthly_totals = sorted(month_totals.values(), key=lambda item: str(item["metric_month"]))
    claims = sorted(pharmacy_totals.values(), key=lambda item: float(item["amount"]), reverse=True)[:20]

    pipeline_steps = []
    for month_row in monthly_totals:
        pipeline_steps.append(
            {
                "metric_month": month_row["metric_month"],
                "step_name": "dispense_flow",
                "quantity": round(float(month_row["quantity"]), 1),
                "amount": round(float(month_row["amount"]), 1),
            }
        )

    gaps = []
    for month_row in monthly_totals:
        if float(month_row["amount"]) <= 0:
            gaps.append(
                {
                    "metric_month": month_row["metric_month"],
                    "gap_type": "missing_amount",
                    "reason": "출고금액 정보가 비어 있습니다.",
                }
            )

    return {
        "flow_series": [
            {
                "metric_month": str(item["metric_month"]),
                "brand_name": str(item["brand_name"]),
                "quantity": round(float(item["quantity"]), 1),
                "amount": round(float(item["amount"]), 1),
            }
            for item in flow_series
        ],
        "pipeline_steps": pipeline_steps,
        "claims": [
            {
                "pharmacy_name": str(item["pharmacy_name"]),
                "quantity": round(float(item["quantity"]), 1),
                "amount": round(float(item["amount"]), 1),
                "record_count": int(float(item["record_count"])),
            }
            for item in claims
        ],
        "hospital_traces": [],
        "rep_kpis": [],
        "gaps": gaps,
        "metric_version": "prescription_kpi_engine_v1",
    }
