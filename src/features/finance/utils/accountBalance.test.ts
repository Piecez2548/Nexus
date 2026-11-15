import { describe, expect, it } from "vitest";

import { calculateAccountBalances } from "@/features/finance/utils/accountBalance";
import type { Account, Transaction } from "@/features/finance/types";

const base = { icon: "wallet", color: "#000" };
const cash = { ...base, name: "Cash", type: "cash", openingBalance: 100 } as Account;
const bank = { ...base, name: "Bank", type: "bank" } as Account;
const card = { ...base, name: "Card", type: "credit_card", openingBalance: 500 } as Account;

function tx(partial: Partial<Transaction>): Transaction {
  return {
    title: "t",
    amount: 0,
    type: "expense",
    account: "Cash",
    date: "2026-10-01",
    ...partial,
  } as Transaction;
}

describe("calculateAccountBalances", () => {
  it("starts from the opening balance, defaulting to 0", () => {
    const result = calculateAccountBalances([cash, bank], []);
    expect(result.get("Cash")?.balance).toBe(100);
    expect(result.get("Bank")?.balance).toBe(0);
  });

  it("applies income, expense and refund", () => {
    const result = calculateAccountBalances(
      [cash],
      [
        tx({ type: "income", amount: 50 }),
        tx({ type: "expense", amount: 30 }),
        tx({ type: "refund", amount: 10 }),
      ],
    );
    expect(result.get("Cash")?.balance).toBe(130);
  });

  it("moves money between accounts on transfer", () => {
    const result = calculateAccountBalances(
      [cash, bank],
      [tx({ type: "transfer", amount: 40, toAccount: "Bank" })],
    );
    expect(result.get("Cash")?.balance).toBe(60);
    expect(result.get("Bank")?.balance).toBe(40);
  });

  it("ignores adjustment, pending and unknown accounts", () => {
    const result = calculateAccountBalances(
      [cash],
      [
        tx({ type: "adjustment", amount: 999 }),
        tx({ type: "income", amount: 999, status: "pending" }),
        tx({ type: "income", amount: 999, account: "Ghost" }),
      ],
    );
    expect(result.get("Cash")?.balance).toBe(100);
  });

  it("tracks amount owed for liability accounts", () => {
    const result = calculateAccountBalances(
      [card],
      [
        tx({ type: "expense", amount: 200, account: "Card" }),
        tx({ type: "income", amount: 100, account: "Card" }),
      ],
    );
    expect(result.get("Card")?.owed).toBe(600);
  });

  it("returns null owed for asset accounts", () => {
    expect(calculateAccountBalances([cash], []).get("Cash")?.owed).toBeNull();
  });
});
