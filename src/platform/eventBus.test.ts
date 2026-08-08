import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "./eventBus";

describe("createEventBus", () => {
  it("delivers published events to subscribers of that type", async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.subscribe("slip:imported", handler);

    await bus.publish("slip:imported", { count: 3 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ type: "slip:imported", payload: { count: 3 } });
  });

  it("invokes handlers in priority order (highest first) and awaits async ones", async () => {
    const bus = createEventBus();
    const order: string[] = [];
    bus.subscribe("e", async () => {
      await Promise.resolve();
      order.push("low");
    }, { priority: 1 });
    bus.subscribe("e", () => void order.push("high"), { priority: 10 });

    await bus.publish("e");
    expect(order).toEqual(["high", "low"]);
  });

  it("supports wildcard subscribers and unsubscribe", async () => {
    const bus = createEventBus();
    const all = vi.fn();
    const off = bus.subscribe("*", all);
    await bus.publish("a");
    off();
    await bus.publish("b");
    expect(all).toHaveBeenCalledTimes(1);
  });

  it("keeps a bounded history and replays it to a new subscriber", async () => {
    const bus = createEventBus();
    await bus.publish("x", 1);
    await bus.publish("x", 2);
    await bus.publish("y", 3);

    const replayed: unknown[] = [];
    bus.replay("x", (e) => void replayed.push(e.payload));
    expect(replayed).toEqual([1, 2]);
    expect(bus.history("x")).toHaveLength(2);
  });

  it("isolates a throwing handler from the rest", async () => {
    const bus = createEventBus();
    const ok = vi.fn();
    bus.subscribe("e", () => {
      throw new Error("boom");
    }, { priority: 10 });
    bus.subscribe("e", ok, { priority: 1 });

    await expect(bus.publish("e")).resolves.toBeUndefined();
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
