import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearAuditLog, getAuditLog } from "@/features/security/auditLog";

// A minimal in-memory stand-in for the `mfa_backup_codes` table's
// PostgREST query builder chain -- deep enough to exercise
// delete().eq()/insert()/select().eq().is()/update().eq() the same way
// backupCodes.ts calls them, without a real Supabase project.
interface Row {
  id: string;
  user_id: string;
  code_hash: string;
  salt: string;
  used_at: string | null;
}

let rows: Row[] = [];
let nextId = 1;

function fromMock() {
  return {
    delete: () => ({
      eq: (_col: string, userId: string) => {
        rows = rows.filter((r) => r.user_id !== userId);
        return Promise.resolve({ error: null });
      },
    }),
    insert: (newRows: Omit<Row, "id" | "used_at">[]) => {
      for (const r of newRows) rows.push({ id: String(nextId++), used_at: null, ...r });
      return Promise.resolve({ error: null });
    },
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      const builder = {
        _filters: [] as ((r: Row) => boolean)[],
        eq(_col: string, userId: string) {
          this._filters.push((r: Row) => r.user_id === userId);
          return this;
        },
        is(_col: string, value: null) {
          this._filters.push((r: Row) => r.used_at === value);
          return this;
        },
        then(resolve: (v: { data: Row[]; error: null; count: number }) => void) {
          const matched = rows.filter((r) => this._filters.every((f) => f(r)));
          resolve({ data: matched, error: null, count: matched.length });
        },
      };
      if (opts?.head) {
        // countRemainingBackupCodes destructures `{ count }` directly from
        // the awaited builder -- same `then` above satisfies that.
      }
      return builder;
    },
    update: (patch: Partial<Row>) => ({
      eq: (_col: string, id: string) => {
        const row = rows.find((r) => r.id === id);
        if (row) Object.assign(row, patch);
        return Promise.resolve({ error: null });
      },
    }),
  };
}

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: { from: () => fromMock() },
}));

const { generateBackupCodes, redeemBackupCode, countRemainingBackupCodes, formatBackupCode } = await import("./backupCodes");

describe("backupCodes", () => {
  beforeEach(() => {
    rows = [];
    nextId = 1;
    clearAuditLog();
  });

  it("generateBackupCodes returns 10 unique, dash-formatted plaintext codes", async () => {
    const codes = await generateBackupCodes("u1");
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
  });

  it("persists only hashes, never the plaintext code", async () => {
    const codes = await generateBackupCodes("u1");
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.code_hash).not.toBe("");
      for (const code of codes) expect(row.code_hash).not.toContain(code);
    }
  });

  it("replaces a user's existing codes rather than accumulating them", async () => {
    await generateBackupCodes("u1", 3);
    await generateBackupCodes("u1", 3);
    expect(rows).toHaveLength(3);
  });

  it("redeemBackupCode matches a valid unused code and marks it used", async () => {
    const codes = await generateBackupCodes("u1");
    const ok = await redeemBackupCode("u1", codes[0]!);
    expect(ok).toBe(true);
    expect(rows.find((r) => r.used_at !== null)).toBeDefined();
  });

  it("redeemBackupCode accepts the code regardless of dashes/case/whitespace", async () => {
    const codes = await generateBackupCodes("u1");
    const messy = ` ${codes[0]!.toLowerCase().replace("-", "")} `;
    const ok = await redeemBackupCode("u1", messy);
    expect(ok).toBe(true);
  });

  it("redeemBackupCode rejects an already-used code", async () => {
    const codes = await generateBackupCodes("u1");
    await redeemBackupCode("u1", codes[0]!);
    const ok = await redeemBackupCode("u1", codes[0]!);
    expect(ok).toBe(false);
  });

  it("redeemBackupCode rejects an unknown code", async () => {
    await generateBackupCodes("u1");
    const ok = await redeemBackupCode("u1", "ZZZZZ-ZZZZZ");
    expect(ok).toBe(false);
  });

  it("countRemainingBackupCodes reflects only unused rows", async () => {
    const codes = await generateBackupCodes("u1", 5);
    expect(await countRemainingBackupCodes("u1")).toBe(5);

    await redeemBackupCode("u1", codes[0]!);
    expect(await countRemainingBackupCodes("u1")).toBe(4);
  });

  it("formatBackupCode groups a canonical 10-char code as XXXXX-XXXXX", () => {
    expect(formatBackupCode("ABCDEFGHJK")).toBe("ABCDE-FGHJK");
  });

  it("records an mfa-backup-codes-generated audit event", async () => {
    await generateBackupCodes("u1", 5);
    const event = getAuditLog().find((e) => e.action === "mfa-backup-codes-generated");
    expect(event).toMatchObject({ type: "auth", detail: { count: 5 } });
  });
});
