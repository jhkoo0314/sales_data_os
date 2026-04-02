from __future__ import annotations

import json
import shutil
from pathlib import Path
from uuid import uuid4

import pandas as pd

from modules.crm.service import build_crm_result_asset
from modules.prescription.service import build_prescription_result_asset
from modules.radar.service import build_radar_result_asset
from modules.sandbox.service import build_sandbox_result_asset
from modules.territory.service import build_territory_result_asset


def _make_company(prefix: str) -> str:
    company_key = f"{prefix}_{uuid4().hex[:8]}"
    return company_key


def _standardized_root(company_key: str, module_name: str) -> Path:
    return Path("data") / "standardized" / company_key / module_name


def _result_asset_root(company_key: str, module_name: str) -> Path:
    return Path("data") / "result_assets" / company_key / module_name


def _cleanup(company_key: str) -> None:
    shutil.rmtree(Path("data") / "standardized" / company_key, ignore_errors=True)
    shutil.rmtree(Path("data") / "result_assets" / company_key, ignore_errors=True)


def test_build_crm_result_asset_creates_json() -> None:
    company_key = _make_company("phase6_crm")
    try:
        crm_root = _standardized_root(company_key, "crm")
        crm_root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "activity_date": ["2025-01-03", "2025-01-04", "2025-02-01"],
                "metric_month": ["202501", "202501", "202502"],
                "rep_id": ["R001", "R001", "R002"],
                "rep_name": ["김영업", "김영업", "박영업"],
                "account_name": ["서울병원", "강남병원", "부산병원"],
                "activity_type": ["PT", "Contact", "Demo"],
                "channel": ["대면", "전화", "대면"],
                "product_mentions": ["A제품", "", "B제품"],
            }
        ).to_excel(crm_root / "ops_crm_activity.xlsx", index=False)
        pd.DataFrame(
            {
                "account_id": ["H001", "H002", "H003"],
                "account_name": ["서울병원", "강남병원", "부산병원"],
                "rep_id": ["R001", "R001", "R002"],
                "rep_name": ["김영업", "김영업", "박영업"],
            }
        ).to_excel(crm_root / "ops_hospital_master.xlsx", index=False)
        pd.DataFrame(
            {
                "rep_id": ["R001", "R002"],
                "rep_name": ["김영업", "박영업"],
                "branch_name": ["서울지점", "부산지점"],
            }
        ).to_excel(crm_root / "ops_company_master.xlsx", index=False)

        result = build_crm_result_asset(company_key)
        target_path = _result_asset_root(company_key, "crm") / "crm_result_asset.json"

        assert target_path.exists()
        assert result["asset_type"] == "crm_result_asset"
        assert result["activity_context"]["row_count"] == 3
        assert len(result["rep_monthly_kpi_11"]) == 2
        assert result["mapping_quality"]["rep_id_fill_rate"] == 100.0

        saved = json.loads(target_path.read_text(encoding="utf-8"))
        assert saved["metric_version"] == "crm_kpi_engine_v1"
    finally:
        _cleanup(company_key)


def test_build_sandbox_result_asset_creates_json() -> None:
    company_key = _make_company("phase6_sandbox")
    try:
        sandbox_root = _standardized_root(company_key, "sandbox")
        sandbox_root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "metric_month": ["202501", "202501", "202502"],
                "account_id": ["A001", "A002", "A001"],
                "account_name": ["서울병원", "강남병원", "서울병원"],
                "brand_name": ["A제품", "A제품", "A제품"],
                "sales_amount": [100, 200, 300],
                "sales_qty": [1, 2, 3],
            }
        ).to_excel(sandbox_root / "ops_sales_records.xlsx", index=False)
        pd.DataFrame(
            {
                "metric_month": ["202501", "202502"],
                "account_id": ["A001", "A001"],
                "account_name": ["서울병원", "서울병원"],
                "brand_name": ["A제품", "A제품"],
                "target_amount": [250, 400],
            }
        ).to_excel(sandbox_root / "ops_target_records.xlsx", index=False)

        result = build_sandbox_result_asset(company_key)
        target_path = _result_asset_root(company_key, "sandbox") / "sandbox_result_asset.json"

        assert target_path.exists()
        assert result["asset_type"] == "sandbox_result_asset"
        assert result["official_kpi_6"]["reference_month"] == "202502"
        assert result["official_kpi_6"]["monthly_sales"] == 300.0
        assert result["analysis_summary"]["sales_row_count"] == 3
        assert result["join_quality"]["shared_metric_month_count"] == 2
        assert result["hospital_records_sample"]

        saved = json.loads(target_path.read_text(encoding="utf-8"))
        assert saved["metric_version"] == "sandbox_kpi_engine_v1"
    finally:
        _cleanup(company_key)


def test_build_prescription_result_asset_creates_json() -> None:
    company_key = _make_company("phase6_prescription")
    try:
        root = _standardized_root(company_key, "prescription")
        root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "ship_date": ["2025-01-03", "2025-01-04", "2025-02-01"],
                "metric_month": ["202501", "202501", "202502"],
                "pharmacy_name": ["가온약국", "가온약국", "나눔약국"],
                "brand_name": ["A제품", "B제품", "A제품"],
                "quantity": [10, 20, 15],
                "amount": [1000, 2000, 1800],
            }
        ).to_excel(root / "ops_prescription_standard.xlsx", index=False)

        result = build_prescription_result_asset(company_key)
        target_path = _result_asset_root(company_key, "prescription") / "prescription_result_asset.json"

        assert target_path.exists()
        assert result["asset_type"] == "prescription_result_asset"
        assert result["lineage_summary"]["row_count"] == 3
        assert len(result["flow_series"]) == 3
        assert result["reconciliation_summary"]["total_amount"] == 4800.0
    finally:
        _cleanup(company_key)


def test_build_territory_result_asset_creates_json() -> None:
    company_key = _make_company("phase6_territory")
    try:
        root = _standardized_root(company_key, "territory")
        root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "metric_month": ["202501", "202501", "202502"],
                "rep_id": ["R001", "R001", "R002"],
                "rep_name": ["김영업", "김영업", "박영업"],
                "account_name": ["서울병원", "강남병원", "부산병원"],
                "activity_type": ["PT", "Contact", "Demo"],
                "latitude": ["37.5", "", "35.1"],
                "longitude": ["127.0", "", "129.0"],
            }
        ).to_excel(root / "ops_territory_activity.xlsx", index=False)

        result = build_territory_result_asset(company_key)
        target_path = _result_asset_root(company_key, "territory") / "territory_result_asset.json"

        assert target_path.exists()
        assert result["asset_type"] == "territory_result_asset"
        assert result["coverage_summary"]["rep_count"] == 2
        assert result["optimization_summary"]["coordinate_missing_count"] == 1
        assert result["gaps"]
    finally:
        _cleanup(company_key)


def test_build_radar_result_asset_creates_json() -> None:
    company_key = _make_company("phase6_radar")
    try:
        crm_root = _standardized_root(company_key, "crm")
        sandbox_root = _standardized_root(company_key, "sandbox")
        prescription_root = _standardized_root(company_key, "prescription")
        territory_root = _standardized_root(company_key, "territory")
        crm_root.mkdir(parents=True, exist_ok=True)
        sandbox_root.mkdir(parents=True, exist_ok=True)
        prescription_root.mkdir(parents=True, exist_ok=True)
        territory_root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "activity_date": ["2025-01-03", "2025-02-01"],
                "metric_month": ["202501", "202502"],
                "rep_id": ["R001", "R002"],
                "rep_name": ["김영업", "박영업"],
                "account_name": ["서울병원", "부산병원"],
                "activity_type": ["PT", "Contact"],
                "channel": ["대면", "전화"],
                "product_mentions": ["A제품", ""],
            }
        ).to_excel(crm_root / "ops_crm_activity.xlsx", index=False)
        pd.DataFrame(
            {
                "account_id": ["H001", "H002"],
                "account_name": ["서울병원", "부산병원"],
                "rep_id": ["R001", "R002"],
                "rep_name": ["김영업", "박영업"],
            }
        ).to_excel(crm_root / "ops_hospital_master.xlsx", index=False)
        pd.DataFrame({"rep_id": ["R001", "R002"], "rep_name": ["김영업", "박영업"]}).to_excel(
            crm_root / "ops_company_master.xlsx", index=False
        )

        pd.DataFrame(
            {
                "metric_month": ["202501", "202502"],
                "account_id": ["A001", "A001"],
                "account_name": ["서울병원", "서울병원"],
                "brand_name": ["A제품", "A제품"],
                "sales_amount": [100, 80],
                "sales_qty": [1, 1],
            }
        ).to_excel(sandbox_root / "ops_sales_records.xlsx", index=False)
        pd.DataFrame(
            {
                "metric_month": ["202501", "202502"],
                "account_id": ["A001", "A001"],
                "account_name": ["서울병원", "서울병원"],
                "brand_name": ["A제품", "A제품"],
                "target_amount": [100, 100],
            }
        ).to_excel(sandbox_root / "ops_target_records.xlsx", index=False)

        pd.DataFrame(
            {
                "ship_date": ["2025-01-03", "2025-02-01"],
                "metric_month": ["202501", "202502"],
                "pharmacy_name": ["가온약국", "나눔약국"],
                "brand_name": ["A제품", "A제품"],
                "quantity": [10, 15],
                "amount": [1000, 1500],
            }
        ).to_excel(prescription_root / "ops_prescription_standard.xlsx", index=False)

        pd.DataFrame(
            {
                "metric_month": ["202501", "202502"],
                "rep_id": ["R001", "R002"],
                "rep_name": ["김영업", "박영업"],
                "account_name": ["서울병원", "부산병원"],
                "activity_type": ["PT", "Contact"],
                "latitude": ["37.5", ""],
                "longitude": ["127.0", ""],
            }
        ).to_excel(territory_root / "ops_territory_activity.xlsx", index=False)

        build_crm_result_asset(company_key)
        build_sandbox_result_asset(company_key)
        build_prescription_result_asset(company_key)
        build_territory_result_asset(company_key)
        result = build_radar_result_asset(company_key)

        target_path = _result_asset_root(company_key, "radar") / "radar_result_asset.json"
        assert target_path.exists()
        assert result["asset_type"] == "radar_result_asset"
        assert result["summary"]["signal_count"] == 4
        assert result["signals"]
        assert "sandbox_summary" in result
    finally:
        _cleanup(company_key)
