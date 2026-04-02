from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd

from modules.intake.fixers import clean_dataframe_headers, clean_string_cells, drop_duplicate_rows, normalize_month_value
from modules.intake.merge import merge_monthly_raw_sources
from modules.intake.rules import get_company_root


def get_staging_root(company_key: str) -> Path:
    return get_company_root(company_key) / "_intake_staging"


def _write_frame(frame: pd.DataFrame, target_path: Path) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    if target_path.suffix.lower() == ".csv":
        frame.to_csv(target_path, index=False, encoding="utf-8-sig")
        return
    frame.to_excel(target_path, index=False)


def _stable_account_id(account_name: str) -> str:
    token = hashlib.md5(account_name.encode("utf-8")).hexdigest()[:16].upper()
    return f"ACC_{token}"


def _first_existing(frame: pd.DataFrame, candidates: list[str]) -> str | None:
    for name in candidates:
        if name in frame.columns:
            return name
    return None


def _apply_crm_activity_canonical_columns(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    staged = frame.copy()
    fixes: list[str] = []

    mapping = {
        "실행일": ["실행일", "방문일", "활동일"],
        "영업사원명": ["영업사원명", "담당자명", "사원명"],
        "영업사원코드": ["영업사원코드", "rep_id"],
        "방문기관": ["방문기관", "병원명", "거래처명"],
        "액션유형": ["액션유형", "활동유형", "call_type"],
    }
    for canonical, candidates in mapping.items():
        source = _first_existing(staged, candidates)
        if source and canonical not in staged.columns:
            staged[canonical] = staged[source]
            fixes.append(f"{source} 컬럼을 실행용 {canonical} 컬럼으로 추가했습니다.")

    if "실행일" in staged.columns and "metric_month" not in staged.columns:
        staged["metric_month"] = staged["실행일"].map(normalize_month_value)
        fixes.append("실행일 기준 metric_month 컬럼을 추가했습니다.")

    return staged, fixes


def _apply_sales_canonical_columns(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    staged = frame.copy()
    fixes: list[str] = []
    mapping = {
        "기준년월": ["기준년월", "매출월", "목표월"],
        "거래처코드": ["거래처코드", "병원코드", "account_id"],
        "거래처명": ["거래처명", "병원명", "account_name"],
        "브랜드명": ["브랜드명", "제품명", "product_name"],
    }
    for canonical, candidates in mapping.items():
        source = _first_existing(staged, candidates)
        if source and canonical not in staged.columns:
            staged[canonical] = staged[source]
            fixes.append(f"{source} 컬럼을 실행용 {canonical} 컬럼으로 추가했습니다.")

    if "기준년월" in staged.columns:
        staged["기준년월"] = staged["기준년월"].map(normalize_month_value)

    return staged, fixes


def _apply_prescription_canonical_columns(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    staged = frame.copy()
    fixes: list[str] = []
    mapping = {
        "ship_date (출고일)": ["ship_date (출고일)", "출고일", "납품일"],
        "pharmacy_name (약국명)": ["pharmacy_name (약국명)", "약국명"],
        "brand (브랜드)": ["brand (브랜드)", "brand", "제품명"],
        "qty (수량)": ["qty (수량)", "출고수량", "quantity"],
    }
    for canonical, candidates in mapping.items():
        source = _first_existing(staged, candidates)
        if source and canonical not in staged.columns:
            staged[canonical] = staged[source]
            fixes.append(f"{source} 컬럼을 실행용 {canonical} 컬럼으로 추가했습니다.")

    if "ship_date (출고일)" in staged.columns and "metric_month" not in staged.columns:
        staged["metric_month"] = staged["ship_date (출고일)"].map(normalize_month_value)
        fixes.append("출고일 기준 metric_month 컬럼을 추가했습니다.")

    return staged, fixes


def _derive_execution_ready_assignment(
    crm_activity_frame: pd.DataFrame, crm_rep_master_frame: pd.DataFrame
) -> pd.DataFrame:
    activity = crm_activity_frame.copy()
    reps = crm_rep_master_frame.copy()
    activity, _ = clean_dataframe_headers(activity)
    reps, _ = clean_dataframe_headers(reps)

    account_col = _first_existing(activity, ["방문기관", "병원명", "거래처명"])
    rep_name_col = _first_existing(activity, ["영업사원명", "담당자명", "rep_name"])
    rep_id_col = _first_existing(activity, ["영업사원코드", "rep_id"])
    if not account_col or not rep_name_col:
        return pd.DataFrame()

    rep_lookup = reps.copy()
    rep_lookup["rep_key"] = rep_lookup[_first_existing(reps, ["rep_name", "영업사원명"]) or "rep_name"]
    branch_id_col = _first_existing(reps, ["branch_id", "본부코드"])
    branch_name_col = _first_existing(reps, ["branch_name", "본부명"])
    base = (
        activity[[col for col in [account_col, rep_name_col, rep_id_col] if col]]
        .dropna(how="all")
        .drop_duplicates()
        .rename(
            columns={
                account_col: "account_name",
                rep_name_col: "rep_name",
                rep_id_col or "": "rep_id",
            }
        )
    )
    base["account_id"] = base["account_name"].map(_stable_account_id)
    if "rep_id" not in base.columns:
        base["rep_id"] = None
    merged = base.merge(
        rep_lookup[
            [col for col in [branch_id_col, branch_name_col, "rep_key"] if col]
        ],
        how="left",
        left_on="rep_name",
        right_on="rep_key",
    )
    merged = merged.rename(
        columns={
            branch_id_col or "": "branch_id",
            branch_name_col or "": "branch_name",
        }
    )
    merged["거래처코드"] = merged["account_id"]
    merged["거래처명"] = merged["account_name"]
    merged["영업사원명"] = merged["rep_name"]
    merged["영업사원코드"] = merged["rep_id"]
    merged["본부코드"] = merged.get("branch_id")
    merged["본부명"] = merged.get("branch_name")
    if "branch_id" not in merged.columns:
        merged["branch_id"] = None
    if "branch_name" not in merged.columns:
        merged["branch_name"] = None
    return merged[
        [
            "거래처코드",
            "거래처명",
            "영업사원코드",
            "영업사원명",
            "본부코드",
            "본부명",
            "account_id",
            "account_name",
            "rep_id",
            "rep_name",
            "branch_id",
            "branch_name",
        ]
    ].drop_duplicates()


def _derive_execution_ready_account_master(assignment_frame: pd.DataFrame) -> pd.DataFrame:
    if assignment_frame.empty:
        return pd.DataFrame()
    staged = assignment_frame.copy()
    staged["account_type"] = staged.get("account_type", "unknown")
    return staged[
        [
            "account_id",
            "account_name",
            "account_type",
            "branch_id",
            "branch_name",
            "rep_id",
            "rep_name",
        ]
    ].drop_duplicates()


def stage_company_sources(company_key: str) -> dict[str, Any]:
    company_root = get_company_root(company_key)
    staging_root = get_staging_root(company_key)
    staging_root.mkdir(parents=True, exist_ok=True)
    merge_result = merge_monthly_raw_sources(company_key)

    fixes: list[str] = []
    created_files: list[str] = []

    crm_activity_path = company_root / "crm" / "crm_activity_raw.xlsx"
    crm_rep_master_path = company_root / "crm" / "crm_rep_master.xlsx"
    crm_assignment_path = company_root / "crm" / "crm_account_assignment.xlsx"
    account_master_path = company_root / "company" / "account_master.xlsx"
    sales_path = company_root / "sales" / "sales_raw.xlsx"
    target_path = company_root / "sales" / "target_raw.xlsx"
    prescription_csv = company_root / "prescription" / "prescription_raw.csv"

    if crm_activity_path.exists():
        crm_activity = pd.read_excel(crm_activity_path, dtype=str)
        crm_activity, header_fixes = clean_dataframe_headers(crm_activity)
        crm_activity, string_fixes = clean_string_cells(crm_activity)
        crm_activity, row_fixes = drop_duplicate_rows(crm_activity)
        staged_crm_activity, canonical_fixes = _apply_crm_activity_canonical_columns(crm_activity)
        target = staging_root / "crm" / "crm_activity_raw.xlsx"
        _write_frame(staged_crm_activity, target)
        fixes.extend(header_fixes + string_fixes + row_fixes + canonical_fixes)
        created_files.append(target.as_posix())
    else:
        staged_crm_activity = pd.DataFrame()

    if crm_rep_master_path.exists():
        crm_rep = pd.read_excel(crm_rep_master_path, dtype=str)
        crm_rep, header_fixes = clean_dataframe_headers(crm_rep)
        crm_rep, string_fixes = clean_string_cells(crm_rep)
        crm_rep, row_fixes = drop_duplicate_rows(crm_rep)
        target = staging_root / "crm" / "crm_rep_master.xlsx"
        _write_frame(crm_rep, target)
        fixes.extend(header_fixes + string_fixes + row_fixes)
        created_files.append(target.as_posix())
    else:
        crm_rep = pd.DataFrame()

    assignment_source_frame = pd.DataFrame()
    if crm_assignment_path.exists():
        crm_assignment = pd.read_excel(crm_assignment_path, dtype=str)
        crm_assignment, header_fixes = clean_dataframe_headers(crm_assignment)
        crm_assignment, string_fixes = clean_string_cells(crm_assignment)
        crm_assignment, row_fixes = drop_duplicate_rows(crm_assignment)
        assignment_source_frame = crm_assignment
        fixes.extend(header_fixes + string_fixes + row_fixes)

    if assignment_source_frame.empty or "거래처코드" not in assignment_source_frame.columns:
        derived_assignment = _derive_execution_ready_assignment(staged_crm_activity, crm_rep)
        if not derived_assignment.empty:
            assignment_source_frame = derived_assignment
            fixes.append("CRM 활동 데이터 기준으로 실행용 account assignment를 생성했습니다.")

    if not assignment_source_frame.empty:
        target = staging_root / "crm" / "crm_account_assignment.xlsx"
        _write_frame(assignment_source_frame, target)
        created_files.append(target.as_posix())

    account_source_frame = pd.DataFrame()
    if account_master_path.exists():
        account_master = pd.read_excel(account_master_path, dtype=str)
        account_master, header_fixes = clean_dataframe_headers(account_master)
        account_master, string_fixes = clean_string_cells(account_master)
        account_master, row_fixes = drop_duplicate_rows(account_master)
        account_source_frame = account_master
        fixes.extend(header_fixes + string_fixes + row_fixes)

    if account_source_frame.empty or "account_id" not in account_source_frame.columns:
        account_source_frame = _derive_execution_ready_account_master(assignment_source_frame)
        if not account_source_frame.empty:
            fixes.append("실행용 account master를 account assignment 기준으로 생성했습니다.")

    if not account_source_frame.empty:
        target = staging_root / "company" / "account_master.xlsx"
        _write_frame(account_source_frame, target)
        created_files.append(target.as_posix())

    if sales_path.exists():
        sales = pd.read_excel(sales_path, dtype=str)
        sales, header_fixes = clean_dataframe_headers(sales)
        sales, string_fixes = clean_string_cells(sales)
        sales, row_fixes = drop_duplicate_rows(sales)
        staged_sales, canonical_fixes = _apply_sales_canonical_columns(sales)
        target = staging_root / "sales" / "sales_raw.xlsx"
        _write_frame(staged_sales, target)
        fixes.extend(header_fixes + string_fixes + row_fixes + canonical_fixes)
        created_files.append(target.as_posix())

    if target_path.exists():
        target_df = pd.read_excel(target_path, dtype=str)
        target_df, header_fixes = clean_dataframe_headers(target_df)
        target_df, string_fixes = clean_string_cells(target_df)
        target_df, row_fixes = drop_duplicate_rows(target_df)
        staged_target, canonical_fixes = _apply_sales_canonical_columns(target_df)
        target = staging_root / "sales" / "target_raw.xlsx"
        _write_frame(staged_target, target)
        fixes.extend(header_fixes + string_fixes + row_fixes + canonical_fixes)
        created_files.append(target.as_posix())

    if prescription_csv.exists():
        prescription = pd.read_csv(prescription_csv, dtype=str, encoding="utf-8-sig")
        prescription, header_fixes = clean_dataframe_headers(prescription)
        prescription, string_fixes = clean_string_cells(prescription)
        prescription, row_fixes = drop_duplicate_rows(prescription)
        staged_prescription, canonical_fixes = _apply_prescription_canonical_columns(prescription)
        target = staging_root / "prescription" / "prescription_raw.csv"
        _write_frame(staged_prescription, target)
        fixes.extend(header_fixes + string_fixes + row_fixes + canonical_fixes)
        created_files.append(target.as_posix())

    summary = {
        "company_key": company_key,
        "staging_root": staging_root.as_posix(),
        "merge_result": merge_result,
        "created_files": created_files,
        "fixes": fixes,
    }
    (company_root / "_onboarding").mkdir(parents=True, exist_ok=True)
    (company_root / "_onboarding" / "latest_staging_result.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return summary
