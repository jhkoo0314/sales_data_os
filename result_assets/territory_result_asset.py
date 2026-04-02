from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class TerritoryResultAsset:
    company_key: str
    asset_type: str = "territory_result_asset"
    source_module: str = "territory"
    metric_version: str = "territory_kpi_engine_v1"
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    coverage_summary: dict[str, Any] = field(default_factory=dict)
    optimization_summary: dict[str, Any] = field(default_factory=dict)
    markers: list[dict[str, Any]] = field(default_factory=list)
    routes: list[dict[str, Any]] = field(default_factory=list)
    region_zones: list[dict[str, Any]] = field(default_factory=list)
    gaps: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
