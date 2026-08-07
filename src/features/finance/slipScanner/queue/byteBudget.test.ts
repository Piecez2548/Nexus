import { describe, expect, it } from "vitest";

import { ByteBudget } from "./byteBudget";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("ByteBudget", () => {
  it("grants immediately while budget remains, and blocks once exhausted until released", async () => {
    const budget = new ByteBudget(100);
    await budget.acquire(40);
    await budget.acquire(40); // 80 used, 20 free

    let granted = false;
    const pending = budget.acquire(40).then(() => {
      granted = true;
    });
    await tick();
    expect(granted).toBe(false); // 40 > 20 free → parked

    budget.release(40); // 60 free → the parked 40 fits
    await pending;
    expect(granted).toBe(true);
  });

  it("clamps an oversized request to the budget so it can never deadlock", async () => {
    const budget = new ByteBudget(100);
    await budget.acquire(1_000); // clamped to 100 → granted, budget now empty

    let next = false;
    const pending = budget.acquire(10).then(() => {
      next = true;
    });
    await tick();
    expect(next).toBe(false);

    budget.release(1_000); // clamped release restores 100
    await pending;
    expect(next).toBe(true);
  });
});
