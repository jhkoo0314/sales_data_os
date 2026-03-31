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

function parseDelimitedRows(raw: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };

  const pushRow = () => {
    pushCell();
    const hasAnyValue = row.some((value) => value.length > 0);
    if (hasAnyValue) {
      rows.push(row);
    }
    row = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index];
    const next = raw[index + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushCell();
      continue;
    }

    if (!inQuotes && ch === "\n") {
      pushRow();
      continue;
    }

    if (!inQuotes && ch === "\r") {
      if (next === "\n") {
        index += 1;
      }
      pushRow();
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows;
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
    const delimiter = detectDelimiter(firstLine);
    const parsedRows = parseDelimitedRows(raw, delimiter);
    const headerRow = parsedRows[0] ?? [];

    return headerRow
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
    const firstLine = raw.split(/\r?\n/, 1)[0] ?? "";
    if (!firstLine) {
      return { headers: [], rows: [], selectedSheet: null };
    }

    const delimiter = detectDelimiter(firstLine);
    const parsedRows = parseDelimitedRows(raw, delimiter);
    if (parsedRows.length === 0) {
      return { headers: [], rows: [], selectedSheet: null };
    }

    const headers = (parsedRows[0] ?? []).map((header) => header.trim());
    const rows = parsedRows.slice(1).map((values) => {
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
