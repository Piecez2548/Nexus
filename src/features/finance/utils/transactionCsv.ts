import { transactionSchema } from "@/features/finance/schemas/transactionSchema";
import { rowsToCsv } from "@/utils/csv";
import type { Transaction } from "@/features/finance/types";

const HEADERS = [
  "date",
  "title",
  "type",
  "category",
  "account",
  "toAccount",
  "amount",
  "status",
  "tags",
  "note",
  "recipient",
];

// A leading apostrophe tells Excel's CSV import to keep the field as literal
// text instead of auto-converting it to a date serial number — without it,
// a plain "2026-07-21" often renders as "#####" once Excel reflows the
// column to its own date format. `parseTransactionsCsv` strips it back off
// on re-import so round-tripping a previously exported file still works.
function forceTextForExcel(value: string): string {
  return `'${value}`;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = transactions.map((t) => [
    forceTextForExcel(t.date),
    t.title,
    t.type,
    t.category ?? "",
    t.account,
    t.toAccount ?? "",
    String(t.amount),
    t.status,
    (t.tags ?? []).join(";"),
    t.note ?? "",
    t.recipient ?? "",
  ]);

  return rowsToCsv([HEADERS, ...rows]);
}

// Minimal RFC4180-style parser: handles quoted fields containing commas,
// newlines, and escaped ("") double quotes.
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface CsvRowError {
  row: number;
  message: string;
}

export interface ParsedTransactionsCsv {
  valid: Transaction[];
  errors: CsvRowError[];
}

export function parseTransactionsCsv(csvText: string): ParsedTransactionsCsv {
  const rows = parseCsvLines(csvText.trim());
  if (rows.length === 0) return { valid: [], errors: [] };

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((h) => h.trim());

  const valid: Transaction[] = [];
  const errors: CsvRowError[] = [];

  dataRows.forEach((cols, index) => {
    const rowNumber = index + 2; // +1 for the header row, +1 for 1-indexing

    const record: Record<string, string> = {};
    headers.forEach((header, colIndex) => {
      record[header] = (cols[colIndex] ?? "").trim();
    });

    const amount = Number(record.amount);

    if (record.amount === "" || Number.isNaN(amount)) {
      errors.push({ row: rowNumber, message: "จำนวนเงินไม่ถูกต้อง" });
      return;
    }

    const candidate = {
      date: record.date.startsWith("'") ? record.date.slice(1) : record.date,
      title: record.title,
      type: record.type,
      category: record.category || undefined,
      account: record.account,
      toAccount: record.toAccount || undefined,
      amount,
      status: record.status || "completed",
      tags: record.tags
        ? record.tags.split(";").map((s) => s.trim()).filter(Boolean)
        : undefined,
      note: record.note || undefined,
      recipient: record.recipient || undefined,
    };

    const result = transactionSchema.safeParse(candidate);

    if (result.success) {
      valid.push(result.data);
    } else {
      const message = result.error.issues.map((issue) => issue.message).join("; ");
      errors.push({ row: rowNumber, message });
    }
  });

  return { valid, errors };
}
