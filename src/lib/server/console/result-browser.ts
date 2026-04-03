import { promises as fs } from "node:fs";
import path from "node:path";

import { getPhase11CompanySnapshot } from "@/lib/server/console/company-context";
import { getRadarContext } from "@/lib/server/console/radar-context";
import { getRunDetailContext } from "@/lib/server/console/run-detail-context";
import type { ArtifactListItem, ReportCardItem, ResultBrowserContext, ResultFileTone } from "@/lib/shared/result-browser";

const REPORT_FILE_MAP: Record<string, { title: string; summary: string }> = {
  "crm_analysis_preview.html": {
    title: "CRM Report",
    summary: "CRM 결과를 사람용 화면으로 보여주는 미리보기 보고서입니다.",
  },
  "sandbox_report_preview.html": {
    title: "Sandbox Report",
    summary: "매출/목표 비교 결과를 바로 검토할 수 있는 미리보기 보고서입니다.",
  },
  "prescription_flow_preview.html": {
    title: "Prescription Report",
    summary: "Prescription 흐름과 청구 검토 결과를 정리한 미리보기 보고서입니다.",
  },
  "territory_map_preview.html": {
    title: "Territory Report",
    summary: "권역/이동 경로 결과를 지도 중심으로 확인하는 미리보기 보고서입니다.",
  },
  "radar_report_preview.html": {
    title: "RADAR Report",
    summary: "우선 확인 신호와 이슈를 정리한 미리보기 보고서입니다.",
  },
  "total_valid_preview.html": {
    title: "Total Validation Report",
    summary: "전체 실행 결과를 한 번에 검토하는 최종 요약 보고서입니다.",
  },
};

const ARTIFACT_DESCRIPTIONS: Record<string, string> = {
  "builder_validation_summary.json": "Builder가 어떤 보고서를 만들었는지 요약한 파일입니다.",
  "crm_validation_summary.json": "CRM validation 판단 요약 파일입니다.",
  "sandbox_validation_summary.json": "Sandbox validation 판단 요약 파일입니다.",
  "territory_validation_summary.json": "Territory validation 판단 요약 파일입니다.",
  "prescription_validation_summary.json": "Prescription validation 판단 요약 파일입니다.",
  "radar_validation_summary.json": "RADAR validation 판단 요약 파일입니다.",
  "pipeline_validation_summary.json": "전체 실행 결과를 단계별로 묶은 파이프라인 요약 파일입니다.",
};

function toPosixRelativePath(targetPath: string) {
  return path.relative(/* turbopackIgnore: true */ process.cwd(), targetPath).split(path.sep).join("/");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function extensionToFormat(filename: string) {
  const extension = path.extname(filename).replace(".", "").toUpperCase();
  return extension || "FILE";
}

function toneFromStatus(status: string | null | undefined): ResultFileTone {
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

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listTopLevelFiles(targetPath: string) {
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function getResultBrowserContext(companyKey: string): Promise<ResultBrowserContext> {
  const [companySnapshot, detail, radar] = await Promise.all([
    getPhase11CompanySnapshot(companyKey),
    getRunDetailContext(companyKey),
    getRadarContext(companyKey),
  ]);

  const latestRun = companySnapshot.recentRuns[0] ?? null;
  const builderDir = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "validation",
    companyKey,
    "builder",
  );

  const reports: ReportCardItem[] = [];
  for (const [filename, meta] of Object.entries(REPORT_FILE_MAP)) {
    const fullPath = path.join(builderDir, filename);
    if (!(await fileExists(fullPath))) {
      continue;
    }
    const stat = await fs.stat(fullPath);
    const moduleKey = filename.startsWith("crm")
      ? "crm"
      : filename.startsWith("sandbox")
        ? "sandbox"
        : filename.startsWith("prescription")
          ? "prescription"
          : filename.startsWith("territory")
            ? "territory"
            : filename.startsWith("radar")
              ? "radar"
              : "builder";
    const moduleSummary = detail.modules.find((item) => item.moduleKey === moduleKey);

    reports.push({
      key: filename,
      title: meta.title,
      summary: meta.summary,
      status: moduleSummary?.status ?? "GENERATED",
      tone: moduleSummary?.tone ?? "pass",
      updatedAt: formatDateTime(stat.mtime),
      relativePath: toPosixRelativePath(fullPath),
      fileName: filename,
    });
  }

  const artifactTargets = [
    { stage: "Pipeline", folder: "pipeline" },
    { stage: "CRM", folder: "crm" },
    { stage: "Prescription", folder: "prescription" },
    { stage: "Sandbox", folder: "sandbox" },
    { stage: "Territory", folder: "territory" },
    { stage: "RADAR", folder: "radar" },
    { stage: "Builder", folder: "builder" },
  ] as const;

  const artifacts: ArtifactListItem[] = [];
  for (const target of artifactTargets) {
    const folderPath = path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "validation",
      companyKey,
      target.folder,
    );
    const filenames = await listTopLevelFiles(folderPath);
    const moduleSummary = detail.modules.find((item) => item.moduleKey === target.folder);

    for (const filename of filenames) {
      const skip =
        filename.endsWith(".html") ||
        filename.includes("_assets") ||
        filename === "__pycache__";
      if (skip) {
        continue;
      }

      const fullPath = path.join(folderPath, filename);
      const stat = await fs.stat(fullPath);
      const defaultSummary =
        ARTIFACT_DESCRIPTIONS[filename] ??
        (target.stage + " 단계에서 만들어진 " + extensionToFormat(filename) + " 파일입니다.");

      artifacts.push({
        key: `${target.folder}-${filename}`,
        fileName: filename,
        stage: target.stage,
        format: extensionToFormat(filename),
        updatedAt: formatDateTime(stat.mtime),
        sizeLabel: formatBytes(stat.size),
        status: moduleSummary?.status ?? "GENERATED",
        tone: moduleSummary?.tone ?? (filename.includes("validation_summary") ? "approved" : "pass"),
        summary: defaultSummary,
        relativePath: toPosixRelativePath(fullPath),
      });
    }
  }

  artifacts.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return {
    latestRunKey: latestRun?.runKey ?? null,
    latestRunStatus: latestRun?.statusLabel ?? null,
    companyName: companySnapshot.company.companyName,
    reports,
    artifacts,
    radar,
  };
}
