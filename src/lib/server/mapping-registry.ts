import { promises as fs } from "node:fs";
import path from "node:path";

import type { SourceKey } from "@/lib/source-registry";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");

export type SourceMappingRegistryEntry = {
  source_key: SourceKey;
  updated_at: string;
  normalized_header_to_column: Record<string, string>;
  canonical_headers: Record<string, string>;
  derived_columns: string[];
};

export type ColumnMappingRegistry = {
  company_key: string;
  updated_at: string;
  source_mappings: Partial<Record<SourceKey, SourceMappingRegistryEntry>>;
};

function companyRoot(companyKey: string): string {
  return path.join(COMPANY_SOURCE_ROOT, companyKey);
}

function onboardingRoot(companyKey: string): string {
  return path.join(companyRoot(companyKey), "_onboarding");
}

function registryPath(companyKey: string): string {
  return path.join(onboardingRoot(companyKey), "column_mapping_registry.json");
}

function normalizeHeaderName(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s()_\-./]+/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomically(targetPath: string, payload: unknown): Promise<void> {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(payload, null, 2), "utf8");
  await fs.rm(targetPath, { force: true });
  await fs.rename(tempPath, targetPath);
}

function emptyRegistry(companyKey: string): ColumnMappingRegistry {
  return {
    company_key: companyKey,
    updated_at: new Date(0).toISOString(),
    source_mappings: {}
  };
}

export async function readColumnMappingRegistry(companyKey: string): Promise<ColumnMappingRegistry> {
  const targetPath = registryPath(companyKey);
  if (!(await fileExists(targetPath))) {
    return emptyRegistry(companyKey);
  }

  const raw = await fs.readFile(targetPath, "utf8");
  return JSON.parse(raw) as ColumnMappingRegistry;
}

export function findMappedHeaderFromRegistry(
  headers: string[],
  semanticColumn: string,
  sourceEntry?: SourceMappingRegistryEntry
): string | null {
  if (!sourceEntry) {
    return null;
  }

  const canonicalHeader = sourceEntry.canonical_headers[semanticColumn];
  if (canonicalHeader) {
    const matchedCanonical =
      headers.find((header) => normalizeHeaderName(header) === normalizeHeaderName(canonicalHeader)) ?? null;
    if (matchedCanonical) {
      return matchedCanonical;
    }
  }

  const mappedHeader =
    headers.find((header) => sourceEntry.normalized_header_to_column[normalizeHeaderName(header)] === semanticColumn) ?? null;

  return mappedHeader;
}

export async function upsertSourceMappingRegistry(input: {
  companyKey: string;
  sourceKey: SourceKey;
  matchedColumns: Record<string, string | null>;
  derivedColumns?: string[];
}): Promise<void> {
  const registry = await readColumnMappingRegistry(input.companyKey);
  const existingEntry = registry.source_mappings[input.sourceKey];
  const normalizedHeaderToColumn = { ...(existingEntry?.normalized_header_to_column ?? {}) };
  const canonicalHeaders = { ...(existingEntry?.canonical_headers ?? {}) };
  const derivedColumns = new Set<string>([...(existingEntry?.derived_columns ?? []), ...(input.derivedColumns ?? [])]);

  for (const [semanticColumn, matchedHeader] of Object.entries(input.matchedColumns)) {
    if (!matchedHeader || matchedHeader.startsWith("derived_from_")) {
      continue;
    }

    normalizedHeaderToColumn[normalizeHeaderName(matchedHeader)] = semanticColumn;
    canonicalHeaders[semanticColumn] = matchedHeader;
  }

  const updatedAt = new Date().toISOString();
  registry.source_mappings[input.sourceKey] = {
    source_key: input.sourceKey,
    updated_at: updatedAt,
    normalized_header_to_column: normalizedHeaderToColumn,
    canonical_headers: canonicalHeaders,
    derived_columns: [...derivedColumns].sort()
  };
  registry.updated_at = updatedAt;

  await ensureDir(onboardingRoot(input.companyKey));
  await writeJsonAtomically(registryPath(input.companyKey), registry);
}
