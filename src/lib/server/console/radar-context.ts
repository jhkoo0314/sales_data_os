import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  RadarContext,
  RadarDecisionOption,
  RadarEvidenceItem,
  RadarScopeHighlight,
  RadarSignalSummary,
  RadarTone,
} from "@/lib/shared/radar-context";

type JsonRecord = Record<string, unknown>;

function toTone(status: string | null | undefined): RadarTone {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved") {
    return "approved";
  }
  if (normalized === "pass") {
    return "pass";
  }
  if (normalized === "warn" || normalized === "warning" || normalized === "review") {
    return "warn";
  }
  if (normalized === "fail" || normalized === "failed") {
    return "fail";
  }
  return "ready";
}

async function readJsonFile<T>(targetPath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toDisplayValue(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString("ko-KR") : value.toFixed(1);
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

function toPriorityLabel(score: number | null) {
  if (score === null) {
    return "우선순위 정보 없음";
  }
  if (score >= 80) {
    return "지금 먼저 볼 것";
  }
  if (score >= 60) {
    return "추가 확인 필요";
  }
  return "추후 검토";
}

function toEvidenceItems(payload: JsonRecord | null | undefined): RadarEvidenceItem[] {
  if (!payload) {
    return [];
  }

  const labels: Record<string, string> = {
    metric: "지표",
    actual: "현재 값",
    threshold: "기준선",
    gap: "차이",
    confidence: "신뢰도",
    scope_level: "범위",
  };

  return Object.entries(payload)
    .map(([key, value]) => {
      const displayValue = toDisplayValue(value);
      if (!displayValue) {
        return null;
      }
      return {
        label: labels[key] ?? key,
        value: displayValue,
      };
    })
    .filter((item): item is RadarEvidenceItem => Boolean(item))
    .slice(0, 5);
}

function toDecisionOptions(payload: unknown): RadarDecisionOption[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as JsonRecord;
      const label = toDisplayValue(record.label);
      const description = toDisplayValue(record.description);
      if (!label || !description) {
        return null;
      }
      return {
        code: toDisplayValue(record.option_code) ?? "-",
        label,
        description,
        style: toDisplayValue(record.style) ?? "general",
      };
    })
    .filter((item): item is RadarDecisionOption => Boolean(item));
}

function toSignalSummary(payload: JsonRecord): RadarSignalSummary {
  const priorityScore =
    typeof payload.priority_score === "number" ? Number(payload.priority_score) : null;
  const evidencePayload =
    payload.evidence && typeof payload.evidence === "object"
      ? (payload.evidence as JsonRecord)
      : null;

  return {
    signalId: toDisplayValue(payload.signal_id) ?? "unknown-signal",
    signalType: toDisplayValue(payload.signal_type) ?? "unknown",
    title: toDisplayValue(payload.title) ?? "신호 제목 없음",
    message: toDisplayValue(payload.message) ?? "신호 설명이 없습니다.",
    severity: (toDisplayValue(payload.severity) ?? "ready").toUpperCase(),
    tone: toTone(toDisplayValue(payload.severity)),
    priorityScore,
    priorityLabel: toPriorityLabel(priorityScore),
    possibleExplanations: Array.isArray(payload.possible_explanations)
      ? payload.possible_explanations.filter((value): value is string => typeof value === "string")
      : [],
    decisionOptions: toDecisionOptions(payload.decision_options),
    evidence: toEvidenceItems(evidencePayload),
  };
}

function pickScopeSummaryItem(items: unknown, labelBuilder: (payload: JsonRecord) => string | null) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  const first = items[0];
  if (!first || typeof first !== "object") {
    return null;
  }
  const record = first as JsonRecord;
  return labelBuilder(record);
}

function toScopeHighlights(scopeSummaries: JsonRecord | null | undefined): RadarScopeHighlight[] {
  if (!scopeSummaries) {
    return [];
  }

  const highlights: RadarScopeHighlight[] = [];

  const branchSummary = pickScopeSummaryItem(scopeSummaries.by_branch, (payload) => {
    const branchName = toDisplayValue(payload.branch_name);
    const attainment = toDisplayValue(payload.attainment_pct);
    if (!branchName || !attainment) {
      return null;
    }
    return `${branchName} 달성률 ${attainment}%`;
  });
  if (branchSummary) {
    highlights.push({ label: "지점 기준", summary: branchSummary });
  }

  const repSummary = pickScopeSummaryItem(scopeSummaries.by_rep, (payload) => {
    const repName = toDisplayValue(payload.rep_name);
    const branchName = toDisplayValue(payload.branch_name);
    const attainment = toDisplayValue(payload.attainment_pct);
    if (!repName || !branchName || !attainment) {
      return null;
    }
    return `${repName} (${branchName}) 달성률 ${attainment}%`;
  });
  if (repSummary) {
    highlights.push({ label: "담당자 기준", summary: repSummary });
  }

  const productSummary = pickScopeSummaryItem(scopeSummaries.by_product, (payload) => {
    const productName = toDisplayValue(payload.product_name) ?? toDisplayValue(payload.product);
    const attainment = toDisplayValue(payload.attainment_pct);
    if (!productName || !attainment) {
      return null;
    }
    return `${productName} 달성률 ${attainment}%`;
  });
  if (productSummary) {
    highlights.push({ label: "제품 기준", summary: productSummary });
  }

  return highlights;
}

function buildSummaryText(status: string | null, signalCount: number, topIssue: string | null) {
  if (signalCount === 0) {
    return "RADAR에서 지금 바로 확인할 강한 신호를 찾지 못했습니다.";
  }
  if (topIssue) {
    return `${signalCount}개의 신호 중 가장 먼저 볼 항목은 "${topIssue}"입니다.`;
  }
  if (status && status.toLowerCase() === "warning") {
    return `RADAR가 추가 확인이 필요한 신호 ${signalCount}개를 잡았습니다.`;
  }
  return `RADAR 신호 ${signalCount}개가 준비되었습니다.`;
}

export async function getRadarContext(companyKey: string): Promise<RadarContext> {
  const targetPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    "radar",
    "radar_result_asset.json",
  );

  const payload = await readJsonFile<JsonRecord>(targetPath);
  if (!payload) {
    return {
      sourceType: "missing",
      status: null,
      tone: "ready",
      signalCount: 0,
      topIssue: null,
      summaryText: "RADAR 결과 파일이 아직 없어 우선순위 해석을 보여줄 수 없습니다.",
      runId: null,
      periodValue: null,
      generatedAt: null,
      qualityScore: null,
      signals: [],
      scopeHighlights: [],
    };
  }

  const summary =
    payload.summary && typeof payload.summary === "object"
      ? (payload.summary as JsonRecord)
      : null;
  const meta =
    payload.meta && typeof payload.meta === "object" ? (payload.meta as JsonRecord) : null;
  const validationSummary =
    payload.validation_summary && typeof payload.validation_summary === "object"
      ? (payload.validation_summary as JsonRecord)
      : null;

  const signalCount =
    typeof summary?.signal_count === "number" ? Number(summary.signal_count) : 0;
  const topIssue = toDisplayValue(summary?.top_issue) ?? null;
  const status = toDisplayValue(summary?.overall_status) ?? null;

  return {
    sourceType: "radar_result_asset",
    status: status ? status.toUpperCase() : null,
    tone: toTone(status),
    signalCount,
    topIssue,
    summaryText: buildSummaryText(status, signalCount, topIssue),
    runId: toDisplayValue(meta?.run_id) ?? null,
    periodValue: toDisplayValue(meta?.period_value) ?? null,
    generatedAt: toDisplayValue(payload.generated_at) ?? null,
    qualityScore:
      typeof validationSummary?.quality_score === "number"
        ? Number(validationSummary.quality_score)
        : null,
    signals: Array.isArray(payload.signals)
      ? payload.signals
          .filter((item): item is JsonRecord => Boolean(item) && typeof item === "object")
          .map((item) => toSignalSummary(item))
      : [],
    scopeHighlights: toScopeHighlights(
      payload.scope_summaries && typeof payload.scope_summaries === "object"
        ? (payload.scope_summaries as JsonRecord)
        : null,
    ),
  };
}
