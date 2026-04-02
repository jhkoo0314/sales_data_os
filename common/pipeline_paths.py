from __future__ import annotations

from pathlib import Path


def standardized_root(company_key: str, module_name: str) -> Path:
    return Path("data") / "standardized" / company_key / module_name


def result_asset_root(company_key: str, module_name: str) -> Path:
    return Path("data") / "result_assets" / company_key / module_name


def ensure_parent(path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    return path
