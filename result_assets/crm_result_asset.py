from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class CrmResultAsset:
    company_key: str
    asset_type: str = "crm_result_asset"
    source_module: str = "crm"
    metric_version: str = "crm_kpi_engine_v1"
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    activity_context: dict[str, Any] = field(default_factory=dict)
    mapping_quality: dict[str, Any] = field(default_factory=dict)
    behavior_profiles: list[dict[str, Any]] = field(default_factory=list)
    monthly_kpi: list[dict[str, Any]] = field(default_factory=list)
    rep_monthly_kpi_11: list[dict[str, Any]] = field(default_factory=list)
    monthly_kpi_11: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
