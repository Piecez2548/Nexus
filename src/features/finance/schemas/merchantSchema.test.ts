import { describe, expect, it } from "vitest";
import { merchantSchema } from "./merchantSchema";

const t = (key: string) => key;

const validMerchant = {
  name: "Starbucks",
  category: "Food",
  icon: "coffee",
};

describe("merchantSchema", () => {
  it("accepts a valid merchant", () => {
    expect(merchantSchema(t).safeParse(validMerchant).success).toBe(true);
  });

  it("accepts a merchant with no icon", () => {
    const { icon: _icon, ...rest } = validMerchant;
    expect(merchantSchema(t).safeParse(rest).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = merchantSchema(t).safeParse({ ...validMerchant, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty category", () => {
    const result = merchantSchema(t).safeParse({ ...validMerchant, category: "" });
    expect(result.success).toBe(false);
  });
});
