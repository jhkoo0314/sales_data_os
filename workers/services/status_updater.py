from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from common.supabase_client import get_supabase_client


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class WorkerStorageConfig:
    queue_table: str = "pipeline_runs"
    queue_status_field: str = "run_status"
    step_table: str = "pipeline_run_steps"


class RunStatusUpdater:
    def __init__(self, config: WorkerStorageConfig) -> None:
        self.config = config
        self.client = get_supabase_client(use_service_role=True)
        self.enabled = self.client is not None

    def fetch_pending_runs(self, limit: int = 1) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        response = (
            self.client.table(self.config.queue_table)
            .select("*")
            .eq(self.config.queue_status_field, "pending")
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )
        return list(getattr(response, "data", None) or [])

    def mark_running(self, *, run_db_id: str, worker_name: str) -> None:
        if not self.enabled:
            return
        payload = {
            self.config.queue_status_field: "running",
            "started_at": _now_iso(),
            "worker_name": worker_name,
            "updated_at": _now_iso(),
        }
        (
            self.client.table(self.config.queue_table)
            .update(payload)
            .eq("id", run_db_id)
            .execute()
        )

    def mark_completed(self, *, run_db_id: str, result: dict[str, Any]) -> None:
        if not self.enabled:
            return
        payload = {
            self.config.queue_status_field: "completed",
            "finished_at": _now_iso(),
            "updated_at": _now_iso(),
            "overall_status": str(result.get("overall_status") or "").lower(),
            "overall_score": float(result.get("overall_score") or 0.0),
            "execution_mode": str(result.get("execution_mode") or ""),
            "result_summary": {
                "total_duration_ms": int(result.get("total_duration_ms") or 0),
                "summary_by_module": result.get("summary_by_module") or {},
            },
        }
        (
            self.client.table(self.config.queue_table)
            .update(payload)
            .eq("id", run_db_id)
            .execute()
        )

    def mark_failed(self, *, run_db_id: str, error_message: str) -> None:
        if not self.enabled:
            return
        payload = {
            self.config.queue_status_field: "failed",
            "finished_at": _now_iso(),
            "updated_at": _now_iso(),
            "error_message": error_message[:4000],
        }
        (
            self.client.table(self.config.queue_table)
            .update(payload)
            .eq("id", run_db_id)
            .execute()
        )

    def replace_step_rows(self, *, run_db_id: str, steps: list[dict[str, Any]]) -> None:
        if not self.enabled:
            return
        try:
            self.client.table(self.config.step_table).delete().eq("run_id", run_db_id).execute()
        except Exception:
            # step table이 아직 없을 수 있으므로 worker 실행을 막지 않는다.
            return

        rows: list[dict[str, Any]] = []
        for step in steps:
            status = str(step.get("status") or "").upper()
            rows.append(
                {
                    "run_id": run_db_id,
                    "step_name": str(step.get("module") or ""),
                    "step_order": int(step.get("step") or 0),
                    "step_status": {
                        "PASS": "success",
                        "WARN": "partial",
                        "FAIL": "failed",
                        "SKIP": "skipped",
                    }.get(status, "success"),
                    "quality_status": {
                        "PASS": "pass",
                        "WARN": "warn",
                        "FAIL": "fail",
                    }.get(status),
                    "output_summary": step.get("summary") or {},
                    "duration_ms": int(step.get("duration_ms") or 0),
                    "finished_at": _now_iso(),
                }
            )
        if not rows:
            return
        try:
            self.client.table(self.config.step_table).insert(rows).execute()
        except Exception:
            # step table 스키마가 준비되지 않았어도 main run 상태는 기록되게 둔다.
            return
