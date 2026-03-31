import { promises as fs } from "node:fs";
import path from "node:path";

import { SOURCE_DEFINITIONS, SourceDefinition, SourceKey, getSourceDefinition } from "@/lib/shared/source-registry";

const DATA_ROOT = path.join(process.cwd(), "data", "company_source");
const COMPANY_KEY_PATTERN = /^[a-z0-9_]+$/;
const MONTH_TOKEN_PATTERN = /^\d{6}$/;

export type SavedSourceFile = {
  name: string;
  relativePath: string;
  size: number;
  updatedAt: string;
};

export type UploadEvent = {
  uploadId: string;
  uploadSessionId: string;
  sourceKey: SourceKey;
  category: "general" | "monthly";
  companyKey: string;
  runId: string | null;
  monthToken: string | null;
  originalFilename: string;
  savedPath: string;
  uploadedAt: string;
  size: number;
};

export type CompanySourceItem = {
  sourceKey: SourceKey;
  label: string;
  category: "general" | "monthly";
  supportsMonthlyUpload: boolean;
  exists: boolean;
  latestUploadedAt: string | null;
  targetPath: string;
  files: SavedSourceFile[];
  lastUpload: UploadEvent | null;
};

type SourceUploadIndex = {
  companyKey: string;
  updatedAt: string;
  uploads: UploadEvent[];
};

export function assertValidCompanyKey(companyKey: string): void {
  if (!COMPANY_KEY_PATTERN.test(companyKey)) {
    throw new Error("Invalid company_key format.");
  }
}

export function normalizeMonthToken(rawValue: string | null | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const digitsOnly = rawValue.replace(/\D/g, "");
  if (digitsOnly.length !== 6 || !MONTH_TOKEN_PATTERN.test(digitsOnly)) {
    return null;
  }

  const month = Number(digitsOnly.slice(4, 6));
  if (month < 1 || month > 12) {
    return null;
  }

  return digitsOnly;
}

function companyRoot(companyKey: string): string {
  return path.join(DATA_ROOT, companyKey);
}

function monthlyRawRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "monthly_raw");
}

function onboardingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_onboarding");
}

function uploadIndexPath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "source_upload_index.json");
}

function toPosixRelativePath(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).split(path.sep).join("/");
}

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

function createUploadId(): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate()
  ).padStart(2, "0")}_${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(
    2,
    "0"
  )}${String(now.getUTCSeconds()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8);
  return `upload_${stamp}_${rand}`;
}

function sanitizeFilename(filename: string): string {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  return safe.length > 0 ? safe : "upload.bin";
}

function extensionFromName(filename: string): string {
  const ext = path.extname(filename);
  return ext.length > 0 ? ext : ".bin";
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(targetPath: string): Promise<SavedSourceFile[]> {
  if (!(await fileExists(targetPath))) {
    return [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const files: SavedSourceFile[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    const stat = await fs.stat(absolutePath);
    files.push({
      name: entry.name,
      relativePath: toPosixRelativePath(absolutePath),
      size: stat.size,
      updatedAt: stat.mtime.toISOString()
    });
  }

  return files.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function matchesSourceFile(definition: SourceDefinition, relativePath: string): boolean {
  const normalized = relativePath.split("\\").join("/").toLowerCase();
  const basename = path.basename(normalized);
  return basename.startsWith(definition.filenameBase.toLowerCase());
}

function latestUploadedAt(files: SavedSourceFile[]): string | null {
  return files[0]?.updatedAt ?? null;
}

function generalSourceTargetPath(companyKey: string, definition: SourceDefinition, originalName: string): string {
  const extension = extensionFromName(originalName);
  return path.join(companyRoot(companyKey), definition.folder, `${definition.filenameBase}${extension}`);
}

function monthlySourceTargetPath(
  companyKey: string,
  definition: SourceDefinition,
  monthToken: string,
  originalName: string
): string {
  const extension = extensionFromName(originalName);
  return path.join(
    monthlyRawRoot(companyKey),
    monthToken,
    `${definition.filenameBase}${extension}`
  );
}

async function readUploadIndex(companyKey: string): Promise<SourceUploadIndex> {
  const targetPath = uploadIndexPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return {
      companyKey,
      updatedAt: new Date(0).toISOString(),
      uploads: []
    };
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as SourceUploadIndex;
}

async function writeUploadIndex(companyKey: string, uploads: UploadEvent[]): Promise<void> {
  await ensureDir(onboardingRoot(companyKey));
  const payload: SourceUploadIndex = {
    companyKey,
    updatedAt: new Date().toISOString(),
    uploads: uploads.sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt))
  };
  await fs.writeFile(uploadIndexPath(companyKey), JSON.stringify(payload, null, 2), "utf8");
}

async function appendUploadEvent(companyKey: string, event: UploadEvent): Promise<void> {
  const current = await readUploadIndex(companyKey);
  current.uploads.unshift(event);
  await writeUploadIndex(companyKey, current.uploads);
}

export async function saveGeneralSourceUpload(input: {
  companyKey: string;
  sourceKey: string;
  filename: string;
  content: ArrayBuffer;
  uploadSessionId?: string | null;
  runId?: string | null;
}): Promise<{ saved: true; sourceKey: SourceKey; targetPath: string; uploadId: string; uploadSessionId: string }> {
  assertValidCompanyKey(input.companyKey);

  const definition = getSourceDefinition(input.sourceKey);
  if (!definition) {
    throw new Error("Unsupported source_key.");
  }

  const targetPath = generalSourceTargetPath(input.companyKey, definition, input.filename);
  await ensureDir(path.dirname(targetPath));
  const buffer = Buffer.from(input.content);
  await fs.writeFile(targetPath, buffer);

  const uploadSessionId = input.uploadSessionId?.trim() || `session_${input.companyKey}`;
  const uploadId = createUploadId();
  await appendUploadEvent(input.companyKey, {
    uploadId,
    uploadSessionId,
    sourceKey: definition.sourceKey,
    category: "general",
    companyKey: input.companyKey,
    runId: input.runId?.trim() || null,
    monthToken: null,
    originalFilename: input.filename,
    savedPath: toPosixRelativePath(targetPath),
    uploadedAt: new Date().toISOString(),
    size: buffer.byteLength
  });

  return {
    saved: true,
    sourceKey: definition.sourceKey,
    targetPath: toPosixRelativePath(targetPath),
    uploadId,
    uploadSessionId
  };
}

export async function saveMonthlySourceUpload(input: {
  companyKey: string;
  sourceKey: string;
  monthToken: string;
  filename: string;
  content: ArrayBuffer;
  uploadSessionId?: string | null;
  runId?: string | null;
}): Promise<{
  saved: true;
  sourceKey: SourceKey;
  monthToken: string;
  targetPath: string;
  uploadId: string;
  uploadSessionId: string;
}> {
  assertValidCompanyKey(input.companyKey);

  const definition = getSourceDefinition(input.sourceKey);
  if (!definition) {
    throw new Error("Unsupported source_key.");
  }

  if (!definition.supportsMonthlyUpload) {
    throw new Error("This source does not support monthly upload.");
  }

  const normalizedMonthToken = normalizeMonthToken(input.monthToken);
  if (!normalizedMonthToken) {
    throw new Error("Invalid month_token format.");
  }

  const targetPath = monthlySourceTargetPath(
    input.companyKey,
    definition,
    normalizedMonthToken,
    input.filename
  );

  await ensureDir(path.dirname(targetPath));
  const buffer = Buffer.from(input.content);
  await fs.writeFile(targetPath, buffer);

  const uploadSessionId = input.uploadSessionId?.trim() || `session_${input.companyKey}`;
  const uploadId = createUploadId();
  await appendUploadEvent(input.companyKey, {
    uploadId,
    uploadSessionId,
    sourceKey: definition.sourceKey,
    category: "monthly",
    companyKey: input.companyKey,
    runId: input.runId?.trim() || null,
    monthToken: normalizedMonthToken,
    originalFilename: input.filename,
    savedPath: toPosixRelativePath(targetPath),
    uploadedAt: new Date().toISOString(),
    size: buffer.byteLength
  });

  return {
    saved: true,
    sourceKey: definition.sourceKey,
    monthToken: normalizedMonthToken,
    targetPath: toPosixRelativePath(targetPath),
    uploadId,
    uploadSessionId
  };
}

export async function listCompanySources(companyKey: string): Promise<{
  companyKey: string;
  items: CompanySourceItem[];
}> {
  assertValidCompanyKey(companyKey);
  const uploadIndex = await readUploadIndex(companyKey);

  const items = await Promise.all(
    SOURCE_DEFINITIONS.map(async (definition) => {
      const sourceRoot = path.join(companyRoot(companyKey), definition.folder);
      const generalFiles = (await collectFiles(sourceRoot)).filter((file) => matchesSourceFile(definition, file.relativePath));
      const monthlyFiles = definition.supportsMonthlyUpload
        ? (await collectFiles(monthlyRawRoot(companyKey))).filter((file) => matchesSourceFile(definition, file.relativePath))
        : [];
      const files = [...generalFiles, ...monthlyFiles].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const hasMonthlyFiles = monthlyFiles.length > 0;
      const hasGeneralFiles = generalFiles.length > 0;
      const lastUpload = uploadIndex.uploads.find((upload) => upload.sourceKey === definition.sourceKey) ?? null;

      return {
        sourceKey: definition.sourceKey,
        label: definition.label,
        category: hasMonthlyFiles && !hasGeneralFiles ? "monthly" : "general",
        supportsMonthlyUpload: definition.supportsMonthlyUpload,
        exists: files.length > 0,
        latestUploadedAt: latestUploadedAt(files),
        targetPath: toPosixRelativePath(sourceRoot),
        files,
        lastUpload
      } satisfies CompanySourceItem;
    })
  );

  return {
    companyKey,
    items
  };
}
