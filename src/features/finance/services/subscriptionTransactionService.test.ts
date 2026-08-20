import { describe, expect, it, vi } from "vitest";

import { generateDueTransactions } from "./subscriptionTransactionService";
import type { Subscription } from "@/features/finance/types";

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    name: "Netflix",
    amount: 419,
    billingFrequency: "monthly",
    nextBillingDate: "2026-08-20",
    status: "active",
    account: "Bank",
    icon: "film",
    color: "#dc2626",
    createdAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

const TODAY = new Date(2026, 7, 18); // 2026-08-18

describe("generateDueTransactions", () => {
  it("generates nothing for a subscription not yet due", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [subscription({ nextBillingDate: "2026-09-01" })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(result).toEqual({ transactionCount: 0, subscriptionCount: 0 });
    expect(addTransaction).not.toHaveBeenCalled();
    expect(updateSubscription).not.toHaveBeenCalled();
  });

  it("generates exactly one transaction for a subscription due today and advances nextBillingDate", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [subscription({ nextBillingDate: "2026-08-18" })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(result).toEqual({ transactionCount: 1, subscriptionCount: 1 });
    expect(addTransaction).toHaveBeenCalledTimes(1);
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Netflix", amount: 419, type: "expense", account: "Bank", date: "2026-08-18" })
    );
    expect(addTransaction.mock.calls[0][0].recurring).toBeUndefined();
    expect(updateSubscription).toHaveBeenCalledWith(1, expect.objectContaining({ nextBillingDate: "2026-09-18" }));
  });

  it("catches up on multiple missed monthly cycles, one transaction per cycle", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [subscription({ nextBillingDate: "2026-05-18" })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    // May 18 -> Jun 18 -> Jul 18 -> Aug 18 (still <= today) -> next is Sep 18 (stop).
    expect(result).toEqual({ transactionCount: 4, subscriptionCount: 1 });
    expect(addTransaction).toHaveBeenCalledTimes(4);
    expect(addTransaction.mock.calls.map((call) => call[0].date)).toEqual([
      "2026-05-18",
      "2026-06-18",
      "2026-07-18",
      "2026-08-18",
    ]);
  });

  it("caps catch-up generation at 12 cycles for a very stale subscription", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [subscription({ nextBillingDate: "2020-01-18", billingFrequency: "monthly" })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(result.transactionCount).toBe(12);
  });

  it("skips a subscription with no account set", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [subscription({ nextBillingDate: "2026-08-18", account: undefined })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(result).toEqual({ transactionCount: 0, subscriptionCount: 0 });
    expect(addTransaction).not.toHaveBeenCalled();
  });

  it("skips paused and cancelled subscriptions even when due", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    const result = await generateDueTransactions(
      [
        subscription({ id: 1, status: "paused", nextBillingDate: "2026-08-18" }),
        subscription({ id: 2, status: "cancelled", nextBillingDate: "2026-08-18" }),
      ],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(result).toEqual({ transactionCount: 0, subscriptionCount: 0 });
    expect(addTransaction).not.toHaveBeenCalled();
  });

  // Regression: nextBillingDate used to be advanced+persisted *after*
  // creating the transaction. updateSubscription() isn't atomic with its
  // own DB write (its real implementation cancels/reschedules a native
  // reminder first, which can fail independently) -- a failure there used
  // to leave a transaction already created but nextBillingDate still stuck
  // on the same due cycle, recreating the same transaction again on every
  // future run. Persisting first means a failure here costs a missed
  // transaction, never a duplicated one.
  it("does not create a transaction for a cycle whose nextBillingDate advance failed to persist", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn().mockRejectedValue(new Error("native reminder-cancel failed"));

    await expect(
      generateDueTransactions([subscription({ nextBillingDate: "2026-08-18" })], addTransaction, updateSubscription, TODAY)
    ).rejects.toThrow("native reminder-cancel failed");

    expect(addTransaction).not.toHaveBeenCalled();
  });

  it("persists the advanced nextBillingDate before creating the cycle's transaction", async () => {
    const callOrder: string[] = [];
    const addTransaction = vi.fn(async () => {
      callOrder.push("addTransaction");
    });
    const updateSubscription = vi.fn(async () => {
      callOrder.push("updateSubscription");
    });

    await generateDueTransactions([subscription({ nextBillingDate: "2026-08-18" })], addTransaction, updateSubscription, TODAY);

    expect(callOrder).toEqual(["updateSubscription", "addTransaction"]);
  });

  // Regression (BUG-12): the catch-up loop used to re-derive the billing
  // day from each cycle's own (possibly already-clamped) nextBillingDate,
  // permanently rebasing a subscription billed on the 31st down to the
  // 28th the first time it crossed February and never recovering.
  describe("billing anchor preservation (BUG-12)", () => {
    it("threads a single fixed anchor through every catch-up cycle for a subscription with no stored anchor (a legacy record)", async () => {
      const addTransaction = vi.fn();
      const updateSubscription = vi.fn();

      const result = await generateDueTransactions(
        [subscription({ nextBillingDate: "2026-01-31", billingAnchorDay: undefined })],
        addTransaction,
        updateSubscription,
        TODAY
      );

      // Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31 -> Jun 30 -> Jul 31
      // -> Aug 31 (first occurrence past "today", Aug 18 -- loop stops).
      expect(result.transactionCount).toBe(7);
      const dueDates = addTransaction.mock.calls.map((call) => call[0].date);
      expect(dueDates).toEqual([
        "2026-01-31",
        "2026-02-28",
        "2026-03-31", // recovered the 31st, not stuck at 28
        "2026-04-30",
        "2026-05-31",
        "2026-06-30",
        "2026-07-31",
      ]);

      const lastUpdate = updateSubscription.mock.calls.at(-1)![1];
      expect(lastUpdate.nextBillingDate).toBe("2026-08-31");
      // Backfilled onto every write, including the first -- a legacy
      // subscription that passes through this service even once now
      // permanently remembers its true billing day.
      expect(updateSubscription.mock.calls.every((call) => call[1].billingAnchorDay === 31)).toBe(true);
    });

    it("respects an already-stored billingAnchorDay instead of re-deriving it from the current (already-clamped) nextBillingDate", async () => {
      const addTransaction = vi.fn();
      const updateSubscription = vi.fn();

      const result = await generateDueTransactions(
        [subscription({ nextBillingDate: "2026-02-28", billingAnchorDay: 31 })],
        addTransaction,
        updateSubscription,
        TODAY
      );

      expect(result.transactionCount).toBe(6);
      const dueDates = addTransaction.mock.calls.map((call) => call[0].date);
      expect(dueDates).toEqual(["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31", "2026-06-30", "2026-07-31"]);
      expect(updateSubscription.mock.calls.every((call) => call[1].billingAnchorDay === 31)).toBe(true);
    });

    it("backfills billingAnchorDay onto the persisted write even for a trivial single-cycle advance with no clamping involved", async () => {
      const addTransaction = vi.fn();
      const updateSubscription = vi.fn();

      await generateDueTransactions(
        [subscription({ nextBillingDate: "2026-08-01", billingAnchorDay: undefined })],
        addTransaction,
        updateSubscription,
        TODAY
      );

      expect(updateSubscription).toHaveBeenCalledWith(1, expect.objectContaining({ billingAnchorDay: 1 }));
    });
  });

  it("is idempotent when re-run against the already-advanced nextBillingDate", async () => {
    const addTransaction = vi.fn();
    const updateSubscription = vi.fn();

    await generateDueTransactions([subscription({ nextBillingDate: "2026-08-18" })], addTransaction, updateSubscription, TODAY);
    const advancedDate = updateSubscription.mock.calls[0][1].nextBillingDate;

    addTransaction.mockClear();
    updateSubscription.mockClear();

    const secondResult = await generateDueTransactions(
      [subscription({ nextBillingDate: advancedDate })],
      addTransaction,
      updateSubscription,
      TODAY
    );

    expect(secondResult).toEqual({ transactionCount: 0, subscriptionCount: 0 });
    expect(addTransaction).not.toHaveBeenCalled();
  });
});
