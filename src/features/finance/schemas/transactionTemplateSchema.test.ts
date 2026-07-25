import { describe, expect, it } from "vitest";
import { transactionTemplateSchema } from "./transactionTemplateSchema";

const validExpense = {
  name: "Starbucks",
  type: "expense" as const,
  category: "Food",
  account: "Cash",
};

describe("transactionTemplateSchema", () => {
  it("accepts a valid expense template", () => {
    expect(transactionTemplateSchema.safeParse(validExpense).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = transactionTemplateSchema.safeParse({ ...validExpense, name: "" });
    expect(result.success).toBe(false);
  });

  it("requires a category for income/expense templates", () => {
    const result = transactionTemplateSchema.safeParse({ ...validExpense, category: undefined });
    expect(result.success).toBe(false);
  });

  it("requires a destination account for transfer templates", () => {
    const result = transactionTemplateSchema.safeParse({
      name: "Move to savings",
      type: "transfer" as const,
      account: "Cash",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a transfer template with a destination account", () => {
    const result = transactionTemplateSchema.safeParse({
      name: "Move to savings",
      type: "transfer" as const,
      account: "Cash",
      toAccount: "Bank",
    });
    expect(result.success).toBe(true);
  });

  it("does not require an amount", () => {
    expect(transactionTemplateSchema.safeParse(validExpense).success).toBe(true);
  });

  it("rejects a non-positive amount when one is provided", () => {
    const result = transactionTemplateSchema.safeParse({ ...validExpense, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts a positive default amount", () => {
    const result = transactionTemplateSchema.safeParse({ ...validExpense, amount: 65 });
    expect(result.success).toBe(true);
  });
});
