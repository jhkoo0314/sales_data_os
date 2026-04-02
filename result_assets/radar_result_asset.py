from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class RadarResultAsset:
    company_key: str
    asset_type: str = "radar_result_asset"
    source_module: str = "radar"
    metric_version: str = "radar_engine_v1"
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    summary: dict[str, Any] = field(default_factory=dict)
    signals: list[dict[str, Any]] = field(default_factory=list)
    kpi_summary: dict[str, Any] = field(default_factory=dict)
    scope_summaries: dict[str, Any] = field(default_factory=dict)
    validation_summary: dict[str, Any] = field(default_factory=dict)
    sandbox_summary: dict[str, Any] = field(default_factory=dict)
    branch_options: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
