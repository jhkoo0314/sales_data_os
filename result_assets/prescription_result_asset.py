from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class PrescriptionResultAsset:
    company_key: str
    asset_type: str = "prescription_result_asset"
    source_module: str = "prescription"
    metric_version: str = "prescription_kpi_engine_v1"
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))
    lineage_summary: dict[str, Any] = field(default_factory=dict)
    reconciliation_summary: dict[str, Any] = field(default_factory=dict)
    validation_gap_summary: dict[str, Any] = field(default_factory=dict)
    mapping_quality: dict[str, Any] = field(default_factory=dict)
    flow_series: list[dict[str, Any]] = field(default_factory=list)
    pipeline_steps: list[dict[str, Any]] = field(default_factory=list)
    claims: list[dict[str, Any]] = field(default_factory=list)
    hospital_traces: list[dict[str, Any]] = field(default_factory=list)
    rep_kpis: list[dict[str, Any]] = field(default_factory=list)
    gaps: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
