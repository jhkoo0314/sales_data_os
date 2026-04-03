from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workers.services.status_updater import RunStatusUpdater, WorkerStorageConfig


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table_name: str, client: "FakeSupabaseClient"):
        self.table_name = table_name
        self.client = client

    def update(self, payload):
        self.client.last_update_payload = payload
        return self

    def eq(self, key, value):
        self.client.filters.append((key, value))
        return self

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        return FakeResponse(self.client.next_update_rows)


class FakeSupabaseClient:
    def __init__(self, next_update_rows):
        self.next_update_rows = next_update_rows
        self.last_update_payload = None
        self.filters: list[tuple[str, str]] = []

    def table(self, table_name):
        return FakeQuery(table_name, self)


def test_mark_running_returns_true_when_claimed(monkeypatch):
    fake_client = FakeSupabaseClient(next_update_rows=[{"id": "row-1"}])
    monkeypatch.setattr(
        "workers.services.status_updater.get_supabase_client",
        lambda use_service_role=True: fake_client,
    )
    updater = RunStatusUpdater(WorkerStorageConfig())

    claimed = updater.mark_running(run_db_id="row-1", worker_name="worker-a")

    assert claimed is True
    assert ("id", "row-1") in fake_client.filters
    assert ("run_status", "pending") in fake_client.filters
    assert fake_client.last_update_payload["run_status"] == "running"


def test_mark_running_returns_false_when_already_claimed(monkeypatch):
    fake_client = FakeSupabaseClient(next_update_rows=[])
    monkeypatch.setattr(
        "workers.services.status_updater.get_supabase_client",
        lambda use_service_role=True: fake_client,
    )
    updater = RunStatusUpdater(WorkerStorageConfig())

    claimed = updater.mark_running(run_db_id="row-2", worker_name="worker-b")

    assert claimed is False
