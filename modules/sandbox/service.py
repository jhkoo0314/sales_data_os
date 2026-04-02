from __future__ import annotations

import json
from typing import Any

import pandas as pd

from common.pipeline_paths import ensure_parent, result_asset_root, standardized_root
from modules.kpi.sandbox_engine import compute_sandbox_official_kpi_6
from result_assets.sandbox_result_asset import SandboxResultAsset


def build_sandbox_result_asset(company_key: str) -> dict[str, Any]:
    sandbox_root = standardized_root(company_key, "sandbox")
    sales_frame = pd.read_excel(sandbox_root / "ops_sales_records.xlsx", dtype=str).fillna("")
    target_frame = pd.read_excel(sandbox_root / "ops_target_records.xlsx", dtype=str).fillna("")

    sales_frame = sales_frame.assign(sales_amount_num=sales_frame.get("sales_amount", "").map(_to_float))
    target_frame = target_frame.assign(target_amount_num=target_frame.get("target_amount", "").map(_to_float))

    sales_by_month = _aggregate_by_month(sales_frame, "sales_amount_num")
    target_by_month = _aggregate_by_month(target_frame, "target_amount_num")
    official_kpi_6 = compute_sandbox_official_kpi_6(sales_by_month, target_by_month)

    result_asset = SandboxResultAsset(
        company_key=company_key,
        metric_months=sorted(set(sales_by_month.keys()) | set(target_by_month.keys())),
        official_kpi_6=official_kpi_6,
        analysis_summary=_build_analysis_summary(sales_frame, target_frame, official_kpi_6),
        domain_quality=_build_domain_quality(sales_frame, target_frame),
        join_quality=_build_join_quality(sales_frame, target_frame),
        hospital_records_sample=_build_hospital_record_sample(sales_frame, target_frame),
        notes=_build_notes(sales_frame, target_frame),
    )

    payload = result_asset.to_dict()
    target_path = result_asset_root(company_key, "sandbox") / "sandbox_result_asset.json"
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


def _aggregate_by_month(frame: pd.DataFrame, amount_column: str) -> dict[str, float]:
    if frame.empty:
        return {}
    grouped = (
        frame.assign(metric_month=frame.get("metric_month", "").astype(str).str.strip())
        .groupby("metric_month", dropna=False)[amount_column]
        .sum()
    )
    return {str(month).strip(): float(amount) for month, amount in grouped.items() if str(month).strip()}


def _build_analysis_summary(
    sales_frame: pd.DataFrame,
    target_frame: pd.DataFrame,
    official_kpi_6: dict[str, Any],
) -> dict[str, Any]:
    return {
        "sales_row_count": int(len(sales_frame)),
        "target_row_count": int(len(target_frame)),
        "account_count": int(_count_distinct(sales_frame, "account_id", "account_name")),
        "brand_count": int(_count_distinct(sales_frame, "brand_name")),
        "reference_month": official_kpi_6.get("reference_month", ""),
        "latest_month_attainment_rate": official_kpi_6.get("monthly_attainment_rate", 0.0),
    }


def _build_domain_quality(sales_frame: pd.DataFrame, target_frame: pd.DataFrame) -> dict[str, Any]:
    sales_total = max(len(sales_frame), 1)
    target_total = max(len(target_frame), 1)
    return {
        "sales_metric_month_fill_rate": _fill_rate(sales_frame, "metric_month", sales_total),
        "sales_amount_fill_rate": _fill_rate(sales_frame, "sales_amount", sales_total),
        "target_metric_month_fill_rate": _fill_rate(target_frame, "metric_month", target_total),
        "target_amount_fill_rate": _fill_rate(target_frame, "target_amount", target_total),
        "sales_account_fill_rate": _either_fill_rate(sales_frame, ["account_id", "account_name"], sales_total),
        "target_account_fill_rate": _either_fill_rate(target_frame, ["account_id", "account_name"], target_total),
    }


def _build_join_quality(sales_frame: pd.DataFrame, target_frame: pd.DataFrame) -> dict[str, Any]:
    sales_months = {str(value).strip() for value in sales_frame.get("metric_month", pd.Series(dtype=str)).tolist() if str(value).strip()}
    target_months = {str(value).strip() for value in target_frame.get("metric_month", pd.Series(dtype=str)).tolist() if str(value).strip()}
    shared_months = sorted(sales_months & target_months)

    sales_pairs = _month_account_pairs(sales_frame)
    target_pairs = _month_account_pairs(target_frame)
    shared_pairs = sales_pairs & target_pairs

    denominator = max(len(sales_pairs), 1)
    return {
        "shared_metric_months": shared_months,
        "shared_metric_month_count": len(shared_months),
        "month_overlap_rate": round((len(shared_months) / max(len(sales_months | target_months), 1)) * 100.0, 1),
        "account_month_match_rate": round((len(shared_pairs) / denominator) * 100.0, 1),
    }


def _month_account_pairs(frame: pd.DataFrame) -> set[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    if frame.empty:
        return pairs
    for row in frame.to_dict(orient="records"):
        month = str(row.get("metric_month", "")).strip()
        account = str(row.get("account_id") or row.get("account_name") or "").strip()
        if month and account:
            pairs.add((month, account))
    return pairs


def _build_hospital_record_sample(sales_frame: pd.DataFrame, target_frame: pd.DataFrame) -> list[dict[str, Any]]:
    if sales_frame.empty and target_frame.empty:
        return []

    sales_grouped = (
        sales_frame.assign(account_key=sales_frame.get("account_id", "").where(sales_frame.get("account_id", "").astype(str).str.strip() != "", sales_frame.get("account_name", "")))
        .groupby(["metric_month", "account_key", "account_name", "brand_name"], dropna=False)["sales_amount_num"]
        .sum()
        .reset_index()
    )
    target_grouped = (
        target_frame.assign(account_key=target_frame.get("account_id", "").where(target_frame.get("account_id", "").astype(str).str.strip() != "", target_frame.get("account_name", "")))
        .groupby(["metric_month", "account_key", "account_name", "brand_name"], dropna=False)["target_amount_num"]
        .sum()
        .reset_index()
    )

    merged = sales_grouped.merge(
        target_grouped,
        on=["metric_month", "account_key", "account_name", "brand_name"],
        how="outer",
    ).fillna(0.0)
    merged["attainment_rate"] = merged.apply(
        lambda row: round((float(row["sales_amount_num"]) / float(row["target_amount_num"]) * 100.0), 1)
        if float(row["target_amount_num"]) > 0
        else 0.0,
        axis=1,
    )
    merged = merged.sort_values(["metric_month", "sales_amount_num"], ascending=[False, False])

    rows: list[dict[str, Any]] = []
    for row in merged.head(20).to_dict(orient="records"):
        rows.append(
            {
                "metric_month": str(row.get("metric_month", "")).strip(),
                "account_id": str(row.get("account_key", "")).strip(),
                "account_name": str(row.get("account_name", "")).strip(),
                "brand_name": str(row.get("brand_name", "")).strip(),
                "sales_amount": round(float(row.get("sales_amount_num", 0.0) or 0.0), 0),
                "target_amount": round(float(row.get("target_amount_num", 0.0) or 0.0), 0),
                "attainment_rate": float(row.get("attainment_rate", 0.0) or 0.0),
            }
        )
    return rows


def _build_notes(sales_frame: pd.DataFrame, target_frame: pd.DataFrame) -> list[str]:
    notes: list[str] = []
    if sales_frame.empty:
        notes.append("매출 표준화 파일이 비어 있어 KPI는 0 기준으로 계산했습니다.")
    if target_frame.empty:
        notes.append("목표 표준화 파일이 비어 있어 달성률은 0 기준으로 계산했습니다.")
    if not (_month_account_pairs(sales_frame) & _month_account_pairs(target_frame)):
        notes.append("매출과 목표의 account-month 겹침이 약해 병원 단위 비교는 샘플 수준으로만 제공했습니다.")
    return notes


def _count_distinct(frame: pd.DataFrame, *columns: str) -> int:
    values: set[str] = set()
    if frame.empty:
        return 0
    for row in frame.to_dict(orient="records"):
        for column in columns:
            value = str(row.get(column, "")).strip()
            if value:
                values.add(value)
                break
    return len(values)


def _fill_rate(frame: pd.DataFrame, column: str, total_rows: int) -> float:
    if frame.empty or column not in frame.columns:
        return 0.0
    filled = sum(1 for value in frame[column].tolist() if str(value).strip())
    return round((filled / total_rows) * 100.0, 1)


def _either_fill_rate(frame: pd.DataFrame, columns: list[str], total_rows: int) -> float:
    if frame.empty:
        return 0.0
    filled = 0
    for row in frame.to_dict(orient="records"):
        if any(str(row.get(column, "")).strip() for column in columns):
            filled += 1
    return round((filled / total_rows) * 100.0, 1)
