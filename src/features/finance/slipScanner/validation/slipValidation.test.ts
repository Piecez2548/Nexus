import { describe, expect, it } from "vitest";

import type { SlipCandidate } from "@/features/finance/slipScanner/models/slipCandidate";

import { validateSlipCandidate, validateSlipCandidates } from "./slipValidation";

const candidate = (over: Partial<SlipCandidate>): SlipCandidate => ({
  id: "x",
  assetId: "x",
  source: "qr",
  isDuplicate: false,
  confidence: 80,
  amount: 100,
  merchant: "Shop",
  date: "2024-05-12",
  ...over,
});

const today = () => "2024-06-01";

describe("validateSlipCandidate", () => {
  it("passes a complete, plausible slip with no issues", () => {
    const result = validateSlipCandidate(candidate({}), { today });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.duplicateProbability).toBe(0.1);
  });

  it("errors (invalid) on a missing or non-positive amount", () => {
    expect(validateSlipCandidate(candidate({ amount: undefined }), { today }).valid).toBe(false);
    const nonPositive = validateSlipCandidate(candidate({ amount: 0 }), { today });
    expect(nonPositive.valid).toBe(false);
    expect(nonPositive.issues.map((i) => i.code)).toContain("amount-non-positive");
  });

  it("warns (but stays valid) on missing merchant, missing date, and a future date", () => {
    const result = validateSlipCandidate(candidate({ merchant: undefined, date: "2999-01-01" }), { today });
    expect(result.valid).toBe(true);
    const codes = result.issues.map((i) => i.code);
    expect(codes).toContain("merchant-missing");
    expect(codes).toContain("date-in-future");
  });

  it("flags a duplicate with a high probability and a warning", () => {
    const result = validateSlipCandidate(candidate({ isDuplicate: true }), { today });
    expect(result.duplicateProbability).toBe(0.9);
    expect(result.issues.map((i) => i.code)).toContain("possible-duplicate");
  });

  it("warns on low confidence", () => {
    const result = validateSlipCandidate(candidate({ confidence: 20 }), { today });
    expect(result.issues.map((i) => i.code)).toContain("low-confidence");
  });

  it("never mutates the candidate it validates", () => {
    const input = candidate({ amount: undefined, isDuplicate: true, confidence: 10 });
    const snapshot = JSON.parse(JSON.stringify(input));
    validateSlipCandidate(input, { today });
    expect(input).toEqual(snapshot);
  });
});

describe("validateSlipCandidates", () => {
  it("validates each candidate by id", () => {
    const results = validateSlipCandidates(
      [candidate({ id: "1" }), candidate({ id: "2", amount: undefined })],
      { today },
    );
    expect(results.get("1")?.valid).toBe(true);
    expect(results.get("2")?.valid).toBe(false);
  });
});
