import { describe, expect, it, vi, beforeEach } from "vitest";
import { db } from "@/database/db";

const mockUpsert = vi.fn();
const mockFrom = vi.fn();
const mockGte = vi.fn();
const mockGt = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function selectResultBuilder(resolved: { data: unknown[] | null; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    gt: (...args: unknown[]) => {
      mockGt(...args);
      return builder;
    },
    gte: (...args: unknown[]) => {
      mockGte(...args);
      return builder;
    },
    then: (resolve: (value: typeof resolved) => void) => resolve(resolved),
  };
  return builder;
}

// Import after the mock is registered so the engine picks up the fake client.
const { runFullSync } = await import("./syncEngine");

const USER_ID = "user-123";

describe("syncEngine", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.syncTombstones.clear();
    await db.syncState.clear();
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockFrom.mockReset();
    mockGte.mockReset();
    mockGt.mockReset();
  });

  it("backfills syncId/updatedAt onto pre-existing records (created before sync existed) and pushes them", async () => {
    // No syncId/updatedAt at all — matches real data written before the
    // sync feature shipped.
    const localId = await db.transactions.add({
      title: "Old Coffee",
      amount: 80,
      type: "expense",
      account: "Cash",
      date: "2026-07-20",
      status: "completed",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    expect(mockUpsert).toHaveBeenCalled();
    const payload = mockUpsert.mock.calls[0][0];
    const push = payload.find((p: { table_name: string }) => p.table_name === "transactions");
    expect(push).toBeDefined();
    expect(push.data.title).toBe("Old Coffee");

    const stored = await db.transactions.get(localId);
    expect(stored?.syncId).toBeTruthy();
    expect(stored?.updatedAt).toBeTruthy();
  });

  it("pushes local transactions with a syncId to Supabase", async () => {
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    expect(mockUpsert).toHaveBeenCalled();
    const [payload] = mockUpsert.mock.calls[0];
    const transactionPush = payload.find((p: { table_name: string }) => p.table_name === "transactions");
    expect(transactionPush).toMatchObject({
      id: "tx-1",
      table_name: "transactions",
      user_id: USER_ID,
      updated_at: "2026-07-21T00:00:00.000Z",
    });
    expect(transactionPush.data.title).toBe("Coffee");
  });

  it("inserts a new local row for a remote record with no local match", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== "synced_records") throw new Error("unexpected table");
      return {
        upsert: mockUpsert,
        ...selectResultBuilder({
          data: [
            {
              id: "remote-tx-1",
              table_name: "transactions",
              data: {
                title: "Remote Coffee",
                amount: 50,
                type: "expense",
                account: "Cash",
                date: "2026-07-20",
                status: "completed",
                syncId: "remote-tx-1",
                updatedAt: "2026-07-20T00:00:00.000Z",
              },
              updated_at: "2026-07-20T00:00:00.000Z",
              deleted_at: null,
            },
          ],
          error: null,
        }),
      };
    });

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Remote Coffee");
    expect(stored[0].syncId).toBe("remote-tx-1");
  });

  it("updates an existing local row in place when the syncId already exists locally", async () => {
    const localId = await db.transactions.add({
      title: "Old title",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-20",
      status: "completed",
      syncId: "shared-id",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "shared-id",
            table_name: "transactions",
            data: {
              title: "Updated from remote",
              amount: 999,
              type: "expense",
              account: "Cash",
              date: "2026-07-20",
              status: "completed",
              syncId: "shared-id",
              updatedAt: "2026-07-21T00:00:00.000Z",
            },
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      }),
    }));

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(localId);
    expect(stored[0].title).toBe("Updated from remote");
    expect(stored[0].amount).toBe(999);
  });

  it("deletes the local row when the remote record is soft-deleted", async () => {
    await db.transactions.add({
      title: "To be deleted",
      amount: 10,
      type: "expense",
      account: "Cash",
      date: "2026-07-20",
      status: "completed",
      syncId: "deleted-id",
      updatedAt: "2026-07-20T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "deleted-id",
            table_name: "transactions",
            data: {},
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: "2026-07-21T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    }));

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(0);
  });

  it("uses an inclusive (>=) pull cursor so a row sharing the last-seen updatedAt isn't silently skipped forever", async () => {
    // Two local rows stamped in the same backfill pass can end up with the
    // exact same updatedAt (millisecond resolution). A strict `>` cursor on
    // the next pull would then permanently exclude anything else carrying
    // that same boundary timestamp, even a row that legitimately arrives
    // later. `>=` re-fetches the boundary row(s) too — harmless, since
    // applying an already-applied row is idempotent.
    await db.syncState.put({ key: "pull:transactions", value: "2026-07-21T00:00:00.000Z" });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    expect(mockGte).toHaveBeenCalledWith("updated_at", "2026-07-21T00:00:00.000Z");
    expect(mockGt).not.toHaveBeenCalled();
  });

  it("applies two remote rows that share the exact same updatedAt in one pull", async () => {
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "shared-ts-1",
            table_name: "transactions",
            data: {
              title: "First",
              amount: 10,
              type: "expense",
              account: "Cash",
              date: "2026-07-21",
              status: "completed",
              syncId: "shared-ts-1",
              updatedAt: "2026-07-21T00:00:00.000Z",
            },
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: null,
          },
          {
            id: "shared-ts-2",
            table_name: "transactions",
            data: {
              title: "Second",
              amount: 20,
              type: "expense",
              account: "Cash",
              date: "2026-07-21",
              status: "completed",
              syncId: "shared-ts-2",
              updatedAt: "2026-07-21T00:00:00.000Z",
            },
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      }),
    }));

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored.map((t) => t.title).sort()).toEqual(["First", "Second"]);
  });

  it("still pushes tombstones (and reports an error) even when an earlier table's push fails", async () => {
    // A flaky connection failing one table's push shouldn't block every
    // step that comes after it in the same pass — most importantly,
    // deletions (tombstones), which otherwise would never reach the other
    // device even on a later, fully-successful sync.
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "tx-1",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    await db.syncTombstones.add({
      table: "todos",
      syncId: "deleted-todo",
      deletedAt: "2026-07-21T00:00:00.000Z",
    });

    mockUpsert.mockImplementation((payload: Array<{ table_name: string; deleted_at: string | null }>) => {
      const isTransactionsPush = payload.some((p) => p.table_name === "transactions" && p.deleted_at === null);
      return Promise.resolve(isTransactionsPush ? { error: { message: "network blip" } } : { error: null });
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await expect(runFullSync(USER_ID)).rejects.toBeTruthy();

    const tombstonePush = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string }) => p.id === "deleted-todo");
    expect(tombstonePush).toBeDefined();
    expect(await db.syncTombstones.toArray()).toHaveLength(0);
  });

  it("pushes and clears local tombstones after a successful sync", async () => {
    await db.syncTombstones.add({
      table: "transactions",
      syncId: "removed-locally",
      deletedAt: "2026-07-21T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    expect(mockUpsert).toHaveBeenCalled();
    const tombstonePush = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string }) => p.id === "removed-locally");
    expect(tombstonePush).toMatchObject({ deleted_at: "2026-07-21T00:00:00.000Z" });

    expect(await db.syncTombstones.toArray()).toHaveLength(0);
  });
});
