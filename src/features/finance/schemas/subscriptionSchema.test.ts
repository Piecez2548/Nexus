import { describe, expect, it } from "vitest";
import { subscriptionSchema } from "./subscriptionSchema";

const t = (key: string) => key;

const valid = {
  name: "Netflix",
  amount: 419,
  billingFrequency: "monthly",
  nextBillingDate: "2026-08-20",
  status: "active",
  icon: "film",
  color: "#dc2626",
};

describe("subscriptionSchema", () => {
  it("accepts a valid subscription", () => {
    expect(subscriptionSchema(t).safeParse(valid).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects a negative amount", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, amount: -419 }).success).toBe(false);
  });

  it("rejects an empty next billing date", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, nextBillingDate: "" }).success).toBe(false);
  });

  it("rejects a status outside active/paused/cancelled", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, status: "expired" }).success).toBe(false);
  });

  it("rejects a billing frequency outside the known set", () => {
    expect(subscriptionSchema(t).safeParse({ ...valid, billingFrequency: "biweekly" }).success).toBe(false);
  });

  it("accepts every valid status", () => {
    for (const status of ["active", "paused", "cancelled"]) {
      expect(subscriptionSchema(t).safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it("accepts every valid billing frequency", () => {
    for (const billingFrequency of ["daily", "weekly", "monthly", "yearly"]) {
      expect(subscriptionSchema(t).safeParse({ ...valid, billingFrequency }).success).toBe(true);
    }
  });

  it("accepts optional category, account, and note", () => {
    expect(
      subscriptionSchema(t).safeParse({ ...valid, category: "Entertainment", account: "Credit Card", note: "Family plan" })
        .success
    ).toBe(true);
  });

  it("accepts a subscription with no category/account/note at all", () => {
    expect(subscriptionSchema(t).safeParse(valid).success).toBe(true);
  });
});
