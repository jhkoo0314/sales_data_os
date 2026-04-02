from __future__ import annotations

from typing import Any


def detect_signals(
    crm_asset: dict[str, Any],
    sandbox_asset: dict[str, Any],
    prescription_asset: dict[str, Any],
    territory_asset: dict[str, Any],
) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []

    monthly_attainment = float(sandbox_asset.get("official_kpi_6", {}).get("monthly_attainment_rate", 0.0) or 0.0)
    if monthly_attainment < 95.0:
        severity = "critical"
    elif monthly_attainment < 100.0:
        severity = "warning"
    else:
        severity = "normal"
    signals.append(
        {
            "signal_code": "sandbox_attainment",
            "signal_title": "월 매출 달성률 신호",
            "module": "sandbox",
            "severity": severity,
            "reason": f"최신 월 달성률이 {monthly_attainment:.1f}%입니다.",
            "metric_value": monthly_attainment,
            "unit": "pct",
        }
    )

    coach_score = _latest_crm_coach_score(crm_asset)
    if coach_score < 70.0:
        severity = "critical"
    elif coach_score < 80.0:
        severity = "warning"
    else:
        severity = "normal"
    signals.append(
        {
            "signal_code": "crm_coach_score",
            "signal_title": "CRM 행동 품질 신호",
            "module": "crm",
            "severity": severity,
            "reason": f"최신 월 CRM coach score가 {coach_score:.1f}점입니다.",
            "metric_value": coach_score,
            "unit": "score",
        }
    )

    prescription_gap_rate = float(prescription_asset.get("validation_gap_summary", {}).get("amount_missing_rate", 0.0) or 0.0)
    if prescription_gap_rate > 10.0:
        severity = "critical"
    elif prescription_gap_rate > 0.0:
        severity = "warning"
    else:
        severity = "normal"
    signals.append(
        {
            "signal_code": "prescription_gap",
            "signal_title": "처방 흐름 결측 신호",
            "module": "prescription",
            "severity": severity,
            "reason": f"처방 금액 결측 비율이 {prescription_gap_rate:.1f}%입니다.",
            "metric_value": prescription_gap_rate,
            "unit": "pct",
        }
    )

    coordinate_missing = float(territory_asset.get("optimization_summary", {}).get("coordinate_missing_count", 0.0) or 0.0)
    if coordinate_missing > 100.0:
        severity = "critical"
    elif coordinate_missing > 0.0:
        severity = "warning"
    else:
        severity = "normal"
    signals.append(
        {
            "signal_code": "territory_coordinate_gap",
            "signal_title": "지도 좌표 누락 신호",
            "module": "territory",
            "severity": severity,
            "reason": f"좌표 누락 활동이 {int(coordinate_missing)}건입니다.",
            "metric_value": coordinate_missing,
            "unit": "count",
        }
    )

    return signals


def score_signals(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scored: list[dict[str, Any]] = []
    severity_weight = {"critical": 90, "warning": 70, "normal": 50}
    for signal in signals:
        base = severity_weight.get(str(signal.get("severity", "normal")), 50)
        metric_value = float(signal.get("metric_value", 0.0) or 0.0)
        modifier = min(int(metric_value // 5), 9)
        if signal.get("severity") == "normal":
            priority_score = max(35, base - modifier)
        else:
            priority_score = min(99, base + modifier)
        scored.append({**signal, "priority_score": priority_score})
    return sorted(scored, key=lambda item: int(item.get("priority_score", 0)), reverse=True)


def attach_decision_options(signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    attached: list[dict[str, Any]] = []
    for signal in signals:
        code = str(signal.get("signal_code", ""))
        options = _decision_options_for(code)
        attached.append({**signal, "decision_options": options})
    return attached


def _decision_options_for(signal_code: str) -> list[dict[str, str]]:
    if signal_code == "sandbox_attainment":
        return [
            {"option_code": "A", "title": "목표 미달 병원 점검", "description": "최신 월 목표 대비 낮은 병원을 먼저 확인합니다."},
            {"option_code": "B", "title": "고성과 품목 재확대", "description": "성과가 좋은 품목을 비슷한 계정군에 넓혀 봅니다."},
            {"option_code": "C", "title": "분기 기준 재배치", "description": "월 단위보다 분기 단위로 우선순위를 다시 잡습니다."},
        ]
    if signal_code == "crm_coach_score":
        return [
            {"option_code": "A", "title": "행동 코칭 강화", "description": "상세설명 비중과 다음 액션 기록을 먼저 보강합니다."},
            {"option_code": "B", "title": "담당자별 패턴 비교", "description": "좋은 담당자 패턴을 기준으로 편차를 비교합니다."},
        ]
    if signal_code == "prescription_gap":
        return [
            {"option_code": "A", "title": "처방 데이터 점검", "description": "금액 누락 또는 브랜드 표기 차이를 먼저 정리합니다."},
            {"option_code": "B", "title": "브랜드명 정규화", "description": "띄어쓰기 차이 같은 이름 흔들림을 줄입니다."},
        ]
    return [
        {"option_code": "A", "title": "좌표 보강", "description": "좌표가 없는 기관 데이터를 먼저 채웁니다."},
        {"option_code": "B", "title": "지도 범위 재검토", "description": "현재 경로와 커버리지를 다시 묶어 봅니다."},
    ]


def _latest_crm_coach_score(crm_asset: dict[str, Any]) -> float:
    monthly_rows = crm_asset.get("monthly_kpi", [])
    if not monthly_rows:
        return 0.0
    latest = sorted(monthly_rows, key=lambda item: str(item.get("metric_month", "")))[-1]
    return float(latest.get("coach_score", 0.0) or 0.0)
