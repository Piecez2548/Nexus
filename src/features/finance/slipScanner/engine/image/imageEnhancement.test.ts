import { describe, expect, it } from "vitest";

import { enhancementFilterString, isEnhancementNeeded, planEnhancements } from "./imageEnhancement";

describe("planEnhancements", () => {
  it("leaves a healthy image untouched (no processing needed)", () => {
    const plan = planEnhancements({ brightness: 128, contrast: 60 });
    expect(plan.brightness).toBe(1);
    expect(plan.contrast).toBe(1);
    expect(plan.sharpen).toBe(false);
    expect(isEnhancementNeeded(plan)).toBe(false);
  });

  it("brightens a dark image and dims a blown-out one", () => {
    expect(planEnhancements({ brightness: 50, contrast: 60 }).brightness).toBe(1.4);
    expect(planEnhancements({ brightness: 220, contrast: 60 }).brightness).toBe(0.8);
  });

  it("boosts contrast and sharpens a very low-contrast image", () => {
    const low = planEnhancements({ brightness: 128, contrast: 30 });
    expect(low.contrast).toBe(1.5);
    expect(low.sharpen).toBe(false);

    const veryLow = planEnhancements({ brightness: 128, contrast: 20 });
    expect(veryLow.sharpen).toBe(true);
    expect(isEnhancementNeeded(veryLow)).toBe(true);
  });
});

describe("enhancementFilterString", () => {
  it("builds a canvas filter string for the tonal corrections", () => {
    expect(enhancementFilterString({ grayscale: true, brightness: 1.4, contrast: 1.5, sharpen: false })).toBe(
      "grayscale(1) brightness(1.4) contrast(1.5)",
    );
    expect(enhancementFilterString({ grayscale: true, brightness: 1, contrast: 1, sharpen: false })).toBe("grayscale(1)");
  });
});
