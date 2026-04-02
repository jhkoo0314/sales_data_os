from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from common.pipeline_paths import ensure_parent, result_asset_root
from modules.kpi.radar_engine import attach_decision_options, detect_signals, score_signals
from result_assets.radar_result_asset import RadarResultAsset


def build_radar_result_asset(company_key: str) -> dict[str, Any]:
    crm_asset = _read_json(result_asset_root(company_key, "crm") / "crm_result_asset.json")
    sandbox_asset = _read_json(result_asset_root(company_key, "sandbox") / "sandbox_result_asset.json")
    prescription_asset = _read_json(result_asset_root(company_key, "prescription") / "prescription_result_asset.json")
    territory_asset = _read_json(result_asset_root(company_key, "territory") / "territory_result_asset.json")

    signals = attach_decision_options(score_signals(detect_signals(crm_asset, sandbox_asset, prescription_asset, territory_asset)))

    result_asset = RadarResultAsset(
        company_key=company_key,
        summary=_build_summary(signals),
        signals=signals,
        kpi_summary=_build_kpi_summary(crm_asset, sandbox_asset),
        scope_summaries=_build_scope_summaries(prescription_asset, territory_asset),
        validation_summary=_build_validation_summary(crm_asset, sandbox_asset, prescription_asset, territory_asset),
        sandbox_summary=sandbox_asset.get("analysis_summary", {}),
        branch_options=_build_branch_options(territory_asset),
        notes=_build_notes(signals),
    )

    payload = result_asset.to_dict()
    target_path = result_asset_root(company_key, "radar") / "radar_result_asset.json"
    ensure_parent(target_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _build_summary(signals: list[dict[str, Any]]) -> dict[str, Any]:
    critical = sum(1 for row in signals if row.get("severity") == "critical")
    warning = sum(1 for row in signals if row.get("severity") == "warning")
    top = signals[0] if signals else {}
    return {
        "signal_count": len(signals),
        "critical_count": critical,
        "warning_count": warning,
        "top_signal_title": top.get("signal_title", ""),
        "top_priority_score": top.get("priority_score", 0),
    }


def _build_kpi_summary(crm_asset: dict[str, Any], sandbox_asset: dict[str, Any]) -> dict[str, Any]:
    crm_latest = {}
    monthly_rows = crm_asset.get("monthly_kpi", [])
    if monthly_rows:
        crm_latest = sorted(monthly_rows, key=lambda item: str(item.get("metric_month", "")))[-1]
    sandbox_kpi = sandbox_asset.get("official_kpi_6", {})
    return {
        "goal_attainment_pct": sandbox_kpi.get("monthly_attainment_rate", 0.0),
        "coach_score": crm_latest.get("coach_score", 0.0),
        "hir": crm_latest.get("hir", 0.0),
        "rtr": crm_latest.get("rtr", 0.0),
    }


def _build_scope_summaries(prescription_asset: dict[str, Any], territory_asset: dict[str, Any]) -> dict[str, Any]:
    return {
        "prescription_scope": prescription_asset.get("lineage_summary", {}),
        "territory_scope": territory_asset.get("coverage_summary", {}),
    }


def _build_validation_summary(
    crm_asset: dict[str, Any],
    sandbox_asset: dict[str, Any],
    prescription_asset: dict[str, Any],
    territory_asset: dict[str, Any],
) -> dict[str, Any]:
    return {
        "crm_mapping_quality": crm_asset.get("mapping_quality", {}),
        "sandbox_join_quality": sandbox_asset.get("join_quality", {}),
        "prescription_gap_summary": prescription_asset.get("validation_gap_summary", {}),
        "territory_optimization_summary": territory_asset.get("optimization_summary", {}),
    }


def _build_branch_options(territory_asset: dict[str, Any]) -> list[str]:
    branch_like = set()
    for route in territory_asset.get("routes", []):
        rep_name = str(route.get("rep_name", "")).strip()
        if rep_name:
            branch_like.add(rep_name)
    return ["전체지점"] + sorted(branch_like)[:20]


def _build_notes(signals: list[dict[str, Any]]) -> list[str]:
    if not signals:
        return ["현재 해석할 신호가 없어 radar 결과가 비어 있습니다."]
    top = signals[0]
    return [f"가장 먼저 볼 신호는 '{top.get('signal_title', '')}' 입니다."]
