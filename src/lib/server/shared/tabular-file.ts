import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

export type TabularRow = Record<string, string>;
export type ParsedTabularFile = {
  headers: string[];
  rows: TabularRow[];
  selectedSheet: string | null;
};

function detectDelimiter(firstLine: string): string {
  return firstLine.includes("\t") ? "\t" : ",";
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

export function isSupportedTabularFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".csv" || ext === ".xlsx" || ext === ".xls";
}

export function isSpreadsheetFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".xlsx" || ext === ".xls";
}

function normalizeSheetName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function pickSheetName(workbook: XLSX.WorkBook, preferredSheetNames?: string[]): string | null {
  if (workbook.SheetNames.length === 0) {
    return null;
  }

  if (preferredSheetNames && preferredSheetNames.length > 0) {
    const matched =
      workbook.SheetNames.find((sheetName) =>
        preferredSheetNames.some((candidate) => normalizeSheetName(sheetName) === normalizeSheetName(candidate))
      ) ?? null;
    if (matched) {
      return matched;
    }
  }

  return workbook.SheetNames[0] ?? null;
}

export async function readTabularHeaders(filePath: string, preferredSheetNames?: string[]): Promise<string[]> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const raw = await fs.readFile(filePath, "utf8");
    const firstLine = raw.split(/\r?\n/, 1)[0] ?? "";
    if (!firstLine) {
      return [];
    }

    return firstLine
      .split(detectDelimiter(firstLine))
      .map((header) => header.trim())
      .filter(Boolean);
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = pickSheetName(workbook, preferredSheetNames);
    if (!sheetName) {
      return [];
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerRow = rows[0] ?? [];
    return headerRow.map((cell) => normalizeCellValue(cell)).filter(Boolean);
  }

  return [];
}

export async function parseTabularFile(filePath: string, preferredSheetNames?: string[]): Promise<ParsedTabularFile> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [], selectedSheet: null };
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = lines[0].split(delimiter).map((header) => header.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(delimiter);
      return headers.reduce<TabularRow>((acc, header, index) => {
        acc[header] = normalizeCellValue(values[index]);
        return acc;
      }, {});
    });

    return { headers, rows, selectedSheet: null };
  }

  if (ext === ".xlsx" || ext === ".xls") {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = pickSheetName(workbook, preferredSheetNames);
    if (!sheetName) {
      return { headers: [], rows: [], selectedSheet: null };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (rows.length === 0) {
      return { headers: [], rows: [], selectedSheet: sheetName };
    }

    const headers = (rows[0] ?? []).map((cell) => normalizeCellValue(cell));
    const records = rows.slice(1).map((row) =>
      headers.reduce<TabularRow>((acc, header, index) => {
        acc[header] = normalizeCellValue(row[index]);
        return acc;
      }, {})
    );

    return { headers, rows: records, selectedSheet: sheetName };
  }

  return { headers: [], rows: [], selectedSheet: null };
}
