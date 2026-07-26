import { describe, expect, it } from "vitest";
import { transactionSchema } from "./transactionSchema";

const validExpense = {
  title: "Coffee",
  amount: 120,
  type: "expense" as const,
  category: "Food",
  account: "Cash",
  date: "2026-07-21",
  status: "completed" as const,
};

describe("transactionSchema", () => {
  it("accepts a valid expense", () => {
    const result = transactionSchema.safeParse(validExpense);
    expect(result.success).toBe(true);
  });

  it("accepts an optional note", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      note: "with a friend",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero amount", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      amount: -50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric amount", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      amount: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      type: "not-a-real-type",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      status: "archived",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a transaction with no status at all (the form no longer collects one)", () => {
    const { status: _status, ...withoutStatus } = validExpense;
    const result = transactionSchema.safeParse(withoutStatus);
    expect(result.success).toBe(true);
  });

  it("rejects an empty account", () => {
    const result = transactionSchema.safeParse({
      ...validExpense,
      account: "",
    });
    expect(result.success).toBe(false);
  });

  describe("category requirement", () => {
    it("requires a category for expense", () => {
      const result = transactionSchema.safeParse({
        ...validExpense,
        category: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("requires a category for income", () => {
      const result = transactionSchema.safeParse({
        ...validExpense,
        type: "income",
        category: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("does not require a category for transfer", () => {
      const result = transactionSchema.safeParse({
        title: "Move money",
        amount: 500,
        type: "transfer",
        account: "Cash",
        toAccount: "Bank",
        date: "2026-07-21",
        status: "completed",
      });
      expect(result.success).toBe(true);
    });

    it("does not require a category for adjustment", () => {
      const result = transactionSchema.safeParse({
        title: "Balance correction",
        amount: 10,
        type: "adjustment",
        account: "Cash",
        date: "2026-07-21",
        status: "completed",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("transfer rules", () => {
    const validTransfer = {
      title: "Move money",
      amount: 500,
      type: "transfer" as const,
      account: "Cash",
      toAccount: "Bank",
      date: "2026-07-21",
      status: "completed" as const,
    };

    it("accepts a valid transfer", () => {
      expect(transactionSchema.safeParse(validTransfer).success).toBe(true);
    });

    it("rejects a transfer with no destination account", () => {
      const result = transactionSchema.safeParse({
        ...validTransfer,
        toAccount: undefined,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a transfer where source and destination are the same", () => {
      const result = transactionSchema.safeParse({
        ...validTransfer,
        toAccount: "Cash",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("optional metadata fields", () => {
    it("accepts tags, time, and attachment", () => {
      const result = transactionSchema.safeParse({
        ...validExpense,
        time: "14:30",
        tags: ["essential", "work"],
        attachment: "data:image/png;base64,abc123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a recurring frequency", () => {
      const result = transactionSchema.safeParse({
        ...validExpense,
        recurring: { frequency: "monthly" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid recurring frequency", () => {
      const result = transactionSchema.safeParse({
        ...validExpense,
        recurring: { frequency: "hourly" },
      });
      expect(result.success).toBe(false);
    });
  });
});
