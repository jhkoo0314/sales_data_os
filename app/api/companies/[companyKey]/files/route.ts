import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";
import { logError, logInfo } from "@/lib/server/shared/ops-log";

function contentTypeFor(targetPath: string) {
  const extension = path.extname(targetPath).toLowerCase();
  if (extension === ".html") {
    return "text/html; charset=utf-8";
  }
  if (extension === ".json") {
    return "application/json; charset=utf-8";
  }
  if (extension === ".xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (extension === ".csv") {
    return "text/csv; charset=utf-8";
  }
  if (extension === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (extension === ".css") {
    return "text/css; charset=utf-8";
  }
  if (extension === ".png") {
    return "image/png";
  }
  return "application/octet-stream";
}

function isAllowedPath(companyKey: string, relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/");
  return (
    normalized.startsWith(`data/validation/${companyKey}/`) ||
    normalized.startsWith(`data/company_source/${companyKey}/`)
  );
}

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ companyKey: string }> },
) {
  try {
    const { companyKey } = await context.params;
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get("path")?.trim();
    const download = searchParams.get("download") === "1";

    if (!relativePath || !isAllowedPath(companyKey, relativePath)) {
      return NextResponse.json({ error: "허용되지 않은 파일 경로입니다." }, { status: 400 });
    }

    const projectRoot = /* turbopackIgnore: true */ process.cwd();
    const resolvedPath = path.resolve(projectRoot, relativePath);
    const normalizedRoot = path.resolve(projectRoot);
    if (!resolvedPath.startsWith(normalizedRoot)) {
      return NextResponse.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
    }

    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "파일이 아닙니다." }, { status: 400 });
    }

    const stream = createReadStream(resolvedPath);
    const headers = new Headers({
      "Content-Type": contentTypeFor(resolvedPath),
      "Content-Length": String(stat.size),
    });

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${path.basename(resolvedPath)}"`);
    }

    logInfo({
      event: "files.open.success",
      route: "/api/companies/[companyKey]/files",
      companyKey,
      detail: relativePath,
      meta: { download },
    });

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "파일을 열지 못했습니다.";
    logError({
      event: "files.open.failed",
      route: "/api/companies/[companyKey]/files",
      detail: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
