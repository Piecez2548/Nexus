import { describe, expect, it } from "vitest";
import { withSyncMeta, type SyncMeta } from "./syncMeta";

interface TestEntity extends SyncMeta {
  title: string;
  amount?: number;
}

describe("withSyncMeta", () => {
  it("generates a syncId when one isn't already present", () => {
    const result = withSyncMeta<TestEntity>({ title: "Coffee" });
    expect(result.syncId).toBeTruthy();
    expect(result.syncId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("keeps an existing syncId instead of generating a new one", () => {
    const result = withSyncMeta<TestEntity>({ title: "Coffee", syncId: "existing-id" });
    expect(result.syncId).toBe("existing-id");
  });

  it("always refreshes updatedAt to the current time", () => {
    const before = new Date().toISOString();
    const result = withSyncMeta<TestEntity>({ title: "Coffee", updatedAt: "2020-01-01T00:00:00.000Z" });
    expect(new Date(result.updatedAt!).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });

  it("preserves the rest of the entity's fields", () => {
    const result = withSyncMeta<TestEntity>({ title: "Coffee", amount: 120 });
    expect(result.title).toBe("Coffee");
    expect(result.amount).toBe(120);
  });
});
