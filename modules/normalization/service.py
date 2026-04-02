from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

from modules.intake.fixers import normalize_month_value
from modules.intake.staging import get_staging_root, stage_company_sources


def _write_excel(frame: pd.DataFrame, target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_excel(target_path, index=False)


def _write_json(payload: dict[str, Any], target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _standardized_root(company_key: str, module_name: str) -> Path:
    return Path("data") / "standardized" / company_key / module_name


def normalize_crm_sources(company_key: str) -> dict[str, Any]:
    staging_root = get_staging_root(company_key)
    if not staging_root.exists():
        stage_company_sources(company_key)

    crm_activity = pd.read_excel(staging_root / "crm" / "crm_activity_raw.xlsx", dtype=str)
    crm_rep_master = pd.read_excel(staging_root / "crm" / "crm_rep_master.xlsx", dtype=str)
    crm_assignment = pd.read_excel(staging_root / "crm" / "crm_account_assignment.xlsx", dtype=str)
    account_master = pd.read_excel(staging_root / "company" / "account_master.xlsx", dtype=str)

    crm_activity_standard = pd.DataFrame(
        {
            "activity_date": crm_activity.get("실행일"),
            "metric_month": crm_activity.get("metric_month", crm_activity.get("실행일").map(normalize_month_value)),
            "rep_id": crm_activity.get("영업사원코드"),
            "rep_name": crm_activity.get("영업사원명"),
            "account_name": crm_activity.get("방문기관"),
            "activity_type": crm_activity.get("액션유형"),
            "channel": crm_activity.get("접점채널"),
            "product_mentions": crm_activity.get("언급브랜드"),
        }
    )

    hospital_master = pd.DataFrame(
        {
            "account_id": account_master.get("account_id", crm_assignment.get("account_id")),
            "account_name": account_master.get("account_name", crm_assignment.get("account_name")),
            "branch_id": account_master.get("branch_id", crm_assignment.get("branch_id")),
            "branch_name": account_master.get("branch_name", crm_assignment.get("branch_name")),
            "rep_id": account_master.get("rep_id", crm_assignment.get("rep_id")),
            "rep_name": account_master.get("rep_name", crm_assignment.get("rep_name")),
        }
    ).drop_duplicates()

    company_master = pd.DataFrame(
        {
            "rep_id": crm_rep_master.get("rep_id"),
            "rep_name": crm_rep_master.get("rep_name"),
            "branch_id": crm_rep_master.get("branch_id"),
            "branch_name": crm_rep_master.get("branch_name"),
            "rep_role": crm_rep_master.get("rep_role"),
        }
    ).drop_duplicates()

    root = _standardized_root(company_key, "crm")
    _write_excel(crm_activity_standard, root / "ops_crm_activity.xlsx")
    _write_excel(hospital_master, root / "ops_hospital_master.xlsx")
    _write_excel(company_master, root / "ops_company_master.xlsx")
    report = {
        "company_key": company_key,
        "module": "crm",
        "outputs": [
            "ops_crm_activity.xlsx",
            "ops_hospital_master.xlsx",
            "ops_company_master.xlsx",
        ],
        "row_counts": {
            "ops_crm_activity": len(crm_activity_standard),
            "ops_hospital_master": len(hospital_master),
            "ops_company_master": len(company_master),
        },
    }
    _write_json(report, root / "normalization_report.json")
    return report


def normalize_sandbox_sources(company_key: str) -> dict[str, Any]:
    staging_root = get_staging_root(company_key)
    if not staging_root.exists():
        stage_company_sources(company_key)

    sales = pd.read_excel(staging_root / "sales" / "sales_raw.xlsx", dtype=str)
    target = pd.read_excel(staging_root / "sales" / "target_raw.xlsx", dtype=str)

    sales_records = pd.DataFrame(
        {
            "metric_month": sales.get("기준년월"),
            "account_id": sales.get("거래처코드"),
            "account_name": sales.get("거래처명"),
            "brand_name": sales.get("브랜드명"),
            "sales_amount": sales.get("매출금액"),
            "sales_qty": sales.get("매출수량"),
        }
    )
    target_records = pd.DataFrame(
        {
            "metric_month": target.get("기준년월"),
            "account_id": target.get("거래처코드"),
            "account_name": target.get("거래처명"),
            "brand_name": target.get("브랜드명"),
            "target_amount": target.get("목표금액", target.get("계획금액")),
        }
    )

    root = _standardized_root(company_key, "sandbox")
    _write_excel(sales_records, root / "ops_sales_records.xlsx")
    _write_excel(target_records, root / "ops_target_records.xlsx")
    report = {
        "company_key": company_key,
        "module": "sandbox",
        "outputs": ["ops_sales_records.xlsx", "ops_target_records.xlsx"],
        "row_counts": {
            "ops_sales_records": len(sales_records),
            "ops_target_records": len(target_records),
        },
    }
    _write_json(report, root / "normalization_report.json")
    return report


def normalize_prescription_sources(company_key: str) -> dict[str, Any]:
    staging_root = get_staging_root(company_key)
    if not staging_root.exists():
        stage_company_sources(company_key)

    prescription = pd.read_csv(staging_root / "prescription" / "prescription_raw.csv", dtype=str, encoding="utf-8-sig")
    standardized = pd.DataFrame(
        {
            "ship_date": prescription.get("ship_date (출고일)"),
            "metric_month": prescription.get("metric_month"),
            "pharmacy_name": prescription.get("pharmacy_name (약국명)"),
            "brand_name": prescription.get("brand (브랜드)"),
            "quantity": prescription.get("qty (수량)"),
            "amount": prescription.get("공급가액", prescription.get("amount_ship (출고금액)")),
        }
    )
    root = _standardized_root(company_key, "prescription")
    _write_excel(standardized, root / "ops_prescription_standard.xlsx")
    report = {
        "company_key": company_key,
        "module": "prescription",
        "outputs": ["ops_prescription_standard.xlsx"],
        "row_counts": {"ops_prescription_standard": len(standardized)},
    }
    _write_json(report, root / "normalization_report.json")
    return report


def normalize_territory_sources(company_key: str) -> dict[str, Any]:
    staging_root = get_staging_root(company_key)
    if not staging_root.exists():
        stage_company_sources(company_key)

    crm_activity = pd.read_excel(staging_root / "crm" / "crm_activity_raw.xlsx", dtype=str)
    territory = pd.DataFrame(
        {
            "metric_month": crm_activity.get("metric_month"),
            "rep_id": crm_activity.get("영업사원코드"),
            "rep_name": crm_activity.get("영업사원명"),
            "account_name": crm_activity.get("방문기관"),
            "activity_type": crm_activity.get("액션유형"),
            "latitude": crm_activity.get("기관위도"),
            "longitude": crm_activity.get("기관경도"),
        }
    )
    root = _standardized_root(company_key, "territory")
    _write_excel(territory, root / "ops_territory_activity.xlsx")
    report = {
        "company_key": company_key,
        "module": "territory",
        "outputs": ["ops_territory_activity.xlsx"],
        "row_counts": {"ops_territory_activity": len(territory)},
    }
    _write_json(report, root / "normalization_report.json")
    return report


def normalize_all_sources(company_key: str) -> dict[str, Any]:
    stage_result = stage_company_sources(company_key)
    return {
        "company_key": company_key,
        "stage_result": stage_result,
        "modules": {
            "crm": normalize_crm_sources(company_key),
            "sandbox": normalize_sandbox_sources(company_key),
            "prescription": normalize_prescription_sources(company_key),
            "territory": normalize_territory_sources(company_key),
        },
    }
