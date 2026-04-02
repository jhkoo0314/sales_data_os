from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class SandboxResultAsset:
    company_key: str
    asset_type: str = "sandbox_result_asset"
    source_module: str = "sandbox"
    metric_version: str = "sandbox_kpi_engine_v1"
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    metric_months: list[str] = field(default_factory=list)
    official_kpi_6: dict[str, Any] = field(default_factory=dict)
    analysis_summary: dict[str, Any] = field(default_factory=dict)
    domain_quality: dict[str, Any] = field(default_factory=dict)
    join_quality: dict[str, Any] = field(default_factory=dict)
    hospital_records_sample: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
