from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_company_onboarding_registry(onboarding_root: Path) -> dict[str, Any]:
    registry_path = onboarding_root / "company_onboarding_registry.json"
    if not registry_path.exists():
        return {"source_mappings": {}, "updated_at": None}
    return json.loads(registry_path.read_text(encoding="utf-8"))


def save_company_onboarding_registry(onboarding_root: Path, payload: dict[str, Any]) -> None:
    onboarding_root.mkdir(parents=True, exist_ok=True)
    registry_path = onboarding_root / "company_onboarding_registry.json"
    registry_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
