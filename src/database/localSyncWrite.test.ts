import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeLocalSyncRows } from "./localSyncWrite";

type Row = { id?: number; syncId: string; updatedAt?: string; amount: number };
const dbName = "local-sync-clock-regression";
const connections: Dexie[] = [];
function connect() {
  const connection = new Dexie(dbName);
  connection.version(1).stores({ records: "++id,&syncId,updatedAt", syncState: "key" });
  connections.push(connection);
  return connection;
}

describe("atomic local sync versions", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime("2026-09-12T00:00:10.000Z");
  });
  afterEach(async () => {
    vi.useRealTimers();
    connections.splice(0).forEach(connection => connection.close());
    await Dexie.delete(dbName);
  });

  it("uses the newest stored version even without a saved clock or cursor", async () => {
    const table = connect().table<Row, number>("records");
    const future = "2026-09-12T01:00:00.000Z";
    await table.add({ syncId: "pulled", updatedAt: future, amount: 100 });
    await writeLocalSyncRows(table, [{ syncId: "new", amount: 120 }], "add");
    expect((await table.where("syncId").equals("new").first())!.updatedAt! > future).toBe(true);
  });

  it("respects a push watermark later than every stored row", async () => {
    const connection = connect();
    const future = "2026-09-12T02:00:00.001Z";
    await connection.table("syncState").put({ key: "push:records", value: future });
    const table = connection.table<Row, number>("records");
    await writeLocalSyncRows(table, [{ syncId: "new", amount: 120 }], "add");
    expect((await table.toArray())[0].updatedAt! > future).toBe(true);
  });

  it("retains the clock after reopening an empty table with no push cursor", async () => {
    const first = connect();
    const table = first.table<Row, number>("records");
    vi.setSystemTime("2026-09-12T03:00:00.000Z");
    await writeLocalSyncRows(table, [{ syncId: "deleted", amount: 100 }], "add");
    const previous = (await table.toArray())[0].updatedAt!;
    await table.clear();
    first.close();
    vi.setSystemTime("2026-09-12T00:00:10.000Z");
    const reopened = connect().table<Row, number>("records");
    await writeLocalSyncRows(reopened, [{ syncId: "new", amount: 120 }], "add");
    expect((await reopened.toArray())[0].updatedAt! > previous).toBe(true);
  });

  it("serializes versions allocated by two database connections at the same time", async () => {
    const a = connect().table<Row, number>("records");
    const b = connect().table<Row, number>("records");
    await Promise.all(Array.from({ length: 12 }, (_, i) =>
      writeLocalSyncRows(i % 2 ? a : b, [{ syncId: `row-${i}`, amount: i }], "add")
    ));
    const rows = await a.orderBy("id").toArray();
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map(row => row.updatedAt)).size).toBe(12);
    expect(rows.every((row, i) => i === 0 || row.updatedAt! > rows[i - 1].updatedAt!)).toBe(true);
  });

  it("rolls back both the clock and the batch if a write fails", async () => {
    const connection = connect();
    const table = connection.table<Row, number>("records");
    await writeLocalSyncRows(table, [{ syncId: "existing", amount: 100 }], "add");
    const clock = await connection.table("syncState").get("clock:records");
    await expect(writeLocalSyncRows(table, [
      { syncId: "new", amount: 120 },
      { syncId: "existing", amount: 130 },
    ], "add")).rejects.toThrow();
    expect(await table.count()).toBe(1);
    expect(await connection.table("syncState").get("clock:records")).toEqual(clock);
  });
});
