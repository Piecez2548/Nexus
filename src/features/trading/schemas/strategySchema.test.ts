import { describe, expect, it } from "vitest";
import { strategySchema } from "./strategySchema";

const t = (key: string) => key;

const validStrategy = {
  name: "Breakout",
  description: "Trade breakouts of key levels",
  market: "forex",
  entryRules: "Wait for a close above resistance",
  exitRules: "Exit at the next resistance level",
  riskManagementNotes: "Risk max 1% per trade",
  tags: ["momentum"],
};

describe("strategySchema", () => {
  it("accepts a fully-filled strategy", () => {
    expect(strategySchema(t).safeParse(validStrategy).success).toBe(true);
  });

  it("accepts a strategy with only a name", () => {
    expect(strategySchema(t).safeParse({ name: "Breakout" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = strategySchema(t).safeParse({ ...validStrategy, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid market value", () => {
    const result = strategySchema(t).safeParse({ ...validStrategy, market: "not-a-real-market" });
    expect(result.success).toBe(false);
  });
});
