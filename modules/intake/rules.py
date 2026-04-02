from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SourceRule:
    source_key: str
    label: str
    required_fields: tuple[str, ...]
    aliases: dict[str, tuple[str, ...]]
    path_candidates: tuple[str, ...]
    period_field: str | None = None


EXECUTION_SCENARIOS: dict[str, tuple[str, ...]] = {
    "integrated_full": (
        "crm_activity",
        "crm_rep_master",
        "crm_account_assignment",
        "sales",
        "target",
        "prescription",
    ),
    "crm_only": ("crm_activity", "crm_rep_master", "crm_account_assignment"),
    "sandbox_only": ("sales", "target"),
    "prescription_only": ("prescription",),
}


SOURCE_RULES: dict[str, SourceRule] = {
    "crm_activity": SourceRule(
        source_key="crm_activity",
        label="CRM Activity",
        required_fields=("activity_date", "rep", "account", "activity_type"),
        aliases={
            "activity_date": ("activity_date", "방문일", "활동일", "실행일"),
            "rep": ("rep_name", "담당자명", "영업사원명", "사원명"),
            "account": ("account_id", "account_name", "병원코드", "병원명", "거래처코드", "거래처명", "방문기관"),
            "activity_type": ("activity_type", "활동유형", "액션유형", "call_type"),
        },
        path_candidates=("crm/crm_activity_raw.xlsx", "crm/crm_activity_raw.csv"),
        period_field="activity_date",
    ),
    "account_master": SourceRule(
        source_key="account_master",
        label="Account Master",
        required_fields=("account",),
        aliases={"account": ("account_id", "account_name", "병원코드", "병원명", "거래처코드", "거래처명")},
        path_candidates=("company/account_master.xlsx", "company/account_master.csv"),
    ),
    "crm_rep_master": SourceRule(
        source_key="crm_rep_master",
        label="CRM Rep Master",
        required_fields=("rep", "organization"),
        aliases={
            "rep": ("rep_name", "담당자명", "영업사원명", "사원명"),
            "organization": ("organization", "조직", "조직명", "본부명", "branch_name"),
        },
        path_candidates=("crm/crm_rep_master.xlsx", "crm/crm_rep_master.csv"),
    ),
    "crm_account_assignment": SourceRule(
        source_key="crm_account_assignment",
        label="CRM Account Assignment",
        required_fields=("account", "rep"),
        aliases={
            "account": ("account_id", "account_name", "병원코드", "병원명", "거래처코드", "거래처명"),
            "rep": ("rep_name", "담당자명", "영업사원명", "사원명"),
        },
        path_candidates=("crm/crm_account_assignment.xlsx", "crm/crm_account_assignment.csv"),
    ),
    "crm_rules": SourceRule(
        source_key="crm_rules",
        label="CRM Rules",
        required_fields=(),
        aliases={},
        path_candidates=("crm/crm_rules.csv", "crm/crm_rules.xlsx"),
    ),
    "sales": SourceRule(
        source_key="sales",
        label="Sales",
        required_fields=("account", "product", "amount", "period"),
        aliases={
            "account": ("account_id", "account_name", "병원코드", "병원명", "거래처코드", "거래처명"),
            "product": ("product_name", "제품명", "품목명", "브랜드명", "brand"),
            "amount": ("amount", "매출금액", "금액"),
            "period": ("period", "기준년월", "매출월", "yyyymm"),
        },
        path_candidates=("sales/sales_raw.xlsx", "sales/sales_raw.csv"),
        period_field="period",
    ),
    "target": SourceRule(
        source_key="target",
        label="Target",
        required_fields=("period", "target_value"),
        aliases={
            "period": ("period", "기준년월", "목표월", "yyyymm"),
            "target_value": ("target_value", "목표금액", "목표값", "계획금액"),
        },
        path_candidates=("sales/target_raw.xlsx", "sales/target_raw.csv"),
        period_field="period",
    ),
    "prescription": SourceRule(
        source_key="prescription",
        label="Prescription",
        required_fields=("ship_date", "pharmacy", "product", "quantity"),
        aliases={
            "ship_date": ("ship_date", "출고일", "납품일"),
            "pharmacy": ("pharmacy_name", "약국명"),
            "product": ("product_name", "제품명", "품목명", "brand", "sku"),
            "quantity": ("quantity", "출고수량", "수량", "qty"),
        },
        path_candidates=(
            "prescription/prescription_raw.csv",
            "prescription/prescription_raw.xlsx",
            "company/fact_ship_raw.csv",
        ),
        period_field="ship_date",
    ),
}


def get_company_root(company_key: str) -> Path:
    return Path("data") / "company_source" / company_key


def get_onboarding_root(company_key: str) -> Path:
    return get_company_root(company_key) / "_onboarding"
