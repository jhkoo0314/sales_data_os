from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

from .execution_models import ExecutionContext, ExecutionRunResult, ExecutionStepResult
from .execution_registry import get_execution_mode_modules


def build_execution_context(*, project_root: Path | str, company_key: str, company_name: str) -> ExecutionContext:
    return ExecutionContext(
        project_root=str(project_root),
        company_key=company_key,
        company_name=company_name,
        source_targets={},
    )


def run_execution_mode(*, context: ExecutionContext, execution_mode: str) -> ExecutionRunResult:
    root = Path(context.project_root)
    steps: list[ExecutionStepResult] = []
    summary_by_module: dict[str, dict] = {}
    started = time.time()

    for index, module in enumerate(get_execution_mode_modules(execution_mode), start=1):
        step_started = time.time()
        summary = _run_module_step(root, module)
        status, score = _normalize_step_status(module, summary)
        step = ExecutionStepResult(
            step=index,
            module=module,
            status=status,
            score=score,
            summary=summary,
            duration_ms=int((time.time() - step_started) * 1000),
        )
        steps.append(step)
        summary_by_module[module] = summary

    statuses = [step.status for step in steps]
    if steps and all(status == "PASS" for status in statuses):
        overall_status = "PASS"
    elif any(status == "FAIL" for status in statuses):
        overall_status = "FAIL"
    else:
        overall_status = "WARN"

    overall_score = round(sum(step.score for step in steps) / len(steps), 1) if steps else 0.0
    return ExecutionRunResult(
        run_id=f"run_{uuid4().hex[:8]}",
        execution_mode=execution_mode,
        execution_mode_label="통합 실행",
        company_key=context.company_key,
        company_name=context.company_name,
        overall_status=overall_status,
        overall_score=overall_score,
        total_duration_ms=int((time.time() - started) * 1000),
        steps=steps,
        summary_by_module=summary_by_module,
    )


def _normalize_step_status(module: str, summary: dict) -> tuple[str, float]:
    raw_status = str(summary.get("quality_status") or summary.get("overall_status") or "").upper()
    raw_score = summary.get("quality_score") or summary.get("overall_score")

    if module == "builder":
        built_report_count = int(summary.get("built_report_count") or 0)
        has_total_valid = bool((summary.get("total_valid") or {}).get("html"))
        if built_report_count > 0 or has_total_valid:
            score = float(raw_score or 100.0)
            return "PASS", score
        return "FAIL", 0.0

    if raw_status == "APPROVED":
        return "PASS", float(raw_score or 100.0)
    if raw_status == "USABLE":
        return "WARN", float(raw_score or 70.0)
    if raw_status == "REJECTED":
        return "FAIL", float(raw_score or 0.0)

    status = raw_status or "FAIL"
    score = float(raw_score or 0.0)
    return status, score


def _run_module_step(root: Path, module: str) -> dict:
    script_map = {
        "crm": "validate_crm_with_ops.py",
        "prescription": "validate_prescription_with_ops.py",
        "sandbox": "validate_sandbox_with_ops.py",
        "territory": "validate_territory_with_ops.py",
        "radar": "validate_radar_with_ops.py",
        "builder": "validate_builder_with_ops.py",
    }
    summary_map = {
        "crm": root / "data" / "ops_validation",
        "prescription": root / "data" / "ops_validation",
        "sandbox": root / "data" / "ops_validation",
        "territory": root / "data" / "ops_validation",
        "radar": root / "data" / "ops_validation",
        "builder": root / "data" / "ops_validation",
    }
    script_name = script_map[module]
    command = [sys.executable, str(root / "scripts" / script_name)]
    result = subprocess.run(command, cwd=root, capture_output=True, text=True)
    if result.returncode != 0:
        return {
            "quality_status": "fail",
            "quality_score": 0.0,
            "reasoning_note": result.stderr.strip() or result.stdout.strip() or f"{module} 실행 실패",
        }

    company_key = _extract_company_key(root)
    summary_path = summary_map[module] / company_key / module / f"{module}_validation_summary.json"
    if module == "builder":
        summary_path = summary_map[module] / company_key / "builder" / "builder_validation_summary.json"
    if summary_path.exists():
        return json.loads(summary_path.read_text(encoding="utf-8"))
    return {"quality_status": "pass", "quality_score": 100.0, "reasoning_note": f"{module} 실행 완료"}


def _extract_company_key(root: Path) -> str:
    env_value = None
    try:
        from common.company_runtime import get_active_company_key

        env_value = get_active_company_key()
    except Exception:
        env_value = None
    return str(env_value or "daon_pharma")
