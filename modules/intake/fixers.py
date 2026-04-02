from __future__ import annotations

import re
from datetime import datetime

import pandas as pd


def normalize_header(value: str) -> str:
    text = str(value).replace("\ufeff", "").strip().lower()
    text = re.sub(r"\([^)]*\)", "", text)
    return re.sub(r"[_\-\s/]+", "", text)


def clean_dataframe_headers(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    cleaned_headers: list[str] = []
    fixes: list[str] = []
    seen: dict[str, int] = {}

    for raw_header in frame.columns.tolist():
        cleaned = str(raw_header).replace("\ufeff", "").strip()
        if cleaned != str(raw_header):
            fixes.append(f"헤더 공백 또는 BOM 정리: {raw_header} -> {cleaned}")
        duplicate_count = seen.get(cleaned, 0)
        seen[cleaned] = duplicate_count + 1
        if duplicate_count > 0:
            deduped = f"{cleaned}_{duplicate_count + 1}"
            fixes.append(f"중복 헤더 정리: {cleaned} -> {deduped}")
            cleaned = deduped
        cleaned_headers.append(cleaned)

    fixed = frame.copy()
    fixed.columns = cleaned_headers
    return fixed, fixes


def clean_string_cells(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    fixed = frame.copy()
    fixes: list[str] = []
    object_columns = fixed.columns.tolist()
    for column in object_columns:
        series = fixed[column]
        if not pd.api.types.is_object_dtype(series) and not pd.api.types.is_string_dtype(series):
            continue
        cleaned = (
            series.fillna("")
            .map(lambda value: " ".join(str(value).replace("\ufeff", "").strip().split()) if str(value).strip() else "")
            .replace("", pd.NA)
        )
        if not cleaned.equals(series):
            fixes.append(f"{column} 컬럼의 문자열 공백값을 정리했습니다.")
            fixed[column] = cleaned
    return fixed, fixes


def drop_duplicate_rows(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    before = len(frame)
    deduped = frame.drop_duplicates().reset_index(drop=True)
    removed = before - len(deduped)
    if removed <= 0:
        return deduped, []
    return deduped, [f"완전히 같은 행 {removed}건을 제거했습니다."]


def normalize_month_value(value: object) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y%m")

    text = str(value).replace("\ufeff", "").strip()
    if not text:
        return None

    if re.fullmatch(r"(19|20)\d{2}(0[1-9]|1[0-2])", text):
        return text

    month_match = re.fullmatch(r"((19|20)\d{2})[./-](0?[1-9]|1[0-2])", text)
    if month_match:
        return f"{month_match.group(1)}{month_match.group(3).zfill(2)}"

    date_match = re.fullmatch(
        r"((19|20)\d{2})[./-](0?[1-9]|1[0-2])[./-](0?[1-9]|[12]\d|3[01])",
        text,
    )
    if date_match:
        return f"{date_match.group(1)}{date_match.group(3).zfill(2)}"

    compact_date = re.fullmatch(r"((19|20)\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])", text)
    if compact_date:
        return f"{compact_date.group(1)}{compact_date.group(3)}"

    parsed = pd.to_datetime(text, errors="coerce")
    if pd.notna(parsed):
        return parsed.strftime("%Y%m")

    return None


def build_period_coverage(frame: pd.DataFrame, column_name: str) -> dict[str, object] | None:
    if column_name not in frame.columns:
        return None

    months = sorted(
        {
            token
            for token in frame[column_name].map(normalize_month_value).tolist()
            if token
        }
    )
    if not months:
        return None

    start_month = months[0]
    end_month = months[-1]
    start = datetime.strptime(start_month, "%Y%m")
    end = datetime.strptime(end_month, "%Y%m")
    month_count = (end.year - start.year) * 12 + (end.month - start.month) + 1
    return {
        "start_month": start_month,
        "end_month": end_month,
        "month_count": month_count,
    }
