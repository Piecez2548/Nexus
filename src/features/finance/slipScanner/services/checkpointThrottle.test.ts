import { describe, expect, it } from "vitest";

import { createCheckpointThrottle } from "./checkpointThrottle";

describe("createCheckpointThrottle", () => {
  it("flushes on the very first call", () => {
    const throttle = createCheckpointThrottle(1000, 10);
    expect(throttle.shouldFlush()).toBe(true);
  });

  it("flushes again once the item count threshold is reached", () => {
    let t = 0;
    const throttle = createCheckpointThrottle(1_000_000, 3, () => t);
    expect(throttle.shouldFlush()).toBe(true); // 1st call always flushes
    expect(throttle.shouldFlush()).toBe(false); // 2nd since flush
    expect(throttle.shouldFlush()).toBe(false); // 3rd since flush... wait, count resets each flush
    expect(throttle.shouldFlush()).toBe(true); // 3 calls since the last flush -> flush
  });

  it("flushes once the time interval has elapsed, even with few items", () => {
    let t = 0;
    const throttle = createCheckpointThrottle(100, 1000, () => t);
    expect(throttle.shouldFlush()).toBe(true); // 1st call
    t = 50;
    expect(throttle.shouldFlush()).toBe(false); // not enough time or items yet
    t = 150;
    expect(throttle.shouldFlush()).toBe(true); // 100ms elapsed since last flush
  });

  it("never goes silent forever — whichever threshold comes first still fires", () => {
    let t = 0;
    const throttle = createCheckpointThrottle(50, 5, () => t);
    let flushes = 0;
    for (let i = 0; i < 20; i++) {
      t += 10; // 10ms per item
      if (throttle.shouldFlush()) flushes++;
    }
    expect(flushes).toBeGreaterThan(0);
    expect(flushes).toBeLessThan(20); // genuinely coalesced, not a no-op
  });
});
