from __future__ import annotations


def compute_sandbox_official_kpi_6(
    sales_by_month: dict[str, float],
    target_by_month: dict[str, float],
) -> dict[str, float | str]:
    months = sorted(set(sales_by_month.keys()) | set(target_by_month.keys()))
    if not months:
        return {
            "monthly_sales": 0.0,
            "monthly_target": 0.0,
            "monthly_attainment_rate": 0.0,
            "quarterly_sales": 0.0,
            "quarterly_target": 0.0,
            "annual_attainment_rate": 0.0,
            "reference_month": "",
            "reference_quarter": "",
            "reference_year": "",
            "metric_version": "sandbox_kpi_engine_v1",
        }

    reference_month = months[-1]
    year = reference_month[:4]
    quarter = ((int(reference_month[4:6]) - 1) // 3) + 1
    quarter_months = [month for month in months if month.startswith(year) and (((int(month[4:6]) - 1) // 3) + 1) == quarter]
    year_months = [month for month in months if month.startswith(year)]

    monthly_sales = float(sales_by_month.get(reference_month, 0.0) or 0.0)
    monthly_target = float(target_by_month.get(reference_month, 0.0) or 0.0)
    quarterly_sales = sum(float(sales_by_month.get(month, 0.0) or 0.0) for month in quarter_months)
    quarterly_target = sum(float(target_by_month.get(month, 0.0) or 0.0) for month in quarter_months)
    annual_sales = sum(float(sales_by_month.get(month, 0.0) or 0.0) for month in year_months)
    annual_target = sum(float(target_by_month.get(month, 0.0) or 0.0) for month in year_months)

    return {
        "monthly_sales": round(monthly_sales, 0),
        "monthly_target": round(monthly_target, 0),
        "monthly_attainment_rate": round(_rate(monthly_sales, monthly_target), 1),
        "quarterly_sales": round(quarterly_sales, 0),
        "quarterly_target": round(quarterly_target, 0),
        "annual_attainment_rate": round(_rate(annual_sales, annual_target), 1),
        "reference_month": reference_month,
        "reference_quarter": f"{year}-Q{quarter}",
        "reference_year": year,
        "metric_version": "sandbox_kpi_engine_v1",
    }


def _rate(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return (numerator / denominator) * 100.0
