from __future__ import annotations

import argparse
import socket
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.services.run_executor import build_execution_payload, execute_pipeline_run
from workers.services.status_updater import RunStatusUpdater, WorkerStorageConfig


def _build_worker_name() -> str:
    host = socket.gethostname().strip() or "unknown-host"
    return f"phase10-worker@{host}"


def _run_loop(*, poll_interval_seconds: int, once: bool, fetch_limit: int) -> None:
    project_root = ROOT
    storage = WorkerStorageConfig()
    updater = RunStatusUpdater(storage)
    if not updater.enabled:
        print("Supabase가 아직 설정되지 않아 worker polling을 시작하지 않습니다.")
        print("준비 후 다시 실행: python workers/run_worker.py --once")
        return
    worker_name = _build_worker_name()

    while True:
        pending_rows = updater.fetch_pending_runs(limit=max(1, fetch_limit))
        if not pending_rows:
            if once:
                print("No pending runs.")
                return
            time.sleep(max(1, poll_interval_seconds))
            continue

        for row in pending_rows:
            run_db_id = str(row.get("id") or "").strip()
            if not run_db_id:
                continue

            try:
                payload = build_execution_payload(row, run_db_id)
                claimed = updater.mark_running(run_db_id=run_db_id, worker_name=worker_name)
                if not claimed:
                    print(f"[skip] db_id={run_db_id} reason=already claimed")
                    continue
                result = execute_pipeline_run(project_root=project_root, payload=payload)
                updater.replace_step_rows(run_db_id=run_db_id, steps=result.get("steps") or [])
                updater.mark_completed(run_db_id=run_db_id, result=result)
                print(f"[completed] run_id={payload.run_key} db_id={run_db_id}")
            except Exception as exc:
                updater.mark_failed(run_db_id=run_db_id, error_message=str(exc))
                print(f"[failed] db_id={run_db_id} reason={exc}")

        if once:
            return


def main() -> None:
    parser = argparse.ArgumentParser(description="Sales Data OS Phase 10 polling worker")
    parser.add_argument("--once", action="store_true", help="pending run을 한 번만 조회해 처리")
    parser.add_argument("--poll-interval", type=int, default=8, help="pending run 조회 간격(초)")
    parser.add_argument("--fetch-limit", type=int, default=1, help="한 번에 가져올 pending run 개수")
    args = parser.parse_args()

    _run_loop(
        poll_interval_seconds=args.poll_interval,
        once=args.once,
        fetch_limit=args.fetch_limit,
    )


if __name__ == "__main__":
    main()
