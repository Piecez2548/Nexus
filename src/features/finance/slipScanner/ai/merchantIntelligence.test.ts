import { describe, expect, it } from "vitest";

import { buildMerchantProfiles, merchantKey, normalizeMerchant, type MerchantTxn } from "./merchantIntelligence";

describe("normalizeMerchant / merchantKey", () => {
  it("normalises casing/punctuation and keys on the brand token", () => {
    expect(normalizeMerchant("  STARBUCKS!! ")).toBe("starbucks");
    expect(merchantKey("Starbucks Siam Paragon")).toBe("starbucks");
  });
});

describe("buildMerchantProfiles", () => {
  const txns: MerchantTxn[] = [
    { merchant: "Starbucks Siam", amount: 120, date: "2026-08-01" },
    { merchant: "STARBUCKS Central", amount: 130, date: "2026-08-03" },
    { merchant: "starbucks", amount: 110, date: "2026-08-02" },
    { merchant: "Grab", amount: 80, date: "2026-08-04" },
  ];

  it("merges a chain across aliases/locations and computes frequency + totals", () => {
    const profiles = buildMerchantProfiles(txns);
    const starbucks = profiles.find((p) => p.key === "starbucks")!;
    expect(starbucks.count).toBe(3);
    expect(starbucks.total).toBe(360);
    expect(starbucks.average).toBe(120);
    expect(starbucks.isChain).toBe(true);
    expect(starbucks.aliases).toHaveLength(3);
    expect(starbucks.firstSeen).toBe("2026-08-01");
    expect(starbucks.lastSeen).toBe("2026-08-03");
  });

  it("keeps distinct merchants separate and sorts by frequency", () => {
    const profiles = buildMerchantProfiles(txns);
    expect(profiles.map((p) => p.key)).toEqual(["starbucks", "grab"]); // starbucks (3) before grab (1)
    const grab = profiles.find((p) => p.key === "grab")!;
    expect(grab.isChain).toBe(false);
    expect(grab.count).toBe(1);
  });

  it("skips empty merchant names", () => {
    expect(buildMerchantProfiles([{ merchant: "   ", amount: 10 }])).toEqual([]);
  });
});
