from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from common.company_onboarding_registry import (
    load_company_onboarding_registry,
    save_company_onboarding_registry,
)
from modules.intake.fixers import build_period_coverage, clean_dataframe_headers, clean_string_cells, drop_duplicate_rows
from modules.intake.merge import merge_monthly_raw_sources
from modules.intake.rules import EXECUTION_SCENARIOS, SOURCE_RULES, get_company_root, get_onboarding_root
from modules.intake.suggestions import find_candidate_headers, find_exact_header


def _load_frame(file_path: Path) -> pd.DataFrame:
    if file_path.suffix.lower() == ".csv":
        return pd.read_csv(file_path, dtype=str, encoding="utf-8-sig")
    return pd.read_excel(file_path, dtype=str)


def _resolve_source_file(company_key: str, source_key: str) -> Path | None:
    company_root = get_company_root(company_key)
    for relative_path in SOURCE_RULES[source_key].path_candidates:
        candidate = company_root / relative_path
        if candidate.exists():
            return candidate
    return None


def _package_for_source(company_key: str, source_key: str, required: bool) -> dict[str, Any]:
    rule = SOURCE_RULES[source_key]
    source_file = _resolve_source_file(company_key, source_key)
    onboarding_root = get_onboarding_root(company_key)
    registry = load_company_onboarding_registry(onboarding_root)
    saved_mapping = registry.get("source_mappings", {}).get(source_key, {})
    package: dict[str, Any] = {
        "source_key": source_key,
        "label": rule.label,
        "required": required,
        "status": "missing" if not required else "blocked",
        "file_path": None,
        "row_count": 0,
        "headers": [],
        "resolved_mappings": {},
        "missing_required_fields": [],
        "candidate_fields": {},
        "findings": [],
        "fixes": [],
        "suggestions": [],
        "period_coverage": None,
    }
    if source_file is None:
        if required:
            package["findings"].append(f"{rule.label} 파일이 없어 진행할 수 없습니다.")
        return package

    frame = _load_frame(source_file)
    frame, header_fixes = clean_dataframe_headers(frame)
    frame, string_fixes = clean_string_cells(frame)
    frame, row_fixes = drop_duplicate_rows(frame)
    package["file_path"] = source_file.as_posix()
    package["row_count"] = int(len(frame))
    package["headers"] = frame.columns.tolist()
    package["fixes"].extend(header_fixes + string_fixes + row_fixes)

    hard_missing: list[str] = []
    for field_name in rule.required_fields:
        saved_header = saved_mapping.get(field_name)
        if saved_header and saved_header in package["headers"]:
            package["resolved_mappings"][field_name] = saved_header
            package["fixes"].append(f"저장된 매핑을 재사용했습니다: {field_name} -> {saved_header}")
            continue
        aliases = rule.aliases.get(field_name, (field_name,))
        exact = find_exact_header(package["headers"], aliases)
        if exact:
            package["resolved_mappings"][field_name] = exact
            continue

        candidates = find_candidate_headers(package["headers"], aliases)
        if len(candidates) == 1:
            package["resolved_mappings"][field_name] = candidates[0]
            package["candidate_fields"][field_name] = candidates
            package["fixes"].append(f"{field_name} 의미를 {candidates[0]} 컬럼으로 자동 연결했습니다.")
            continue

        if len(candidates) > 1:
            package["candidate_fields"][field_name] = candidates
            package["resolved_mappings"][field_name] = candidates[0]
            package["suggestions"].append(f"{field_name} 후보가 여러 개여서 확인이 필요합니다.")
            continue

        package["findings"].append(f"{field_name} 의미 컬럼을 찾지 못했습니다.")
        hard_missing.append(field_name)

    package["missing_required_fields"] = hard_missing

    period_field = rule.period_field
    mapped_period_column = package["resolved_mappings"].get(period_field) if period_field else None
    if mapped_period_column:
        period_coverage = build_period_coverage(frame, mapped_period_column)
        if period_coverage:
            package["period_coverage"] = {
                "source_key": source_key,
                "basis_field": period_field,
                **period_coverage,
            }

    if required and hard_missing:
        package["status"] = "needs_review"
    elif package["fixes"]:
        package["status"] = "ready_with_fixes"
    else:
        package["status"] = "ready"
    return package


def _build_analysis_summary(period_coverages: list[dict[str, Any]]) -> dict[str, Any]:
    if not period_coverages:
        return {
            "analysis_basis_sources": [],
            "analysis_start_month": None,
            "analysis_end_month": None,
            "analysis_month_count": None,
            "analysis_summary_message": "기간 정보를 계산할 수 있는 입력이 아직 부족합니다.",
            "proceed_confirmation_message": None,
            "timing_alerts": [],
        }

    start_month = max(item["start_month"] for item in period_coverages)
    end_month = min(item["end_month"] for item in period_coverages)
    if start_month > end_month:
        return {
            "analysis_basis_sources": [item["source_key"] for item in period_coverages],
            "analysis_start_month": None,
            "analysis_end_month": None,
            "analysis_month_count": None,
            "analysis_summary_message": "입력 데이터의 기간이 서로 겹치지 않아 공통 분석 구간을 계산하지 못했습니다.",
            "proceed_confirmation_message": "기간 차이가 큰 입력이 있어 확인이 필요합니다.",
            "timing_alerts": ["source별 기간이 서로 겹치지 않습니다."],
        }

    month_count = (
        (int(end_month[:4]) - int(start_month[:4])) * 12
        + (int(end_month[4:]) - int(start_month[4:]))
        + 1
    )
    min_start = min(item["start_month"] for item in period_coverages)
    max_end = max(item["end_month"] for item in period_coverages)
    has_gap = min_start != start_month or max_end != end_month
    return {
        "analysis_basis_sources": [item["source_key"] for item in period_coverages],
        "analysis_start_month": start_month,
        "analysis_end_month": end_month,
        "analysis_month_count": month_count,
        "analysis_summary_message": (
            "일부 입력 데이터의 기간이 서로 다르지만, 공통 분석 구간 기준으로 진행 가능합니다."
            if has_gap
            else "입력 데이터의 공통 분석 구간이 확인되어 바로 다음 단계로 진행 가능합니다."
        ),
        "proceed_confirmation_message": (
            "기간 차이가 있어도 공통 분석 구간 기준으로 계속 진행할 수 있습니다." if has_gap else None
        ),
        "timing_alerts": ["source별 기간 차이가 있습니다."] if has_gap else [],
    }


def analyze_company_intake(company_key: str, execution_mode: str = "integrated_full") -> dict[str, Any]:
    merge_monthly_raw_sources(company_key)
    required_sources = set(EXECUTION_SCENARIOS.get(execution_mode, EXECUTION_SCENARIOS["integrated_full"]))
    packages = [
        _package_for_source(company_key, source_key, source_key in required_sources)
        for source_key in SOURCE_RULES
    ]
    period_coverages = [item["period_coverage"] for item in packages if item["period_coverage"]]
    summary = _build_analysis_summary(period_coverages)
    findings = [message for item in packages for message in item["findings"]]
    fixes = [message for item in packages for message in item["fixes"]]
    suggestions = [message for item in packages for message in item["suggestions"]]

    if any(item["status"] == "blocked" for item in packages):
        status = "blocked"
    elif any(item["status"] == "needs_review" for item in packages):
        status = "needs_review"
    elif fixes or summary["timing_alerts"]:
        status = "ready_with_fixes"
    else:
        status = "ready"

    result = {
        "company_key": company_key,
        "execution_mode": execution_mode,
        "status": status,
        "ready_for_adapter": status in {"ready", "ready_with_fixes"},
        **summary,
        "findings": findings,
        "fixes": fixes,
        "suggestions": suggestions,
        "period_coverages": period_coverages,
        "packages": packages,
        "analyzed_at": datetime.now().isoformat(),
    }
    _save_onboarding_outputs(company_key, result)
    return result


def _save_onboarding_outputs(company_key: str, result: dict[str, Any]) -> None:
    onboarding_root = get_onboarding_root(company_key)
    onboarding_root.mkdir(parents=True, exist_ok=True)

    latest_path = onboarding_root / "intake_result.latest.json"
    snapshot_path = onboarding_root / f"intake_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    latest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    snapshot_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    registry = load_company_onboarding_registry(onboarding_root)
    registry["updated_at"] = result["analyzed_at"]
    registry["source_mappings"] = {
        item["source_key"]: item["resolved_mappings"] for item in result["packages"] if item["resolved_mappings"]
    }
    save_company_onboarding_registry(onboarding_root, registry)

    for package in result["packages"]:
        package_path = onboarding_root / f"{package['source_key']}_onboarding_package.json"
        package_path.write_text(
            json.dumps(package, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
