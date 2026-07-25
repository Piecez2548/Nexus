import { describe, expect, it } from "vitest";
import { buildTransactionsPdf } from "./transactionPdf";
import type { Transaction } from "@/features/finance/types";

describe("buildTransactionsPdf", () => {
  it("builds a PDF document without throwing for an empty list", async () => {
    const doc = await buildTransactionsPdf([]);
    expect(doc.output("datauristring")).toContain("data:application/pdf");
  });

  it("builds a PDF document containing transaction rows", async () => {
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

    const doc = await buildTransactionsPdf(transactions);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
