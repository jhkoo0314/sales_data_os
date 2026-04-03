type LogLevel = "info" | "error";

type LogPayload = {
  event: string;
  companyKey?: string | null;
  runKey?: string | null;
  route?: string | null;
  detail?: string | null;
  meta?: Record<string, unknown> | null;
};

function toEntry(level: LogLevel, payload: LogPayload) {
  return {
    level,
    event: payload.event,
    company_key: payload.companyKey ?? null,
    run_key: payload.runKey ?? null,
    route: payload.route ?? null,
    detail: payload.detail ?? null,
    meta: payload.meta ?? null,
    timestamp: new Date().toISOString(),
  };
}

export function logInfo(payload: LogPayload) {
  console.info("[sales-os]", JSON.stringify(toEntry("info", payload)));
}

export function logError(payload: LogPayload) {
  console.error("[sales-os]", JSON.stringify(toEntry("error", payload)));
}
