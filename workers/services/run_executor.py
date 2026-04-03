from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from common.company_runtime import get_active_company_name
from modules.validation.workflow.execution_service import (
    build_execution_context,
    run_execution_mode,
)
from modules.validation.workflow.execution_registry import is_supported_execution_mode


@dataclass
class RunExecutionPayload:
    run_key: str
    company_key: str
    execution_mode: str


def _resolve_execution_mode(run_row: dict[str, Any]) -> str:
    for key in ("execution_mode", "mode"):
        value = str(run_row.get(key) or "").strip()
        if value:
            if not is_supported_execution_mode(value):
                raise ValueError(f"지원하지 않는 execution_mode 입니다: {value}")
            return value
    return "integrated_full"


def _resolve_company_key(run_row: dict[str, Any]) -> str:
    value = str(run_row.get("company_key") or "").strip()
    if value:
        return value
    raise ValueError("run row에 company_key가 없습니다.")


def _resolve_run_key(run_row: dict[str, Any], run_db_id: str) -> str:
    value = str(run_row.get("run_key") or run_row.get("id") or "").strip()
    if value:
        return value
    return run_db_id


def build_execution_payload(run_row: dict[str, Any], run_db_id: str) -> RunExecutionPayload:
    return RunExecutionPayload(
        run_key=_resolve_run_key(run_row, run_db_id),
        company_key=_resolve_company_key(run_row),
        execution_mode=_resolve_execution_mode(run_row),
    )


def execute_pipeline_run(*, project_root: Path, payload: RunExecutionPayload) -> dict[str, Any]:
    previous_company_key = os.environ.get("COMPANY_KEY")
    os.environ["COMPANY_KEY"] = payload.company_key
    try:
        context = build_execution_context(
            project_root=project_root,
            company_key=payload.company_key,
            company_name=get_active_company_name(payload.company_key),
        )
        result = run_execution_mode(
            context=context,
            execution_mode=payload.execution_mode,
        )
        return {
            "run_id": payload.run_key,
            "execution_mode": result.execution_mode,
            "overall_status": result.overall_status,
            "overall_score": result.overall_score,
            "summary_by_module": result.summary_by_module,
            "steps": [step.to_dict() for step in result.steps],
            "total_duration_ms": result.total_duration_ms,
        }
    finally:
        if previous_company_key is None:
            os.environ.pop("COMPANY_KEY", None)
        else:
            os.environ["COMPANY_KEY"] = previous_company_key
