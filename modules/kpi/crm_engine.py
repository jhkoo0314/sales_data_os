from __future__ import annotations

from collections import defaultdict
from typing import Any


BEHAVIOR8_KEYS = ("PT", "Demo", "Closing", "Needs", "FaceToFace", "Contact", "Access", "Feedback")


def compute_crm_kpi_bundle(activities: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for activity in activities:
        grouped[(activity["rep_id"], activity["metric_month"])].append(activity)

    rep_rows: list[dict[str, Any]] = []
    month_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for rep_id, metric_month in sorted(grouped.keys()):
        rows = grouped[(rep_id, metric_month)]
        metric_set = _compute_metric_set(rows)
        behavior_mix = _compute_behavior_mix(rows)
        rep_row = {
            "rep_id": rep_id,
            "metric_month": metric_month,
            "metric_set": metric_set,
            "behavior_mix_8": behavior_mix,
            "unscored_reasons": [],
        }
        rep_rows.append(rep_row)
        month_groups[metric_month].append(rep_row)

    month_rows: list[dict[str, Any]] = []
    for metric_month in sorted(month_groups.keys()):
        rows = month_groups[metric_month]
        month_rows.append(
            {
                "metric_month": metric_month,
                "metric_set": _average_metric_sets([row["metric_set"] for row in rows]),
                "rep_count": len(rows),
                "unscored_count": 0,
            }
        )

    return rep_rows, month_rows, "crm_kpi_engine_v1"


def _compute_metric_set(rows: list[dict[str, Any]]) -> dict[str, float]:
    visits = float(sum(int(row.get("visit_count", 1) or 1) for row in rows))
    detail_calls = float(sum(1 for row in rows if row.get("has_detail_call")))
    next_actions = float(sum(1 for row in rows if row.get("next_action_text")))
    unique_hospitals = len({str(row.get("hospital_id") or "").strip() for row in rows if str(row.get("hospital_id") or "").strip()})
    active_days = len({str(row.get("activity_date") or "").strip() for row in rows if str(row.get("activity_date") or "").strip()})

    hir = _pct(min(visits / 20.0, 1.0))
    rtr = _pct(min(detail_calls / max(visits, 1.0), 1.0))
    bcr = _pct((0.4 * min(visits / 20.0, 1.0)) + (0.6 * min(active_days / 16.0, 1.0)))
    phr = _pct(min(next_actions / max(len(rows), 1), 1.0))
    nar = phr
    ahs = _pct((0.5 * min(unique_hospitals / 20.0, 1.0)) + (0.5 * min(active_days / 20.0, 1.0)))
    pv = _pct((0.7 * (hir / 100.0)) + (0.3 * (nar / 100.0)))
    pi = _pct((0.7 * (hir / 100.0)) + (0.3 * (bcr / 100.0)))
    fgr = round(((pi - 50.0) / 50.0) * 100.0, 1)
    trg = round(pi - 100.0, 1)
    swr = _pct(sum(1 for value in _compute_behavior_mix(rows).values() if value > 0) / len(BEHAVIOR8_KEYS))
    coach_score = round((0.30 * hir) + (0.20 * rtr) + (0.15 * bcr) + (0.15 * phr) + (0.10 * nar) + (0.10 * ahs), 1)
    return {
        "hir": hir,
        "rtr": rtr,
        "bcr": bcr,
        "phr": phr,
        "nar": nar,
        "ahs": ahs,
        "pv": pv,
        "fgr": fgr,
        "pi": pi,
        "trg": trg,
        "swr": swr,
        "coach_score": coach_score,
    }


def _compute_behavior_mix(rows: list[dict[str, Any]]) -> dict[str, float]:
    counts = {key: 0.0 for key in BEHAVIOR8_KEYS}
    total = 0.0
    for row in rows:
        behavior = _to_behavior8(row.get("activity_type"))
        counts[behavior] += 1.0
        total += 1.0
    if total <= 0:
        return counts
    return {key: round(value / total, 4) for key, value in counts.items()}


def _average_metric_sets(metric_sets: list[dict[str, float]]) -> dict[str, float]:
    if not metric_sets:
        return {key: 0.0 for key in ("hir", "rtr", "bcr", "phr", "nar", "ahs", "pv", "fgr", "pi", "trg", "swr", "coach_score")}
    keys = metric_sets[0].keys()
    return {key: round(sum(float(row.get(key, 0.0) or 0.0) for row in metric_sets) / len(metric_sets), 1) for key in keys}


def _pct(value01: float) -> float:
    return round(max(0.0, min(1.0, float(value01))) * 100.0, 1)


def _to_behavior8(raw: Any) -> str:
    text = str(raw or "").strip().lower().replace(" ", "")
    mapping = {
        "pt": "PT",
        "제품설명": "PT",
        "디테일": "PT",
        "demo": "Demo",
        "시연": "Demo",
        "closing": "Closing",
        "클로징": "Closing",
        "needs": "Needs",
        "니즈": "Needs",
        "facetoface": "FaceToFace",
        "대면": "FaceToFace",
        "방문": "FaceToFace",
        "contact": "Contact",
        "컨택": "Contact",
        "전화": "Contact",
        "email": "Contact",
        "이메일": "Contact",
        "access": "Access",
        "접근": "Access",
        "feedback": "Feedback",
        "피드백": "Feedback",
    }
    return mapping.get(text, "Contact")
