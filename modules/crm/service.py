from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from common.pipeline_paths import ensure_parent, result_asset_root, standardized_root
from modules.kpi.crm_engine import compute_crm_kpi_bundle
from result_assets.crm_result_asset import CrmResultAsset


def build_crm_result_asset(company_key: str) -> dict[str, Any]:
    crm_root = standardized_root(company_key, "crm")
    activity_path = crm_root / "ops_crm_activity.xlsx"
    company_master_path = crm_root / "ops_company_master.xlsx"
    hospital_master_path = crm_root / "ops_hospital_master.xlsx"

    activity_frame = pd.read_excel(activity_path, dtype=str).fillna("")
    company_master_frame = _read_excel_or_empty(company_master_path)
    hospital_master_frame = _read_excel_or_empty(hospital_master_path)

    enriched_activities = _prepare_activity_rows(activity_frame, hospital_master_frame)
    rep_rows, month_rows, metric_version = compute_crm_kpi_bundle(enriched_activities)

    result_asset = CrmResultAsset(
        company_key=company_key,
        metric_version=metric_version,
        activity_context=_build_activity_context(activity_frame, company_master_frame, hospital_master_frame),
        mapping_quality=_build_mapping_quality(activity_frame, hospital_master_frame),
        behavior_profiles=_build_behavior_profiles(activity_frame),
        monthly_kpi=_build_monthly_kpi(month_rows),
        rep_monthly_kpi_11=rep_rows,
        monthly_kpi_11=month_rows,
        notes=_build_notes(activity_frame, hospital_master_frame),
    )

    payload = result_asset.to_dict()
    target_path = result_asset_root(company_key, "crm") / "crm_result_asset.json"
    ensure_parent(target_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def _read_excel_or_empty(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_excel(path, dtype=str).fillna("")


def _prepare_activity_rows(activity_frame: pd.DataFrame, hospital_master_frame: pd.DataFrame) -> list[dict[str, Any]]:
    hospital_lookup: dict[tuple[str, str], dict[str, str]] = {}
    if not hospital_master_frame.empty:
        for row in hospital_master_frame.to_dict(orient="records"):
            key = (str(row.get("account_name", "")).strip(), str(row.get("rep_id", "")).strip())
            hospital_lookup[key] = row

    prepared: list[dict[str, Any]] = []
    for row in activity_frame.to_dict(orient="records"):
        activity_type = str(row.get("activity_type", "")).strip()
        product_mentions = str(row.get("product_mentions", "")).strip()
        joined = hospital_lookup.get((str(row.get("account_name", "")).strip(), str(row.get("rep_id", "")).strip()), {})
        prepared.append(
            {
                **row,
                "visit_count": 1,
                "has_detail_call": _is_detail_call(activity_type, product_mentions),
                "next_action_text": product_mentions,
                "hospital_id": str(joined.get("account_id") or row.get("account_name") or "").strip(),
                "hospital_name": str(joined.get("account_name") or row.get("account_name") or "").strip(),
            }
        )
    return prepared


def _is_detail_call(activity_type: str, product_mentions: str) -> bool:
    text = f"{activity_type} {product_mentions}".lower()
    keywords = ("pt", "제품설명", "디테일", "detail", "demo", "시연")
    return any(keyword in text for keyword in keywords)


def _build_activity_context(
    activity_frame: pd.DataFrame,
    company_master_frame: pd.DataFrame,
    hospital_master_frame: pd.DataFrame,
) -> dict[str, Any]:
    months = sorted({str(value).strip() for value in activity_frame.get("metric_month", pd.Series(dtype=str)).tolist() if str(value).strip()})
    rep_ids = {str(value).strip() for value in activity_frame.get("rep_id", pd.Series(dtype=str)).tolist() if str(value).strip()}
    return {
        "row_count": int(len(activity_frame)),
        "metric_months": months,
        "metric_month_start": months[0] if months else "",
        "metric_month_end": months[-1] if months else "",
        "rep_count": len(rep_ids),
        "company_master_count": int(len(company_master_frame)),
        "hospital_master_count": int(len(hospital_master_frame)),
    }


def _build_mapping_quality(activity_frame: pd.DataFrame, hospital_master_frame: pd.DataFrame) -> dict[str, Any]:
    total_rows = max(len(activity_frame), 1)
    matched_accounts = 0
    if not activity_frame.empty and not hospital_master_frame.empty:
        known_accounts = {
            (str(row.get("account_name", "")).strip(), str(row.get("rep_id", "")).strip())
            for row in hospital_master_frame.to_dict(orient="records")
        }
        for row in activity_frame.to_dict(orient="records"):
            key = (str(row.get("account_name", "")).strip(), str(row.get("rep_id", "")).strip())
            if key in known_accounts:
                matched_accounts += 1

    def fill_rate(column: str) -> float:
        if column not in activity_frame.columns or activity_frame.empty:
            return 0.0
        filled = sum(1 for value in activity_frame[column].tolist() if str(value).strip())
        return round((filled / total_rows) * 100.0, 1)

    return {
        "activity_date_fill_rate": fill_rate("activity_date"),
        "metric_month_fill_rate": fill_rate("metric_month"),
        "rep_id_fill_rate": fill_rate("rep_id"),
        "account_name_fill_rate": fill_rate("account_name"),
        "activity_type_fill_rate": fill_rate("activity_type"),
        "hospital_join_match_rate": round((matched_accounts / total_rows) * 100.0, 1),
    }


def _build_behavior_profiles(activity_frame: pd.DataFrame) -> list[dict[str, Any]]:
    if activity_frame.empty:
        return []

    profiles: list[dict[str, Any]] = []
    for metric_month, month_frame in activity_frame.groupby("metric_month", dropna=False):
        counts = month_frame["activity_type"].fillna("").astype(str).str.strip().value_counts()
        total = int(counts.sum())
        top_behaviors = [
            {
                "activity_type": activity_type,
                "count": int(count),
                "share_pct": round((int(count) / total) * 100.0, 1) if total else 0.0,
            }
            for activity_type, count in counts.head(8).items()
        ]
        profiles.append(
            {
                "metric_month": str(metric_month or ""),
                "activity_count": total,
                "top_behaviors": top_behaviors,
            }
        )
    return sorted(profiles, key=lambda item: item["metric_month"])


def _build_monthly_kpi(month_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in month_rows:
        metric_set = row.get("metric_set", {})
        rows.append(
            {
                "metric_month": row.get("metric_month", ""),
                "rep_count": row.get("rep_count", 0),
                "coach_score": metric_set.get("coach_score", 0.0),
                "hir": metric_set.get("hir", 0.0),
                "rtr": metric_set.get("rtr", 0.0),
                "pv": metric_set.get("pv", 0.0),
                "pi": metric_set.get("pi", 0.0),
            }
        )
    return rows


def _build_notes(activity_frame: pd.DataFrame, hospital_master_frame: pd.DataFrame) -> list[str]:
    notes: list[str] = []
    if "product_mentions" not in activity_frame.columns or not activity_frame["product_mentions"].fillna("").astype(str).str.strip().any():
        notes.append("제품 언급 정보가 약해서 next action 해석은 단순 기준으로 계산했습니다.")
    if hospital_master_frame.empty:
        notes.append("병원 기준 매핑 파일이 없어 account_name을 임시 병원 식별값으로 사용했습니다.")
    return notes
