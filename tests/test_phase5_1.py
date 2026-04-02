from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

import pandas as pd

from modules.intake.fixers import clean_string_cells, drop_duplicate_rows, normalize_month_value
from modules.intake.merge import inspect_monthly_raw, merge_monthly_raw_sources
from modules.intake.service import analyze_company_intake
from modules.intake.staging import get_staging_root, stage_company_sources


DATA_ROOT = Path("data") / "company_source"


def _company_path(company_key: str) -> Path:
    return DATA_ROOT / company_key


def _make_temp_company(prefix: str = "test_company") -> str:
    company_key = f"{prefix}_{uuid4().hex[:8]}"
    _company_path(company_key).mkdir(parents=True, exist_ok=True)
    return company_key


def _cleanup_company(company_key: str) -> None:
    shutil.rmtree(_company_path(company_key), ignore_errors=True)
    shutil.rmtree(Path("data") / "standardized" / company_key, ignore_errors=True)


def test_month_and_date_normalization() -> None:
    assert normalize_month_value("2025/04/01") == "202504"
    assert normalize_month_value("2025-4") == "202504"
    assert normalize_month_value("202504") == "202504"


def test_string_cleaning_and_duplicate_row_drop() -> None:
    frame = pd.DataFrame(
        {
            "name": ["  alpha  ", "alpha", "beta"],
            "addr": ["서울  강남", "서울 강남", "  "],
        }
    )
    cleaned, string_fixes = clean_string_cells(frame)
    deduped, row_fixes = drop_duplicate_rows(cleaned)
    assert cleaned.iloc[0]["name"] == "alpha"
    assert cleaned.iloc[0]["addr"] == "서울 강남"
    assert len(deduped) == 2
    assert string_fixes
    assert row_fixes


def test_missing_required_source_blocks_intake() -> None:
    company_key = _make_temp_company("missing_case")
    try:
        result = analyze_company_intake(company_key, execution_mode="sandbox_only")
        assert result["status"] == "blocked"
        assert result["ready_for_adapter"] is False
    finally:
        _cleanup_company(company_key)


def test_missing_required_field_results_in_needs_review() -> None:
    company_key = _make_temp_company("needs_review_case")
    try:
        sales_path = _company_path(company_key) / "sales" / "sales_raw.xlsx"
        target_path = _company_path(company_key) / "sales" / "target_raw.xlsx"
        sales_path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(
            {
                "기준년월": ["202501"],
                "거래처코드": ["A001"],
                "브랜드명": ["테스트제품"],
            }
        ).to_excel(sales_path, index=False)
        pd.DataFrame(
            {
                "기준년월": ["202501"],
                "계획금액": [100],
            }
        ).to_excel(target_path, index=False)

        result = analyze_company_intake(company_key, execution_mode="sandbox_only")
        sales_package = next(item for item in result["packages"] if item["source_key"] == "sales")
        assert result["status"] == "needs_review"
        assert result["ready_for_adapter"] is False
        assert sales_package["status"] == "needs_review"
    finally:
        _cleanup_company(company_key)


def test_auto_mapping_does_not_block_intake() -> None:
    company_key = _make_temp_company("candidate_case")
    try:
        crm_path = _company_path(company_key) / "crm" / "crm_activity_raw.xlsx"
        rep_path = _company_path(company_key) / "crm" / "crm_rep_master.xlsx"
        assignment_path = _company_path(company_key) / "crm" / "crm_account_assignment.xlsx"
        crm_path.parent.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "방문일자": ["2025-01-03"],
                "영업사원명": ["김테스트"],
                "영업사원코드": ["CR001"],
                "방문기관명": ["테스트병원"],
                "방문유형": ["콜"],
                "활동유형": ["콜"],
            }
        ).to_excel(crm_path, index=False)
        pd.DataFrame({"rep_name": ["김테스트"], "branch_name": ["서울지점"]}).to_excel(rep_path, index=False)
        pd.DataFrame({"거래처코드": ["A001"], "영업사원명": ["김테스트"]}).to_excel(assignment_path, index=False)

        result = analyze_company_intake(company_key, execution_mode="crm_only")
        package = next(item for item in result["packages"] if item["source_key"] == "crm_activity")
        assert result["ready_for_adapter"] is True
        assert package["status"] in {"ready", "ready_with_fixes"}
        assert package["resolved_mappings"]["activity_date"] == "방문일자"
        assert package["resolved_mappings"]["account"] == "방문기관명"
    finally:
        _cleanup_company(company_key)


def test_candidate_suggestion_can_appear_without_blocking_intake() -> None:
    company_key = _make_temp_company("candidate_review")
    try:
        prescription_path = _company_path(company_key) / "prescription" / "prescription_raw.csv"
        prescription_path.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(
            {
                "ship_date (출고일)": ["2025-01-03"],
                "pharmacy_name (약국명)": ["테스트약국"],
                "brand_label": ["A제품"],
                "sku_name": ["A001"],
                "qty (수량)": [3],
            }
        ).to_csv(prescription_path, index=False, encoding="utf-8-sig")

        result = analyze_company_intake(company_key, execution_mode="prescription_only")
        package = next(item for item in result["packages"] if item["source_key"] == "prescription")
        assert result["ready_for_adapter"] is True
        assert package["status"] in {"ready", "ready_with_fixes"}
        assert package["suggestions"]
    finally:
        _cleanup_company(company_key)


def test_monthly_merge_structure_inspection() -> None:
    company_key = _make_temp_company("monthly_inspect")
    try:
        for month in ["202501", "202502"]:
            month_dir = _company_path(company_key) / "monthly_raw" / month
            month_dir.mkdir(parents=True, exist_ok=True)
            pd.DataFrame({"기준년월": [month], "매출금액": [100], "거래처코드": ["A"], "브랜드명": ["B"]}).to_excel(
                month_dir / "sales_raw.xlsx", index=False
            )

        inspection = inspect_monthly_raw(company_key)
        assert inspection["month_tokens"] == ["202501", "202502"]
        assert inspection["sources"]["sales"]["file_count"] == 2
    finally:
        _cleanup_company(company_key)


def test_monthly_merge_handles_partial_sources() -> None:
    company_key = _make_temp_company("monthly_partial")
    try:
        month_dir = _company_path(company_key) / "monthly_raw" / "202501"
        month_dir.mkdir(parents=True, exist_ok=True)
        pd.DataFrame({"기준년월": ["202501"], "매출금액": [100], "거래처코드": ["A"], "브랜드명": ["B"]}).to_excel(
            month_dir / "sales_raw.xlsx", index=False
        )

        result = merge_monthly_raw_sources(company_key)
        assert result["sources"]["sales"]["merged_rows"] == 1
        assert result["sources"]["target"]["merged_rows"] == 0
    finally:
        _cleanup_company(company_key)


def test_staging_generation_creates_execution_ready_files() -> None:
    company_key = _make_temp_company("staging_case")
    try:
        crm_root = _company_path(company_key) / "crm"
        sales_root = _company_path(company_key) / "sales"
        prescription_root = _company_path(company_key) / "prescription"
        crm_root.mkdir(parents=True, exist_ok=True)
        sales_root.mkdir(parents=True, exist_ok=True)
        prescription_root.mkdir(parents=True, exist_ok=True)

        pd.DataFrame(
            {
                "실행일": ["2025-01-03"],
                "담당자명": ["김테스트"],
                "병원명": ["테스트병원"],
                "액션유형": ["콜"],
            }
        ).to_excel(crm_root / "crm_activity_raw.xlsx", index=False)
        pd.DataFrame({"rep_name": ["김테스트"], "branch_name": ["서울지점"]}).to_excel(
            crm_root / "crm_rep_master.xlsx", index=False
        )
        pd.DataFrame({"rep_name": ["김테스트"], "branch_name": ["서울지점"]}).to_excel(
            crm_root / "crm_account_assignment.xlsx", index=False
        )
        pd.DataFrame(
            {
                "매출월": ["202501"],
                "병원코드": ["A001"],
                "병원명": ["테스트병원"],
                "제품명": ["테스트제품"],
                "매출금액": [100],
            }
        ).to_excel(sales_root / "sales_raw.xlsx", index=False)
        pd.DataFrame({"목표월": ["202501"], "목표금액": [300]}).to_excel(sales_root / "target_raw.xlsx", index=False)
        pd.DataFrame(
            {
                "출고일": ["2025-01-03"],
                "약국명": ["테스트약국"],
                "brand": ["A제품"],
                "출고수량": [3],
            }
        ).to_csv(prescription_root / "prescription_raw.csv", index=False, encoding="utf-8-sig")

        stage_company_sources(company_key)
        staging_root = get_staging_root(company_key)
        assert (staging_root / "crm" / "crm_activity_raw.xlsx").exists()
        assert (staging_root / "crm" / "crm_account_assignment.xlsx").exists()
        assert (staging_root / "company" / "account_master.xlsx").exists()
        assert (staging_root / "sales" / "sales_raw.xlsx").exists()
        assert (staging_root / "prescription" / "prescription_raw.csv").exists()
    finally:
        _cleanup_company(company_key)


def test_monthly_merge_ignores_wrong_extension() -> None:
    company_key = _make_temp_company("monthly_wrong_ext")
    try:
        month_dir = _company_path(company_key) / "monthly_raw" / "202501"
        month_dir.mkdir(parents=True, exist_ok=True)
        (month_dir / "sales_raw.txt").write_text("bad file", encoding="utf-8")

        inspection = inspect_monthly_raw(company_key)
        assert inspection["sources"]["sales"]["file_count"] == 0
    finally:
        _cleanup_company(company_key)


def test_monthly_merge_rows_match_written_output() -> None:
    company_key = _make_temp_company("monthly_rows")
    try:
        month_dir = _company_path(company_key) / "monthly_raw" / "202501"
        month_dir.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(
            {
                "기준년월": ["202501", "202501"],
                "매출금액": [100, 200],
                "거래처코드": ["A", "B"],
                "브랜드명": ["B1", "B2"],
            }
        ).to_excel(month_dir / "sales_raw.xlsx", index=False)

        result = merge_monthly_raw_sources(company_key)
        merged_path = _company_path(company_key) / "sales" / "sales_raw.xlsx"
        merged = pd.read_excel(merged_path, dtype=str)
        assert result["sources"]["sales"]["merged_rows"] == len(merged)
    finally:
        _cleanup_company(company_key)
