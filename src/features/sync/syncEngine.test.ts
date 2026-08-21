import { describe, expect, it, vi, beforeEach } from "vitest";
import { db } from "@/database/db";
import { useTransactionStore } from "@/features/finance/store/transactionStore";
import { useHabitStore } from "@/features/habits/store/habitStore";

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

// Mirrors real Supabase behaviour: a pullTable() query is always scoped to
// one table via `.eq("table_name", table)`, so a test's fixture rows must
// only surface for the table they actually name. Tests here only ever
// verify assertions against "transactions" (or "vaultEntries" for the one
// opaque-blob test covering it), but every SYNCED_TABLES entry pulls once
// per pass — without this filter, a fixture row meant for one table would
// leak into every other table's pull too and get written into the wrong
// Dexie table entirely.
//
// A `.in(...)` call distinguishes pushTable's own pre-push tombstone-check
// query (checks whether any syncId about to be pushed is already deleted
// server-side) from a normal pullTable query — the two are structurally
// different queries against the same `synced_records` table, and every
// test's fixture `resolved` data describes the *pull* shape only. Defaults
// to "no existing tombstone found" so all of the many tests that don't care
// about this new query keep passing unchanged; only tests specifically
// covering the resurrection race pass a real tombstoneCheck fixture.
function selectResultBuilder(
  resolved: { data: unknown[] | null; error: unknown },
  tombstoneCheck: { data: unknown[] | null; error: unknown } = { data: [], error: null }
) {
  let tableFilter: string | undefined;
  let isTombstoneCheckQuery = false;
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: string) => {
      if (column === "table_name") tableFilter = value;
      return builder;
    }),
    order: vi.fn(() => builder),
    in: vi.fn(() => {
      isTombstoneCheckQuery = true;
      return builder;
    }),
    not: vi.fn(() => builder),
    gt: (...args: unknown[]) => {
      mockGt(...args);
      return builder;
    },
    gte: (...args: unknown[]) => {
      mockGte(...args);
      return builder;
    },
    then: (resolve: (value: { data: unknown[] | null; error: unknown }) => void) => {
      if (isTombstoneCheckQuery) {
        resolve(tombstoneCheck);
        return;
      }
      const data =
        resolved.data === null
          ? null
          : resolved.data.filter((row) => (row as { table_name?: string }).table_name === tableFilter);
      resolve({ ...resolved, data });
    },
  };
  return builder;
}

// Import after the mock is registered so the engine picks up the fake client.
const { runFullSync } = await import("./syncEngine");

const USER_ID = "user-123";

describe("syncEngine", () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.vaultEntries.clear();
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

  it("marks a table's backfill complete after a pass finds zero unstamped rows, so a later pass doesn't re-scan it", async () => {
    await db.transactions.add({
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
    expect(await db.syncState.get("backfill:transactions:complete")).toMatchObject({ value: "true" });

    // A row added *after* the flag was already set (a raw Dexie add, same
    // "no syncId at all" shape as the row above) would have been picked up
    // by the old always-scan behavior -- the flag existing proves the scan
    // is genuinely skipped now, not just that the first pass worked.
    const laterLocalId = await db.transactions.add({
      title: "Later, unrelated row",
      amount: 20,
      type: "expense",
      account: "Cash",
      date: "2026-07-22",
    });

    await runFullSync(USER_ID);

    const stillUnstamped = await db.transactions.get(laterLocalId);
    expect(stillUnstamped?.syncId).toBeUndefined();
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

  it("does not let an older remote copy clobber a newer local edit (last-write-wins guard)", async () => {
    // Simulates this device's own push for this table having failed
    // earlier in the same pass (or a rare cross-device race) — the local
    // row is genuinely newer than what's coming back from the pull.
    const localId = await db.transactions.add({
      title: "Local edit (newer)",
      amount: 500,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "stale-remote-id",
      updatedAt: "2026-07-21T12:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "stale-remote-id",
            table_name: "transactions",
            data: {
              title: "Stale remote copy",
              amount: 999,
              type: "expense",
              account: "Cash",
              date: "2026-07-20",
              status: "completed",
              syncId: "stale-remote-id",
              updatedAt: "2026-07-20T00:00:00.000Z",
            },
            updated_at: "2026-07-20T00:00:00.000Z",
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
    expect(stored[0].title).toBe("Local edit (newer)");
    expect(stored[0].amount).toBe(500);
  });

  it("skips a malformed remote row (data is not an object) without throwing", async () => {
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "malformed-1",
            table_name: "transactions",
            data: null,
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      }),
    }));

    await expect(runFullSync(USER_ID)).resolves.not.toThrow();

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(0);
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

  it("does not resurrect a row deleted locally mid-pass, before its tombstone has reached the server", async () => {
    // Simulates the user deleting a habit while a sync pass is already
    // mid-flight: after this same pass's own pushTombstones() step already
    // ran (so the deletion hasn't reached the server yet), but before this
    // same pass's own pull step for "habits" runs. The tombstone is recorded
    // as a side effect of the "habits" pull query resolving — the earliest
    // point this deletion could realistically land mid-pass — rather than
    // before runFullSync starts, since pushTombstones() would otherwise
    // already have pushed and cleared it before any pull ever sees it.
    await db.habits.clear();

    mockFrom.mockImplementation(() => {
      let currentTableName: string | undefined;
      let isInQuery = false;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          if (column === "table_name") currentTableName = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        in: vi.fn(() => {
          isInQuery = true;
          return builder;
        }),
        not: vi.fn(() => builder),
        gte: (...args: unknown[]) => {
          mockGte(...args);
          return builder;
        },
        upsert: mockUpsert,
        then: async (resolve: (value: { data: unknown[]; error: null }) => void) => {
          // pushTable's own pre-push tombstone-check query (see
          // selectResultBuilder's comment above) -- always "no existing
          // tombstone found" here, this test isn't about that race.
          if (isInQuery) {
            resolve({ data: [], error: null });
            return;
          }

          if (currentTableName !== "habits") {
            resolve({ data: [], error: null });
            return;
          }

          await db.syncTombstones.add({
            table: "habits",
            syncId: "deleted-mid-pass",
            deletedAt: "2026-07-21T00:00:05.000Z",
          });

          resolve({
            data: [
              {
                id: "deleted-mid-pass",
                table_name: "habits",
                data: {
                  name: "Exercise",
                  frequency: "daily",
                  completedDates: [],
                  syncId: "deleted-mid-pass",
                  updatedAt: "2026-07-21T00:00:00.000Z",
                },
                updated_at: "2026-07-21T00:00:00.000Z",
                deleted_at: null,
              },
            ],
            error: null,
          });
        },
      };

      return builder;
    });

    await runFullSync(USER_ID);

    const stored = await db.habits.toArray();
    expect(stored.find((h) => h.syncId === "deleted-mid-pass")).toBeUndefined();
  });

  it("does not resurrect a row already deleted by another device that this device hasn't pulled yet", async () => {
    // Regression: pushTable used to hardcode deleted_at: null on every
    // pushed row unconditionally. Device A deletes a row and its tombstone
    // reaches the server; before Device B (this device) ever pulls that
    // deletion, B independently edits its own stale local copy and pushes
    // it — the old code would silently clobber A's tombstone with B's
    // stale edit, resurrecting the row on both devices' next pull.
    await db.transactions.add({
      title: "Edited on device B, unaware it was deleted on device A",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "deleted-on-a",
      updatedAt: "2026-07-21T10:00:00.000Z", // before A's deletion
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder(
        { data: [], error: null },
        {
          data: [{ id: "deleted-on-a", deleted_at: "2026-07-21T11:00:00.000Z" }], // A's deletion, after B's edit
          error: null,
        }
      ),
    }));

    await runFullSync(USER_ID);

    // Must never have pushed a live (deleted_at: null) row for this syncId.
    const resurrectingPush = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string; deleted_at: string | null }) => p.id === "deleted-on-a" && p.deleted_at === null);
    expect(resurrectingPush).toBeUndefined();

    // The stale local copy is removed too, mirroring what pullTable already
    // does for a tombstone it discovers -- otherwise this row could never
    // successfully push on any future pass either.
    const stored = await db.transactions.toArray();
    expect(stored.find((t) => t.syncId === "deleted-on-a")).toBeUndefined();
  });

  it("still pushes a local edit that is genuinely newer than an existing server-side tombstone (an intentional undelete)", async () => {
    await db.transactions.add({
      title: "Re-added after the deletion",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "undeleted",
      updatedAt: "2026-07-21T12:00:00.000Z", // after the tombstone below
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder(
        { data: [], error: null },
        { data: [{ id: "undeleted", deleted_at: "2026-07-21T11:00:00.000Z" }], error: null }
      ),
    }));

    await runFullSync(USER_ID);

    const push = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string; table_name: string }) => p.id === "undeleted" && p.table_name === "transactions");
    expect(push).toMatchObject({ deleted_at: null });

    const stored = await db.transactions.toArray();
    expect(stored.find((t) => t.syncId === "undeleted")).toBeDefined();
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

  it("folds duplicate local rows sharing the same syncId down to the oldest one", async () => {
    // Simulates the aftermath of two overlapping sync passes (e.g. a manual
    // "Sync Now" racing the periodic background sync) each inserting their
    // own copy of the same remote record, since syncId has no unique
    // constraint at the Dexie schema level.
    const firstId = await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "dup-1",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "dup-1",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(firstId);
  });

  it("dedupes local duplicates before pushing, so a single upsert batch never proposes the same (id, table_name) twice", async () => {
    // Deduping only after pull (as it used to) doesn't help here: if a
    // duplicate syncId is already sitting locally when a pass starts, the
    // very first push of that pass would still send both copies in one
    // upsert batch — which Postgres rejects outright with "ON CONFLICT DO
    // UPDATE command cannot affect row a second time," failing every sync
    // attempt forever, since dedup never gets a chance to run first.
    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "dup-push",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    await db.transactions.add({
      title: "Coffee",
      amount: 100,
      type: "expense",
      account: "Cash",
      date: "2026-07-21",
      status: "completed",
      syncId: "dup-push",
      updatedAt: "2026-07-21T00:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const transactionPushes = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .filter((p: { table_name: string; id: string }) => p.table_name === "transactions" && p.id === "dup-push");

    expect(transactionPushes).toHaveLength(1);
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

  it("dedupes tombstones sharing the same (table, syncId) before pushing, keeping the latest", async () => {
    // recordTombstone() now guards against creating duplicates going
    // forward, but older duplicates (e.g. from before that guard existed,
    // or the same item deleted twice across sessions) could still be
    // sitting locally. Pushing both in one combined upsert batch is exactly
    // what triggers Postgres's "ON CONFLICT DO UPDATE command cannot affect
    // row a second time" — this is what broke sync in production.
    await db.syncTombstones.bulkAdd([
      { table: "habits", syncId: "dup-tombstone", deletedAt: "2026-07-20T00:00:00.000Z" },
      { table: "habits", syncId: "dup-tombstone", deletedAt: "2026-07-21T00:00:00.000Z" },
    ]);

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const tombstonePushes = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .filter((p: { id: string; table_name: string }) => p.id === "dup-tombstone" && p.table_name === "habits");

    expect(tombstonePushes).toHaveLength(1);
    expect(tombstonePushes[0]).toMatchObject({ deleted_at: "2026-07-21T00:00:00.000Z" });
    expect(await db.syncTombstones.toArray()).toHaveLength(0);
  });

  it("treats an encrypted-shaped row as an opaque blob on both push and pull, never inspecting its content", async () => {
    // Pins the invariant the encryption-at-rest feature depends on: the sync
    // engine only ever reads syncId/updatedAt at the top level and forwards
    // everything else (here, an AES-GCM envelope) completely opaquely — see
    // encryptedRepository.ts and the "Key design" section of the encryption
    // plan. A future change to this file must not start assuming more about
    // row shape than that.
    const envelope = { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "c3VwZXItc2VjcmV0LWNpcGhlcnRleHQ=" };

    await db.transactions.add({
      syncId: "enc-1",
      updatedAt: "2026-07-21T00:00:00.000Z",
      encryptedContent: envelope,
    } as never);

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "enc-2",
            table_name: "transactions",
            data: {
              syncId: "enc-2",
              updatedAt: "2026-07-21T00:00:00.000Z",
              encryptedContent: envelope,
            },
            updated_at: "2026-07-21T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      }),
    }));

    await runFullSync(USER_ID);

    const [payload] = mockUpsert.mock.calls[0];
    const push = payload.find(
      (p: { table_name: string; id: string }) => p.table_name === "transactions" && p.id === "enc-1"
    );
    expect(push.data.encryptedContent).toEqual(envelope);
    expect(push.data.title).toBeUndefined();

    const stored = await db.transactions.toArray();
    const pulled = stored.find((t) => t.syncId === "enc-2") as unknown as
      | { encryptedContent?: unknown; title?: string }
      | undefined;
    expect(pulled?.encryptedContent).toEqual(envelope);
    expect(pulled?.title).toBeUndefined();
  });

  it("syncs vaultEntries through the same generic opaque-blob path as every other table", async () => {
    // vaultEntries has no Vault-specific sync code (see syncEngine.ts's
    // SYNCED_TABLES/STORE_REFRESHERS entries) -- this pins that it actually
    // participates via the same mechanism the test above proves is safe for
    // encrypted content in general, not just that it's listed in the array.
    const envelope = { v: 1, iv: "AAAAAAAAAAAAAAAA", ct: "dmF1bHQtc2VjcmV0LWNpcGhlcnRleHQ=" };

    await db.vaultEntries.add({
      syncId: "vault-enc-1",
      updatedAt: "2026-08-17T00:00:00.000Z",
      encryptedContent: envelope,
    } as never);

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    // vaultEntries pushes in its own upsert call, separate from every other
    // table's -- unlike the "transactions" example above (SYNCED_TABLES'
    // first entry, always mockUpsert's first call), vaultEntries is pushed
    // last, so this searches every call rather than assuming calls[0].
    const push = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { table_name: string; id: string }) => p.table_name === "vaultEntries" && p.id === "vault-enc-1");
    expect(push.data.encryptedContent).toEqual(envelope);
    expect(push.data.title).toBeUndefined();
  });

  it("pushes and pulls strategies, watchlistItems, and economicEvents through the same generic path as every other table (Deeper Trading Analytics tables)", async () => {
    await db.strategies.add({ name: "Breakout Pro", syncId: "strat-push-1", updatedAt: "2026-08-21T00:00:00.000Z" } as never);
    await db.watchlistItems.add({ symbol: "AAPL", market: "stocks", syncId: "watch-push-1", updatedAt: "2026-08-21T00:00:00.000Z" } as never);
    await db.economicEvents.add({ title: "FOMC Meeting", eventDate: "2099-01-15", syncId: "event-push-1", updatedAt: "2026-08-21T00:00:00.000Z" } as never);

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({
        data: [
          {
            id: "strat-pull-1",
            table_name: "strategies",
            data: { name: "Reversal", syncId: "strat-pull-1", updatedAt: "2026-08-21T00:00:00.000Z" },
            updated_at: "2026-08-21T00:00:00.000Z",
            deleted_at: null,
          },
          {
            id: "watch-pull-1",
            table_name: "watchlistItems",
            data: { symbol: "TSLA", market: "stocks", syncId: "watch-pull-1", updatedAt: "2026-08-21T00:00:00.000Z" },
            updated_at: "2026-08-21T00:00:00.000Z",
            deleted_at: null,
          },
          {
            id: "event-pull-1",
            table_name: "economicEvents",
            data: { title: "Rate Decision", eventDate: "2099-02-01", syncId: "event-pull-1", updatedAt: "2026-08-21T00:00:00.000Z" },
            updated_at: "2026-08-21T00:00:00.000Z",
            deleted_at: null,
          },
        ],
        error: null,
      }),
    }));

    await runFullSync(USER_ID);

    const pushed = mockUpsert.mock.calls.flatMap((call) => call[0]);
    expect(pushed.find((p: { table_name: string; id: string }) => p.table_name === "strategies" && p.id === "strat-push-1")).toBeDefined();
    expect(pushed.find((p: { table_name: string; id: string }) => p.table_name === "watchlistItems" && p.id === "watch-push-1")).toBeDefined();
    expect(pushed.find((p: { table_name: string; id: string }) => p.table_name === "economicEvents" && p.id === "event-push-1")).toBeDefined();

    const pulledStrategy = (await db.strategies.toArray()).find((s) => s.syncId === "strat-pull-1");
    expect(pulledStrategy).toMatchObject({ name: "Reversal" });

    const pulledWatchlistItem = (await db.watchlistItems.toArray()).find((w) => w.syncId === "watch-pull-1");
    expect(pulledWatchlistItem).toMatchObject({ symbol: "TSLA" });

    const pulledEvent = (await db.economicEvents.toArray()).find((e) => e.syncId === "event-pull-1");
    expect(pulledEvent).toMatchObject({ title: "Rate Decision" });
  });

  it("does not reload any store when a pass pulls no data and dedupes nothing", async () => {
    // A fast periodic sync (e.g. every 5s) means most passes have nothing
    // new at all — reloading (and re-rendering every subscriber of) all 12
    // stores regardless is what made the app feel janky.
    const loadTransactions = vi.spyOn(useTransactionStore.getState(), "loadTransactions");
    const loadHabits = vi.spyOn(useHabitStore.getState(), "loadHabits");

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    expect(loadTransactions).not.toHaveBeenCalled();
    expect(loadHabits).not.toHaveBeenCalled();

    loadTransactions.mockRestore();
    loadHabits.mockRestore();
  });

  it("only reloads the store(s) whose table actually received pulled data", async () => {
    await db.habits.clear();

    const loadTransactions = vi.spyOn(useTransactionStore.getState(), "loadTransactions");
    const loadHabits = vi.spyOn(useHabitStore.getState(), "loadHabits");

    mockFrom.mockImplementation(() => {
      let currentTableName: string | undefined;
      let isInQuery = false;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          if (column === "table_name") currentTableName = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        in: vi.fn(() => {
          isInQuery = true;
          return builder;
        }),
        not: vi.fn(() => builder),
        gte: (...args: unknown[]) => {
          mockGte(...args);
          return builder;
        },
        upsert: mockUpsert,
        then: (resolve: (value: { data: unknown[]; error: null }) => void) => {
          if (isInQuery) {
            resolve({ data: [], error: null });
            return;
          }

          if (currentTableName !== "habits") {
            resolve({ data: [], error: null });
            return;
          }

          resolve({
            data: [
              {
                id: "remote-habit-1",
                table_name: "habits",
                data: {
                  name: "Exercise",
                  frequency: "daily",
                  completedDates: [],
                  syncId: "remote-habit-1",
                  updatedAt: "2026-07-21T00:00:00.000Z",
                },
                updated_at: "2026-07-21T00:00:00.000Z",
                deleted_at: null,
              },
            ],
            error: null,
          });
        },
      };

      return builder;
    });

    await runFullSync(USER_ID);

    expect(loadHabits).toHaveBeenCalled();
    expect(loadTransactions).not.toHaveBeenCalled();

    loadTransactions.mockRestore();
    loadHabits.mockRestore();
  });

  it("does not re-push a row it only ever received via pull, even across multiple later passes", async () => {
    // Simulates the "edit reverts / delete doesn't stick" bug reported when
    // two devices are open at once: this device (call it Device B) pulls a
    // row another device edited, but never edits it locally itself. Without
    // advancing this device's own push cursor to account for the pull, its
    // next pass would see this row as "due to push" (updatedAt newer than
    // its stale push cursor) and redundantly re-push its own now-identical
    // copy — harmless in isolation, except if the OTHER device edits or
    // deletes that same row again in the gap before this device's next
    // push, this device's redundant push would silently clobber it, since
    // the upsert replaces the whole row unconditionally.
    let currentTableName: string | undefined;

    mockFrom.mockImplementation(() => {
      let isInQuery = false;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          if (column === "table_name") currentTableName = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        in: vi.fn(() => {
          isInQuery = true;
          return builder;
        }),
        not: vi.fn(() => builder),
        gte: (...args: unknown[]) => {
          mockGte(...args);
          return builder;
        },
        upsert: mockUpsert,
        then: (resolve: (value: { data: unknown[]; error: null }) => void) => {
          if (isInQuery) {
            resolve({ data: [], error: null });
            return;
          }

          if (currentTableName !== "transactions") {
            resolve({ data: [], error: null });
            return;
          }

          resolve({
            data: [
              {
                id: "other-device-tx",
                table_name: "transactions",
                data: {
                  title: "Coffee",
                  amount: 100,
                  type: "expense",
                  account: "Cash",
                  date: "2026-07-20",
                  status: "completed",
                  syncId: "other-device-tx",
                  updatedAt: "2026-07-20T00:00:00.000Z",
                },
                updated_at: "2026-07-20T00:00:00.000Z",
                deleted_at: null,
              },
            ],
            error: null,
          });
        },
      };

      return builder;
    });

    await runFullSync(USER_ID);

    const stored = await db.transactions.toArray();
    expect(stored.find((t) => t.syncId === "other-device-tx")).toBeDefined();

    // Nothing changed locally or on the "server" since pass 1 — a second
    // (and third) pass should never propose pushing this row again.
    mockUpsert.mockClear();
    await runFullSync(USER_ID);
    await runFullSync(USER_ID);

    const rePush = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string; table_name: string }) => p.id === "other-device-tx" && p.table_name === "transactions");
    expect(rePush).toBeUndefined();
  });

  it("still pushes an unrelated not-yet-pushed local row whose updatedAt is earlier than a row just pulled from another device", async () => {
    // Reproduces a real two-device bug: pulling another device's row nudges
    // this device's OWN push cursor forward to that row's updatedAt (see the
    // "does not re-push a row it only ever received via pull" test above,
    // and pullTable's "nudged" comment) so the pulled row isn't redundantly
    // re-pushed next pass. But that nudge is a single per-table watermark —
    // it can't distinguish "this specific row is now in sync" from
    // "everything with an earlier updatedAt is already pushed". If this
    // device also has its own local, never-yet-pushed row whose updatedAt
    // happens to be *earlier* than the row just pulled here — e.g. it was
    // written moments before the other device's row arrived mid-pass, after
    // this same pass's own push step for "transactions" already ran but
    // before this same pass's pull step (the earliest point such a write
    // could realistically land, same reasoning as the mid-pass-deletion test
    // above) — the nudge must not silently move the push cursor past it too,
    // or it would be permanently excluded from every future push (the
    // cursor only ever advances) with no error ever thrown.
    let currentTableName: string | undefined;

    mockFrom.mockImplementation(() => {
      let isInQuery = false;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          if (column === "table_name") currentTableName = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        in: vi.fn(() => {
          isInQuery = true;
          return builder;
        }),
        not: vi.fn(() => builder),
        gte: (...args: unknown[]) => {
          mockGte(...args);
          return builder;
        },
        upsert: mockUpsert,
        then: async (resolve: (value: { data: unknown[]; error: null }) => void) => {
          if (isInQuery) {
            resolve({ data: [], error: null });
            return;
          }

          if (currentTableName !== "transactions") {
            resolve({ data: [], error: null });
            return;
          }

          await db.transactions.add({
            title: "Local not-yet-pushed",
            amount: 42,
            type: "expense",
            account: "Cash",
            date: "2026-07-20",
            status: "completed",
            syncId: "local-only-tx",
            updatedAt: "2026-07-20T11:00:00.000Z",
          });

          resolve({
            data: [
              {
                id: "other-device-tx",
                table_name: "transactions",
                data: {
                  title: "Coffee",
                  amount: 100,
                  type: "expense",
                  account: "Cash",
                  date: "2026-07-20",
                  status: "completed",
                  syncId: "other-device-tx",
                  updatedAt: "2026-07-20T12:00:00.000Z",
                },
                updated_at: "2026-07-20T12:00:00.000Z",
                deleted_at: null,
              },
            ],
            error: null,
          });
        },
      };

      return builder;
    });

    // Pass 1: pushes nothing (transactions table starts empty), then pulls
    // the other device's row — "local-only-tx" lands in Dexie as a side
    // effect of that same pull resolving, simulating the mid-pass race.
    await runFullSync(USER_ID);

    // Pass 2: nothing new from the server this time — isolates whether the
    // push side alone still picks up the local row.
    mockUpsert.mockClear();
    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const pushedLocalRow = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string; table_name: string }) => p.id === "local-only-tx" && p.table_name === "transactions");
    expect(pushedLocalRow).toBeDefined();
  });

  it("repairs a push cursor already corrupted by the old nudge bug, exactly once", async () => {
    // Simulates a device that already has a stuck push:transactions cursor
    // from before the nudge fix shipped — a local row with a valid syncId
    // and an updatedAt earlier than the (corrupted) cursor, which the old
    // pushTable() query (`where("updatedAt").aboveOrEqual(lastPushed)`)
    // would silently skip forever with no error.
    await db.syncState.put({ key: "push:transactions", value: "2026-08-01T00:00:00.000Z" });
    await db.transactions.add({
      title: "Stuck before the fix",
      amount: 60,
      type: "expense",
      account: "Cash",
      date: "2026-07-20",
      status: "completed",
      syncId: "stuck-tx",
      updatedAt: "2026-07-20T11:00:00.000Z",
    });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const pushedStuckRow = mockUpsert.mock.calls
      .flatMap((call) => call[0])
      .find((p: { id: string; table_name: string }) => p.id === "stuck-tx" && p.table_name === "transactions");
    expect(pushedStuckRow).toBeDefined();

    // Second pass must not repeat the repair (and thus not re-clear a
    // legitimately-advanced cursor set by this pass's own successful push).
    const cursorAfterFirstPass = await db.syncState.get("push:transactions");
    mockUpsert.mockClear();

    await runFullSync(USER_ID);

    const cursorAfterSecondPass = await db.syncState.get("push:transactions");
    expect(cursorAfterSecondPass?.value).toBe(cursorAfterFirstPass?.value);
  });

  it("auto-merges name-duplicate categories left by two devices each seeding their own defaults, without a manual button press", async () => {
    // dedupeSyncedTables() only matches by syncId and can't catch this --
    // these are two genuinely different syncIds for the same real-world
    // category ("Food"), the exact scenario dedupeAccountsAndCategories.ts
    // exists for.
    await db.categories.clear();
    const canonicalId = await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });
    await db.categories.add({ name: "Food", type: "expense", icon: "utensils", color: "#ef4444" });

    mockFrom.mockImplementation(() => ({
      upsert: mockUpsert,
      ...selectResultBuilder({ data: [], error: null }),
    }));

    await runFullSync(USER_ID);

    const categories = await db.categories.toArray();
    expect(categories).toHaveLength(1);
    expect(categories[0].id).toBe(canonicalId);
  });
});
