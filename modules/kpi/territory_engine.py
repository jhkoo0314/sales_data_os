from __future__ import annotations

from typing import Any


def build_territory_context(records: list[dict[str, Any]]) -> dict[str, Any]:
    if not records:
        return {
            "markers": [],
            "routes": [],
            "region_zones": [],
            "gaps": [],
            "coverage_summary": {},
            "optimization_summary": {},
            "metric_version": "territory_kpi_engine_v1",
        }

    rep_month_totals: dict[tuple[str, str], dict[str, Any]] = {}
    markers: list[dict[str, Any]] = []
    coordinate_missing = 0

    for row in records:
        metric_month = str(row.get("metric_month", "")).strip()
        rep_id = str(row.get("rep_id", "")).strip()
        rep_name = str(row.get("rep_name", "")).strip()
        account_name = str(row.get("account_name", "")).strip()
        activity_type = str(row.get("activity_type", "")).strip()
        latitude = _to_float(row.get("latitude"))
        longitude = _to_float(row.get("longitude"))

        if latitude is None or longitude is None:
            coordinate_missing += 1
        else:
            markers.append(
                {
                    "metric_month": metric_month,
                    "rep_id": rep_id,
                    "rep_name": rep_name,
                    "account_name": account_name,
                    "activity_type": activity_type,
                    "latitude": latitude,
                    "longitude": longitude,
                }
            )

        if metric_month and rep_id:
            key = (metric_month, rep_id)
            bucket = rep_month_totals.setdefault(
                key,
                {
                    "metric_month": metric_month,
                    "rep_id": rep_id,
                    "rep_name": rep_name,
                    "activity_count": 0,
                    "account_names": set(),
                },
            )
            bucket["activity_count"] += 1
            if account_name:
                bucket["account_names"].add(account_name)

    routes = []
    for bucket in rep_month_totals.values():
        routes.append(
            {
                "metric_month": bucket["metric_month"],
                "rep_id": bucket["rep_id"],
                "rep_name": bucket["rep_name"],
                "activity_count": bucket["activity_count"],
                "account_count": len(bucket["account_names"]),
            }
        )

    gaps = []
    if coordinate_missing:
        gaps.append(
            {
                "gap_type": "missing_coordinates",
                "reason": "위도/경도 값이 없는 활동이 있어 지도 표시 범위가 일부 제한됩니다.",
                "row_count": coordinate_missing,
            }
        )

    unique_accounts = {str(row.get("account_name", "")).strip() for row in records if str(row.get("account_name", "")).strip()}
    unique_reps = {str(row.get("rep_id", "")).strip() for row in records if str(row.get("rep_id", "")).strip()}

    return {
        "markers": markers[:200],
        "routes": sorted(routes, key=lambda item: (item["metric_month"], item["rep_id"])),
        "region_zones": [],
        "gaps": gaps,
        "coverage_summary": {
            "rep_count": len(unique_reps),
            "account_count": len(unique_accounts),
            "mapped_marker_count": len(markers),
        },
        "optimization_summary": {
            "coordinate_missing_count": coordinate_missing,
            "route_group_count": len(routes),
        },
        "metric_version": "territory_kpi_engine_v1",
    }


def _to_float(value: Any) -> float | None:
    text = str(value or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None
