import { describe, expect, it } from "vitest";
import { transactionsToCsv, parseTransactionsCsv } from "./transactionCsv";
import type { Transaction } from "@/features/finance/types";

describe("transactionsToCsv", () => {
  it("writes a header row plus one row per transaction", () => {
    const transactions: Transaction[] = [
      {
        title: "Coffee",
        amount: 58,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      },
    ];

    const csv = transactionsToCsv(transactions);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe("date,title,type,category,account,toAccount,amount,tags,note,recipient");
    // Leading apostrophe forces Excel to treat the date as literal text
    // instead of auto-converting it to a date serial number (see
    // forceTextForExcel) — parseTransactionsCsv strips it back off.
    expect(lines[1]).toBe("'2026-07-21,Coffee,expense,Food,Cash,,58,,,");
  });

  it("quotes fields containing commas or quotes", () => {
    const transactions: Transaction[] = [
      {
        title: 'Lunch, "special"',
        amount: 100,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      },
    ];

    const csv = transactionsToCsv(transactions);
    expect(csv).toContain('"Lunch, ""special"""');
  });
});

describe("parseTransactionsCsv", () => {
  it("round-trips data written by transactionsToCsv", () => {
    const transactions: Transaction[] = [
      {
        title: "Coffee",
        amount: 58,
        type: "expense",
        category: "Food",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
        tags: ["essential", "work"],
      },
    ];

    const csv = transactionsToCsv(transactions);
    const { valid, errors } = parseTransactionsCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      title: "Coffee",
      amount: 58,
      type: "expense",
      category: "Food",
      account: "Cash",
      date: "2026-07-21",
      tags: ["essential", "work"],
    });
  });

  it("collects a row error for an invalid amount instead of throwing", () => {
    const csv = [
      "date,title,type,category,account,toAccount,amount,status,tags,note,recipient",
      "2026-07-21,Coffee,expense,Food,Cash,,not-a-number,completed,,,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(valid).toHaveLength(0);
    expect(errors).toEqual([{ row: 2, message: "Invalid amount" }]);
  });

  it("collects a row error for a missing required field", () => {
    const csv = [
      "date,title,type,category,account,toAccount,amount,status,tags,note,recipient",
      "2026-07-21,,expense,Food,Cash,,100,completed,,,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(2);
  });

  it("processes valid rows even when other rows in the same file fail", () => {
    const csv = [
      "date,title,type,category,account,toAccount,amount,status,tags,note,recipient",
      "2026-07-21,Coffee,expense,Food,Cash,,58,completed,,,",
      "2026-07-22,Broken,expense,Food,Cash,,bad,completed,,,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(valid).toHaveLength(1);
    expect(valid[0].title).toBe("Coffee");
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
  });

  it("returns nothing for an empty file", () => {
    expect(parseTransactionsCsv("")).toEqual({ valid: [], errors: [] });
  });

  it("imports a CSV with no status column at all (the current export format), defaulting status to completed", () => {
    const csv = [
      "date,title,type,category,account,toAccount,amount,tags,note,recipient",
      "2026-07-21,Coffee,expense,Food,Cash,,58,,,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid[0].status).toBe("completed");
  });

  it("strips a leading apostrophe from the date field (Excel's force-text marker)", () => {
    const csv = [
      "date,title,type,category,account,toAccount,amount,status,tags,note,recipient",
      "'2026-07-21,Coffee,expense,Food,Cash,,58,completed,,,",
    ].join("\n");

    const { valid, errors } = parseTransactionsCsv(csv);

    expect(errors).toHaveLength(0);
    expect(valid[0].date).toBe("2026-07-21");
  });
});
