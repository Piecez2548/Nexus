import { describe, expect, it } from "vitest";
import { accountSchema } from "./accountSchema";

const t = (key: string) => key;

const validAccount = {
  name: "Cash",
  type: "cash" as const,
  icon: "wallet",
  color: "#3b82f6",
};

describe("accountSchema", () => {
  it("accepts a valid account", () => {
    expect(accountSchema(t).safeParse(validAccount).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = accountSchema(t).safeParse({ ...validAccount, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown account type", () => {
    const result = accountSchema(t).safeParse({ ...validAccount, type: "piggy-bank" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing icon", () => {
    const result = accountSchema(t).safeParse({ ...validAccount, icon: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing color", () => {
    const result = accountSchema(t).safeParse({ ...validAccount, color: "" });
    expect(result.success).toBe(false);
  });
});
