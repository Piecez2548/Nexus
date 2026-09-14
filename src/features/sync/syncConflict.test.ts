import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/database/db";
import { transactionRepository } from "@/features/finance/repositories/transactionRepository";
import type { Transaction } from "@/features/finance/types";
import { useAppLockStore } from "@/store/appLockStore";
import { useEncryptionSessionStore } from "@/features/encryption/store/encryptionSessionStore";
import { generateDek } from "@/features/encryption/crypto/encryption";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabaseClient", () => ({ isSyncConfigured: true, supabase: { from } }));
const { runFullSync } = await import("./syncEngine");

type RemoteRow = {
  id: string;
  table_name: string;
  user_id: string;
  data: Record<string, unknown>;
  updated_at: string;
  deleted_at: string | null;
};
type QueryResult = { data: RemoteRow[] | null; error: Error | null };
type Phase = "preflight" | "pull" | "write";
const USER = "conflict-fixture-user";
const baseTime = Date.parse("2026-09-12T00:00:00.000Z");
const at = (seconds: number) => vi.setSystemTime(baseTime + seconds * 1000);
const draft = (title: string, amount = 100): Transaction => ({ title, amount, type: "expense", account: "Cash", date: "2026-09-12", status: "completed" });

// Deliberately models the checked-in SQL trigger: server timestamps advance
// independently of device clocks, an existing tombstone is terminal, and an
// older live payload cannot overwrite a newer live payload.
// This is a relay simulation, not a live Postgres/RLS or network-stack test.
function createRelay() {
  const cloud = new Map<string, RemoteRow>();
  let serverTick = Date.parse("2026-09-12T12:00:00.000Z");
  const state = {
    unavailable: false,
    fail: (_phase: Phase, _table: string) => false,
    loseNextWriteAck: false,
    beforeWrite: null as null | ((rows: RemoteRow[]) => void),
    writes: [] as RemoteRow[][],
  };
  const failure = new Error("Synthetic provider outage");
  function commit(payload: RemoteRow[]) {
    const serverTime = new Date(++serverTick).toISOString();
    for (const incoming of payload) {
      const key = `${incoming.table_name}:${incoming.id}`;
      const old = cloud.get(key);
      const row = structuredClone(incoming);
      if (old?.deleted_at && !row.deleted_at) {
        row.data = structuredClone(old.data);
        row.deleted_at = old.deleted_at;
      } else if (
        !old?.deleted_at
        && !row.deleted_at
        && typeof old?.data?.updatedAt === "string"
        && typeof row.data.updatedAt === "string"
        && old.data.updatedAt > row.data.updatedAt
      ) {
        row.data = structuredClone(old.data);
      }
      row.updated_at = serverTime;
      cloud.set(key, row);
    }
  }
  from.mockImplementation((table: string) => {
    if (table !== "synced_records") throw new Error(`Unexpected cloud table: ${table}`);
    const eqFilters = new Map<string, string>();
    let ids: Set<string> | undefined;
    let floor: string | undefined;
    let deletedOnly = false;
    const builder = {
      select: (_columns: string) => builder,
      eq: (key: string, value: string) => { eqFilters.set(key, value); return builder; },
      order: (_key: string, _options: unknown) => builder,
      in: (_key: string, values: string[]) => { ids = new Set(values); return builder; },
      not: (_key: string, _operator: string, _value: unknown) => { deletedOnly = true; return builder; },
      gte: (_key: string, value: string) => { floor = value; return builder; },
      upsert: async (payload: RemoteRow[]) => {
        if (state.unavailable || payload.some(row => state.fail("write", row.table_name))) return { error: failure };
        state.beforeWrite?.(payload);
        state.writes.push(structuredClone(payload));
        commit(payload);
        if (state.loseNextWriteAck) { state.loseNextWriteAck = false; return { error: failure }; }
        return { error: null };
      },
      then: (resolve: (result: QueryResult) => void) => {
        const phase = ids ? "preflight" : "pull";
        if (state.unavailable || state.fail(phase, eqFilters.get("table_name") ?? "")) {
          resolve({ data: null, error: failure });
          return;
        }
        const rows = [...cloud.values()]
          .filter(row => [...eqFilters].every(([key, value]) => row[key as keyof RemoteRow] === value))
          .filter(row => !ids || ids.has(row.id))
          .filter(row => !floor || row.updated_at >= floor)
          .filter(row => !deletedOnly || row.deleted_at !== null)
          .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
        resolve({ data: structuredClone(rows), error: null });
      },
    };
    return builder;
  });
  return { cloud, state, commit };
}

// Save/restore every test database table, including both cursors and the
// deletion outbox, to alternate two separately persisted synthetic clients.
async function snapshot() {
  const entries = await Promise.all(db.tables.map(async table => [table.name, await table.toArray()] as const));
  return structuredClone(Object.fromEntries(entries));
}
async function restore(state: Awaited<ReturnType<typeof snapshot>>) {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      if (state[table.name]?.length) await table.bulkPut(structuredClone(state[table.name]));
    }
  });
}
async function baseline() {
  at(0);
  await transactionRepository.add(draft("Original"));
  await runFullSync(USER);
  return snapshot();
}
const oneRow = async () => (await db.transactions.toArray())[0];

describe("SYNC-CONFLICT-001 isolated failure drills", () => {
  let relay: ReturnType<typeof createRelay>;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    at(0);
    await Promise.all(db.tables.map(table => table.clear()));
    useAppLockStore.setState({ encryptionEnabled: false });
    from.mockReset();
    relay = createRelay();
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    useAppLockStore.setState({ encryptionEnabled: false });
    useEncryptionSessionStore.getState().clearDek();
    await Promise.all(db.tables.map(table => table.clear()));
  });

  it("retains offline create/edit/delete and converges after reconnect without duplicates", async () => {
    await baseline();
    at(1);
    await transactionRepository.add(draft("To delete"));
    await runFullSync(USER);
    const mobile = await snapshot();
    const rows = await db.transactions.toArray();
    at(10);
    await transactionRepository.update(rows[0].id!, draft("Offline edit", 125));
    await transactionRepository.remove(rows[1].id!);
    await transactionRepository.add(draft("Offline create", 50));
    const before = await snapshot();
    relay.state.unavailable = true;
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    expect(await snapshot()).toEqual(before);
    relay.state.unavailable = false;
    await runFullSync(USER);
    expect(await db.syncTombstones.count()).toBe(0);
    const desktop = await db.transactions.toArray();
    await restore(mobile);
    await runFullSync(USER);
    expect((await db.transactions.toArray()).map(({ title, amount, syncId }) => ({ title, amount, syncId })))
      .toEqual(desktop.map(({ title, amount, syncId }) => ({ title, amount, syncId })));
    expect(await db.transactions.count()).toBe(2);
  });

  it("keeps verified QR imports identical across devices after create, edit and delete", async () => {
    const qrImport = (recipient: string, amount: number): Transaction => ({
      ...draft("PromptPay", amount),
      recipient,
      note: "EMVCo CRC verified",
    });

    await transactionRepository.add(qrImport("promptpay-a", 40));
    await transactionRepository.add(qrImport("promptpay-b", 40));
    await runFullSync(USER);
    const otherDevice = await snapshot();

    at(10);
    const localRows = await db.transactions.toArray();
    await transactionRepository.update(localRows[0]!.id!, qrImport("promptpay-a", 45));
    await transactionRepository.remove(localRows[1]!.id!);
    await transactionRepository.add(qrImport("promptpay-c", 80));
    await runFullSync(USER);

    const expected = (await db.transactions.toArray())
      .map(({ title, amount, recipient, syncId }) => ({ title, amount, recipient, syncId }))
      .sort((a, b) => a.recipient!.localeCompare(b.recipient!));
    expect(expected).toHaveLength(2);
    expect(await db.syncTombstones.count()).toBe(0);

    await restore(otherDevice);
    await runFullSync(USER);
    const pulled = (await db.transactions.toArray())
      .map(({ title, amount, recipient, syncId }) => ({ title, amount, recipient, syncId }))
      .sort((a, b) => a.recipient!.localeCompare(b.recipient!));
    expect(pulled).toEqual(expected);
  });

  it("keeps the pull cursor on a read outage and catches up on the next healthy pass", async () => {
    await baseline();
    const cursor = await db.syncState.get("pull:transactions");
    at(10);
    await transactionRepository.update((await oneRow()).id!, draft("Uploaded before read failed", 125));
    relay.state.fail = (phase, table) => phase === "pull" && table === "transactions";
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    expect(await db.syncState.get("pull:transactions")).toEqual(cursor);
    expect((await oneRow()).title).toBe("Uploaded before read failed");
    relay.state.fail = () => false;
    await runFullSync(USER);
    expect((await db.syncState.get("pull:transactions"))?.value).not.toBe(cursor?.value);
    expect(await db.transactions.count()).toBe(1);
  });

  it("retries a committed deletion whose acknowledgement was lost without resurrecting data", async () => {
    const mobile = await baseline();
    const row = await oneRow();
    at(10);
    await transactionRepository.remove(row.id!);
    relay.state.loseNextWriteAck = true;
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    expect(await db.syncTombstones.count()).toBe(1);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.deleted_at).toBeTruthy();
    await runFullSync(USER);
    expect(await db.syncTombstones.count()).toBe(0);
    await restore(mobile);
    await runFullSync(USER);
    expect(await db.transactions.count()).toBe(0);
  });

  it("honors a server deletion that arrives after preflight but before the stale upload", async () => {
    await baseline();
    const row = await oneRow();
    at(10);
    await transactionRepository.update(row.id!, draft("Stale offline edit"));
    relay.state.beforeWrite = payload => {
      relay.state.beforeWrite = null;
      relay.commit(payload.map(record => ({ ...record, data: {}, deleted_at: "2026-09-12T00:00:05.000Z" })));
    };
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.deleted_at).toBeTruthy();
    expect(await db.transactions.count()).toBe(0);
  });

  it("recovers an ordinary failed write on retry while allowing another table to sync", async () => {
    await baseline();
    at(10);
    await transactionRepository.update((await oneRow()).id!, draft("Pending upload", 125));
    await db.todos.add({ title: "Independent task", completed: false, priority: "low", createdAt: new Date().toISOString(), syncId: "todo-fixture", updatedAt: new Date().toISOString() });
    const pushCursor = await db.syncState.get("push:transactions");
    relay.state.fail = (phase, table) => phase === "write" && table === "transactions";
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    expect((await oneRow()).amount).toBe(125);
    expect(await db.syncState.get("push:transactions")).toEqual(pushCursor);
    expect(relay.cloud.get("todos:todo-fixture")).toBeDefined();
    relay.state.fail = () => false;
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${(await oneRow()).syncId}`)?.data.amount).toBe(125);
  });

  // SC-001: both reconnect orders must converge on the newer offline edit.
  for (const order of ["older-first", "newer-first"] as const) {
    it(`offline edits converge (${order})`, async () => {
      const original = await baseline();
      at(10);
      await transactionRepository.update((await oneRow()).id!, draft("Older edit", 110));
      let older = await snapshot();
      await restore(original);
      at(20);
      await transactionRepository.update((await oneRow()).id!, draft("Newer edit", 120));
      let newer = await snapshot();
      const turn = async (state: typeof original) => { await restore(state); await runFullSync(USER); return snapshot(); };
      for (let pass = 0; pass < 3; pass++) {
        if (order === "older-first") { older = await turn(older); newer = await turn(newer); }
        else { newer = await turn(newer); older = await turn(older); }
      }
      expect({ older: older.transactions[0].amount, newer: newer.transactions[0].amount, cloud: [...relay.cloud.values()][0].data.amount })
        .toEqual({ older: 120, newer: 120, cloud: 120 });
    });
  }

  it("uploads a local edit after the device clock moves behind its push cursor", async () => {
    at(100);
    await transactionRepository.add(draft("Before clock correction"));
    await runFullSync(USER);
    const peer = await snapshot();
    at(10);
    await transactionRepository.update((await oneRow()).id!, draft("Edit after clock correction", 130));
    await runFullSync(USER);
    expect({ local: (await oneRow()).amount, cloud: [...relay.cloud.values()][0].data.amount }).toEqual({ local: 130, cloud: 130 });
    await restore(peer);
    await runFullSync(USER);
    expect((await oneRow()).amount).toBe(130);
  });

  it("uploads a new row after clock rollback even when its table is empty", async () => {
    at(100);
    await transactionRepository.add(draft("Before rollback"));
    await runFullSync(USER);
    await transactionRepository.remove((await oneRow()).id!);
    await runFullSync(USER);
    at(10);
    const id = await transactionRepository.add(draft("Created after rollback", 140));
    const row = (await db.transactions.get(id))!;
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data.amount).toBe(140);
  });

  it("uploads an edit made in the same millisecond as the previous sync", async () => {
    await baseline();
    const row = await oneRow();
    await transactionRepository.update(row.id!, draft("Same millisecond edit", 150));
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data.amount).toBe(150);
    expect((await oneRow()).amount).toBe(150);
  });

  it("backfills a legacy row above a future push cursor after clock rollback", async () => {
    at(100);
    await transactionRepository.add(draft("Synced row"));
    await runFullSync(USER);
    at(10);
    const id = await db.transactions.add(draft("Legacy row", 170));
    await db.syncState.delete("backfill:transactions:complete");
    await runFullSync(USER);
    const row = (await db.transactions.get(id))!;
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data.amount).toBe(170);
  });

  it("preserves encrypted content and syncs a clock-rollback edit to the peer", async () => {
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(await generateDek());
    at(100);
    const id = await transactionRepository.add(draft("Encrypted original"));
    await runFullSync(USER);
    const peer = await snapshot();
    const syncId = (await oneRow()).syncId;
    at(10);
    await transactionRepository.update(id, draft("Encrypted rollback edit", 160));
    await runFullSync(USER);
    expect((await transactionRepository.getAll())[0]).toMatchObject({ amount: 160, syncId });
    const cloud = relay.cloud.get(`transactions:${syncId}`)!.data;
    expect(cloud.encryptedContent).toBeDefined();
    expect(cloud.amount).toBeUndefined();
    await restore(peer);
    await runFullSync(USER);
    expect((await transactionRepository.getAll())[0]).toMatchObject({ amount: 160, syncId });
    expect((await oneRow()).amount).toBeUndefined();
  });

  it("retries a failed newer edit when the pull includes another newer remote record", async () => {
    await baseline();
    const peer = await snapshot();
    const row = await oneRow();
    at(20);
    await transactionRepository.update(row.id!, draft("Pending newer edit", 120));
    relay.commit([{ id: "other-remote", user_id: USER, table_name: "transactions", data: { ...draft("Other remote"), syncId: "other-remote", updatedAt: new Date(baseTime + 30000).toISOString() }, updated_at: "", deleted_at: null }]);
    relay.state.fail = (phase, table) => phase === "write" && table === "transactions";
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    const pending = (await db.transactions.get(row.id!))!;
    expect((await db.syncState.get("push:transactions"))!.value <= pending.updatedAt!).toBe(true);
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    relay.state.fail = () => false;
    await runFullSync(USER);
    await runFullSync(USER);
    expect({ local: (await db.transactions.get(row.id!))?.amount, cloud: relay.cloud.get(`transactions:${row.syncId}`)?.data.amount })
      .toEqual({ local: 120, cloud: 120 });
    await restore(peer);
    await runFullSync(USER);
    expect((await transactionRepository.getAll()).find(item => item.syncId === row.syncId)?.amount).toBe(120);
  });

  it("does not acknowledge a malformed same-ID row after an upload failure", async () => {
    await baseline();
    const row = await oneRow();
    at(20);
    await transactionRepository.update(row.id!, draft("Unsent edit", 180));
    relay.cloud.get(`transactions:${row.syncId}`)!.data = null as unknown as Record<string, unknown>;
    relay.commit([{ id: "other-remote", user_id: USER, table_name: "transactions", data: { ...draft("Other remote"), syncId: "other-remote", updatedAt: new Date(baseTime + 30000).toISOString() }, updated_at: "", deleted_at: null }]);
    relay.state.fail = (phase, table) => phase === "write" && table === "transactions";
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    relay.state.fail = () => false;
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data?.amount).toBe(180);
  });

  it("retains an edit made after applying that ID but before another newer row is applied", async () => {
    await baseline();
    const row = await oneRow();
    relay.commit([
      { id: row.syncId!, user_id: USER, table_name: "transactions", data: { ...row, title: "Remote edit", amount: 110, updatedAt: new Date(baseTime + 20000).toISOString() }, updated_at: "", deleted_at: null },
      { id: "other-remote", user_id: USER, table_name: "transactions", data: { ...draft("Other remote"), syncId: "other-remote", updatedAt: new Date(baseTime + 30000).toISOString() }, updated_at: "", deleted_at: null },
    ]);
    const put = db.transactions.put.bind(db.transactions);
    let edited = false;
    vi.spyOn(db.transactions, "put").mockImplementation((...args) => put(...args).then(async id => {
      if (!edited && args[0].syncId === row.syncId && args[0].title === "Remote edit") {
        edited = true;
        at(21);
        await transactionRepository.update(row.id!, draft("Edited during pull", 190));
      }
      return id;
    }));
    await runFullSync(USER);
    expect(edited).toBe(true);
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data.amount).toBe(190);
    expect((await db.transactions.get(row.id!))?.amount).toBe(190);
  });

  it("repairs a cursor stuck on an installation that already ran the v1 repair, exactly once", async () => {
    await baseline();
    const row = await oneRow();
    at(20);
    await transactionRepository.update(row.id!, draft("Previously skipped edit", 200));
    await db.syncState.put({ key: "migration:clearedPushCursors:v1", value: "true" });
    await db.syncState.delete("migration:clearedPushCursors:v2");
    const pastPending = new Date(baseTime + 30000).toISOString();
    await db.syncState.put({ key: "push:transactions", value: pastPending });
    await runFullSync(USER);
    expect(relay.cloud.get(`transactions:${row.syncId}`)?.data.amount).toBe(200);
    expect((await db.syncState.get("migration:clearedPushCursors:v2"))?.value).toBe("true");
    await db.syncState.put({ key: "push:transactions", value: pastPending });
    await runFullSync(USER);
    expect((await db.syncState.get("push:transactions"))?.value).toBe(pastPending);
  });

  it("retries a failed encrypted edit and delivers decryptable content to the peer", async () => {
    useAppLockStore.setState({ encryptionEnabled: true });
    useEncryptionSessionStore.getState().setDek(await generateDek());
    await baseline();
    const peer = await snapshot();
    const row = await oneRow();
    at(20);
    await transactionRepository.update(row.id!, draft("Encrypted retry", 210));
    relay.commit([{ id: "other-remote", user_id: USER, table_name: "transactions", data: { ...draft("Other remote"), syncId: "other-remote", updatedAt: new Date(baseTime + 30000).toISOString() }, updated_at: "", deleted_at: null }]);
    relay.state.fail = (phase, table) => phase === "write" && table === "transactions";
    await expect(runFullSync(USER)).rejects.toThrow("Synthetic provider outage");
    relay.state.fail = () => false;
    await runFullSync(USER);
    const cloud = relay.cloud.get(`transactions:${row.syncId}`)!.data;
    expect(cloud.encryptedContent).toBeDefined();
    expect(cloud.amount).toBeUndefined();
    await restore(peer);
    await runFullSync(USER);
    expect((await transactionRepository.getAll()).find(item => item.syncId === row.syncId)?.amount).toBe(210);
  });
});
