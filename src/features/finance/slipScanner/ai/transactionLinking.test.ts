import { describe, expect, it } from "vitest";

import { linkTransactions, type LinkableTxn } from "./transactionLinking";

describe("linkTransactions", () => {
  it("links a refund to its original expense", () => {
    const txns: LinkableTxn[] = [
      { id: "e1", type: "expense", merchant: "Shop", amount: 100, date: "2026-08-01" },
      { id: "r1", type: "refund", merchant: "Shop", amount: 100, date: "2026-08-05" },
    ];
    expect(linkTransactions(txns)).toContainEqual({ fromId: "e1", toId: "r1", type: "refund" });
  });

  it("links a transfer to a same-day fee", () => {
    const txns: LinkableTxn[] = [
      { id: "t1", type: "transfer", merchant: "Transfer", amount: 500, date: "2026-08-01" },
      { id: "f1", type: "expense", merchant: "ค่าธรรมเนียม", amount: 10, date: "2026-08-01" },
    ];
    expect(linkTransactions(txns)).toContainEqual({ fromId: "t1", toId: "f1", type: "transfer-fee" });
  });

  it("chains installments (3+ same merchant + amount)", () => {
    const txns: LinkableTxn[] = [
      { id: "i1", type: "expense", merchant: "Phone Co", amount: 999, date: "2026-08-01" },
      { id: "i2", type: "expense", merchant: "Phone Co", amount: 999, date: "2026-09-01" },
      { id: "i3", type: "expense", merchant: "Phone Co", amount: 999, date: "2026-10-01" },
    ];
    const links = linkTransactions(txns).filter((l) => l.type === "installment");
    expect(links).toEqual([
      { fromId: "i1", toId: "i2", type: "installment" },
      { fromId: "i1", toId: "i3", type: "installment" },
    ]);
  });

  it("links same-merchant same-day expenses as a split payment", () => {
    const txns: LinkableTxn[] = [
      { id: "s1", type: "expense", merchant: "Store", amount: 120, date: "2026-08-02" },
      { id: "s2", type: "expense", merchant: "Store", amount: 80, date: "2026-08-02" },
    ];
    expect(linkTransactions(txns)).toContainEqual({ fromId: "s1", toId: "s2", type: "split-payment" });
  });

  it("links a small cashback shortly after an expense", () => {
    const txns: LinkableTxn[] = [
      { id: "e2", type: "expense", merchant: "Shop2", amount: 200, date: "2026-08-01" },
      { id: "c1", type: "income", merchant: "Shop2", amount: 20, date: "2026-08-02" },
    ];
    expect(linkTransactions(txns)).toContainEqual({ fromId: "e2", toId: "c1", type: "cashback" });
  });

  it("returns no links for unrelated transactions", () => {
    const txns: LinkableTxn[] = [
      { id: "a", type: "expense", merchant: "A", amount: 100, date: "2026-08-01" },
      { id: "b", type: "expense", merchant: "B", amount: 250, date: "2026-08-02" },
    ];
    expect(linkTransactions(txns)).toEqual([]);
  });
});
