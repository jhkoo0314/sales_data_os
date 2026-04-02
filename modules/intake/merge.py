from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from modules.intake.rules import get_company_root

MONTHLY_SOURCE_SPECS: dict[str, dict[str, str]] = {
    "crm_activity": {"folder": "crm", "base_name": "crm_activity_raw", "extension": ".xlsx"},
    "sales": {"folder": "sales", "base_name": "sales_raw", "extension": ".xlsx"},
    "target": {"folder": "sales", "base_name": "target_raw", "extension": ".xlsx"},
    "prescription": {"folder": "prescription", "base_name": "prescription_raw", "extension": ".csv"},
}


def get_monthly_raw_root(company_key: str) -> Path:
    return get_company_root(company_key) / "monthly_raw"


def _month_dirs(monthly_root: Path) -> list[Path]:
    if not monthly_root.exists():
        return []
    pattern = re.compile(r"^\d{6}$")
    return sorted(
        [item for item in monthly_root.iterdir() if item.is_dir() and pattern.match(item.name)],
        key=lambda item: item.name,
    )


def _pick_monthly_file(month_dir: Path, base_name: str, extension: str) -> Path | None:
    exact = month_dir / f"{base_name}{extension}"
    if exact.exists():
        return exact
    candidates = sorted(month_dir.glob(f"{base_name}_*{extension}"))
    return candidates[0] if candidates else None


def inspect_monthly_raw(company_key: str) -> dict[str, Any]:
    monthly_root = get_monthly_raw_root(company_key)
    months = _month_dirs(monthly_root)
    per_source: dict[str, Any] = {}
    for source_key, spec in MONTHLY_SOURCE_SPECS.items():
        files: list[dict[str, str]] = []
        for month_dir in months:
            matched = _pick_monthly_file(month_dir, spec["base_name"], spec["extension"])
            if matched:
                files.append({"month": month_dir.name, "path": matched.as_posix()})
        per_source[source_key] = {
            "months_available": [item["month"] for item in files],
            "file_count": len(files),
            "files": files,
        }
    return {
        "company_key": company_key,
        "monthly_raw_root": monthly_root.as_posix(),
        "month_tokens": [item.name for item in months],
        "sources": per_source,
    }


def _read_tabular(file_path: Path) -> pd.DataFrame:
    if file_path.suffix.lower() == ".csv":
        return pd.read_csv(file_path, dtype=str, encoding="utf-8-sig")
    return pd.read_excel(file_path, dtype=str)


def _write_tabular(frame: pd.DataFrame, target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    if target_path.suffix.lower() == ".csv":
        frame.to_csv(target_path, index=False, encoding="utf-8-sig")
        return
    frame.to_excel(target_path, index=False)


def merge_monthly_raw_sources(company_key: str, prefer_existing_merged: bool = False) -> dict[str, Any]:
    inspection = inspect_monthly_raw(company_key)
    company_root = get_company_root(company_key)
    onboarding_root = company_root / "_onboarding"
    onboarding_root.mkdir(parents=True, exist_ok=True)

    merged_sources: dict[str, Any] = {}
    for source_key, spec in MONTHLY_SOURCE_SPECS.items():
        source_info = inspection["sources"][source_key]
        month_files = source_info["files"]
        target_path = company_root / spec["folder"] / f"{spec['base_name']}{spec['extension']}"

        if prefer_existing_merged and target_path.exists():
            merged_sources[source_key] = {
                "target_path": target_path.as_posix(),
                "used_existing_merged": True,
                "months_used": [],
                "input_rows": 0,
                "merged_rows": 0,
            }
            continue

        if not month_files:
            merged_sources[source_key] = {
                "target_path": target_path.as_posix(),
                "used_existing_merged": False,
                "months_used": [],
                "input_rows": 0,
                "merged_rows": 0,
            }
            continue

        frames: list[pd.DataFrame] = []
        input_rows = 0
        for item in month_files:
            frame = _read_tabular(Path(item["path"]))
            frame["source_month"] = item["month"]
            input_rows += len(frame)
            frames.append(frame)

        merged = pd.concat(frames, ignore_index=True)
        _write_tabular(merged, target_path)
        merged_sources[source_key] = {
            "target_path": target_path.as_posix(),
            "used_existing_merged": False,
            "months_used": [item["month"] for item in month_files],
            "input_rows": input_rows,
            "merged_rows": len(merged),
        }

    result = {
        "company_key": company_key,
        "merged_at": datetime.now().isoformat(),
        "monthly_raw_root": inspection["monthly_raw_root"],
        "month_tokens": inspection["month_tokens"],
        "sources": merged_sources,
    }

    latest_path = onboarding_root / "latest_monthly_merge_result.json"
    history_path = onboarding_root / f"monthly_merge_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    latest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    history_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result
