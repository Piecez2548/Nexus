import { describe, expect, it } from "vitest";
import { getLevel, getXpProgress } from "./leveling";

describe("getLevel", () => {
  it("starts at level 1 with 0 xp", () => {
    expect(getLevel(0)).toBe(1);
  });

  it("stays at level 1 until 100 xp", () => {
    expect(getLevel(99)).toBe(1);
  });

  it("reaches level 2 at exactly 100 xp", () => {
    expect(getLevel(100)).toBe(2);
  });

  it("reaches level 4 at 350 xp", () => {
    expect(getLevel(350)).toBe(4);
  });
});

describe("getXpProgress", () => {
  it("reports progress within the current level", () => {
    const progress = getXpProgress(150);
    expect(progress.level).toBe(2);
    expect(progress.xpIntoLevel).toBe(50);
    expect(progress.xpForNextLevel).toBe(100);
    expect(progress.percentage).toBe(50);
  });

  it("reports 0% right at a level boundary", () => {
    const progress = getXpProgress(200);
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.percentage).toBe(0);
  });
});
