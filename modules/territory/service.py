from __future__ import annotations

import json

import pandas as pd

from common.pipeline_paths import ensure_parent, result_asset_root, standardized_root
from modules.kpi.territory_engine import build_territory_context
from result_assets.territory_result_asset import TerritoryResultAsset


def build_territory_result_asset(company_key: str) -> dict[str, object]:
    root = standardized_root(company_key, "territory")
    frame = pd.read_excel(root / "ops_territory_activity.xlsx", dtype=str).fillna("")
    engine_result = build_territory_context(frame.to_dict(orient="records"))

    result_asset = TerritoryResultAsset(
        company_key=company_key,
        metric_version=str(engine_result.get("metric_version", "territory_kpi_engine_v1")),
        coverage_summary=engine_result.get("coverage_summary", {}),
        optimization_summary=engine_result.get("optimization_summary", {}),
        markers=engine_result.get("markers", []),
        routes=engine_result.get("routes", []),
        region_zones=engine_result.get("region_zones", []),
        gaps=engine_result.get("gaps", []),
        notes=_build_notes(frame, engine_result.get("gaps", [])),
    )

    payload = result_asset.to_dict()
    target_path = result_asset_root(company_key, "territory") / "territory_result_asset.json"
    ensure_parent(target_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def _build_notes(frame: pd.DataFrame, gaps: list[dict[str, object]]) -> list[str]:
    notes: list[str] = []
    if frame.empty:
        notes.append("영업 활동 파일이 비어 있어 지도 결과가 비어 있습니다.")
    if gaps:
        notes.append("좌표 정보가 부족한 활동은 지도 점으로 표시되지 않았습니다.")
    return notes
