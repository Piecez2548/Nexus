import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockSignInWithPassword = vi.fn();
const mockListFactors = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
      },
    },
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { maybeSingle: (...msArgs: unknown[]) => mockMaybeSingle(...msArgs) };
          },
        };
      },
    }),
  },
}));

const { recoverDekFromEscrow, RecoveryNotAvailableError } = await import("./recoverDekFromEscrow");
const { useAuthStore } = await import("@/features/sync/store/authStore");
const { db } = await import("@/database/db");
const { useAppLockStore } = await import("@/store/appLockStore");
const { useEncryptionSessionStore } = await import("@/features/encryption/store/encryptionSessionStore");
const { transactionRepository } = await import("@/features/finance/repositories/transactionRepository");
const { CHUNK_SIZE, ENCRYPTABLE_TABLES } = await import("@/features/encryption/migration/migrationShared");
const { RecoveryKeyMismatchError } = await import("./validateRecoveryKey");
const {
  generateDek,
  deriveKek,
  wrapDek,
  generateRandomBytes,
  bytesToBase64,
  PBKDF2_ITERATIONS,
  decryptField,
  encryptField,
} = await import("@/features/encryption/crypto/encryption");

const t = (key: string) => key;

async function makeEscrowRecord(password: string, dek: CryptoKey) {
  const escrowSalt = generateRandomBytes(16);
  const escrowKek = await deriveKek(password, escrowSalt, PBKDF2_ITERATIONS);
  const wrapped = await wrapDek(dek, escrowKek);

  return {
    wrapped_dek: wrapped.wrapped,
    dek_iv: wrapped.iv,
    escrow_salt: bytesToBase64(escrowSalt),
    escrow_iterations: PBKDF2_ITERATIONS,
  };
}

describe("recoverDekFromEscrow", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await Promise.all(ENCRYPTABLE_TABLES.map((name) => db.table(name).clear()));
    useAppLockStore.setState({ pinHash: null, salt: null, encryptionEnabled: false, wrappedDek: null, kekSalt: null, kekIterations: null, sessionUnlocked: false, rememberUntil: null, biometricEnabled: false });
    useEncryptionSessionStore.getState().clearDek();
    useAuthStore.setState({ user: null, error: null, loading: false, mfaPending: false, mfaFactorId: null, mfaError: null });
    mockSignInWithPassword.mockReset();
    mockListFactors.mockReset().mockResolvedValue({ data: { totp: [] }, error: null });
    mockSelect.mockReset();
    mockEq.mockReset();
    mockMaybeSingle.mockReset();
  });

  afterEach(async () => {
    await Promise.all(ENCRYPTABLE_TABLES.map((name) => db.table(name).clear()));
    useEncryptionSessionStore.getState().clearDek();
  });

  it("recovers the exact original DEK given the correct account password", async () => {
    const originalDek = await generateDek();
    const record = await makeEscrowRecord("correct-password", originalDek);

    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: record, error: null });

    const recovered = await recoverDekFromEscrow("a@b.com", "correct-password", t);

    // Proves it's really the same key, not just any successfully-unwrapped
    // key — content encrypted with the original DEK must decrypt with it.
    const envelope = await encryptField(originalDek, { title: "Coffee", amount: 120 });
    const decrypted = await decryptField<{ title: string; amount: number }>(recovered, envelope);
    expect(decrypted).toEqual({ title: "Coffee", amount: 120 });

    expect(useAuthStore.getState().user).toEqual({ id: "user-123" });
  });

  it("rejects when the account password is wrong (escrow KEK can't unwrap the DEK)", async () => {
    const originalDek = await generateDek();
    const record = await makeEscrowRecord("correct-password", originalDek);

    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: record, error: null });

    await expect(recoverDekFromEscrow("a@b.com", "wrong-password", t)).rejects.toThrow(RecoveryNotAvailableError);
  });

  it("rejects when sign-in itself fails, without ever querying the escrow table", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    await expect(recoverDekFromEscrow("a@b.com", "wrong-password", t)).rejects.toThrow(RecoveryNotAvailableError);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects when no escrow record exists for the account", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(recoverDekFromEscrow("a@b.com", "correct-password", t)).rejects.toThrow(RecoveryNotAvailableError);
  });

  it("rejects failed reauthentication even when a previous user remains signed in", async () => {
    useAuthStore.setState({ user: { id: "previous-user", email: "a@b.com" } as User });
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: "Invalid login credentials" } });

    await expect(recoverDekFromEscrow("a@b.com", "wrong-password", t)).rejects.toThrow("Invalid login credentials");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects another email before changing the signed-in account", async () => {
    useAuthStore.setState({ user: { id: "original-user", email: "a@b.com" } as User });
    await expect(recoverDekFromEscrow("other@b.com", "password", t)).rejects.toThrow("lock.recoverAccountMismatch");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects an unexpected account ID after reauthentication", async () => {
    useAuthStore.setState({ user: { id: "original-user", email: "a@b.com" } as User });
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "different-user" } }, error: null });
    await expect(recoverDekFromEscrow("a@b.com", "password", t)).rejects.toThrow("lock.recoverAccountMismatch");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("does not query escrow while MFA verification is pending", async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-123" }] }, error: null });
    await expect(recoverDekFromEscrow("a@b.com", "password", t)).rejects.toThrow(RecoveryNotAvailableError);
    expect(useAuthStore.getState().mfaPending).toBe(true);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("rejects an account change during the escrow request", async () => {
    const record = await makeEscrowRecord("password", await generateDek());
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockImplementation(async () => {
      useAuthStore.setState({ user: null });
      return { data: record, error: null };
    });
    await expect(recoverDekFromEscrow("a@b.com", "password", t)).rejects.toThrow("lock.recoverAccountMismatch");
  });

  it("propagates escrow service failure without unlocking or changing the PIN", async () => {
    await useAppLockStore.getState().setupPin("1234", false);
    useAppLockStore.getState().lock();
    const originalState = useAppLockStore.getState();
    const failure = new Error("Escrow unavailable");
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: failure });
    await expect(recoverDekFromEscrow("a@b.com", "password", t)).rejects.toBe(failure);
    expect(useAppLockStore.getState()).toBe(originalState);
    expect(useEncryptionSessionStore.getState().dek).toBeNull();
  });

  it("recovers encrypted local data and replaces only the PIN, retaining the original ciphertext", async () => {
    const originalDek = await generateDek();
    const content = { type: "expense", amount: 120, category: "Food", account: "Cash", date: "2026-09-12", note: "Recovery drill" };
    await useAppLockStore.getState().setupPin("1234", false);
    await useAppLockStore.getState().attachEncryption("1234", originalDek);
    const row = { id: 1, syncId: "recovery-drill", updatedAt: "2026-09-12T00:00:00.000Z", encryptedContent: await encryptField(originalDek, content) };
    await db.table("transactions").put(row);
    useAppLockStore.getState().lock();
    const pinHash = useAppLockStore.getState().pinHash;

    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    mockMaybeSingle.mockResolvedValue({ data: await makeEscrowRecord("password", originalDek), error: null });
    const recovered = await recoverDekFromEscrow("a@b.com", "password", t);
    expect(useAppLockStore.getState().pinHash).toBe(pinHash);
    expect(useAppLockStore.getState().isLocked()).toBe(true);
    expect(useEncryptionSessionStore.getState().dek).toBeNull();

    await useAppLockStore.getState().completeRecovery("5678", recovered);
    expect(await transactionRepository.getAll()).toEqual([{ id: row.id, syncId: row.syncId, updatedAt: row.updatedAt, ...content }]);
    expect(await db.table("transactions").get(row.id)).toEqual(row);
    useAppLockStore.getState().lock();
    expect(await useAppLockStore.getState().unlock("1234", false)).toBe(false);
    expect(await useAppLockStore.getState().unlock("5678", false)).toBe(true);
    expect((await transactionRepository.getAll())[0]).toMatchObject(content);
  });

  it.each(["wrong-key", "corrupt-envelope"])("preserves local PIN and ciphertext when recovery encounters %s", async (scenario) => {
    const originalDek = await generateDek();
    await useAppLockStore.getState().setupPin("1234", false);
    await useAppLockStore.getState().attachEncryption("1234", originalDek);
    const envelope = await encryptField(originalDek, { title: "Original content" });
    const row = { id: 0, encryptedContent: scenario === "corrupt-envelope" ? { ...envelope, ct: "invalid" } : envelope };
    await db.table("economicEvents").put(row);
    useAppLockStore.getState().lock();
    const originalState = useAppLockStore.getState();
    const persisted = localStorage.getItem("nexus-app-lock");

    await expect(useAppLockStore.getState().completeRecovery("5678", scenario === "wrong-key" ? await generateDek() : originalDek)).rejects.toThrow(RecoveryKeyMismatchError);
    expect(useAppLockStore.getState()).toBe(originalState);
    expect(localStorage.getItem("nexus-app-lock")).toBe(persisted);
    expect(useEncryptionSessionStore.getState().dek).toBeNull();
    expect(await db.table("economicEvents").get(row.id)).toEqual(row);
    expect(await useAppLockStore.getState().unlock("1234", false)).toBe(true);
  });

  it("checks ciphertext beyond the first page, including on a device with no encryption flag", async () => {
    await db.table("transactions").bulkPut(Array.from({ length: CHUNK_SIZE }, (_, i) => ({ id: i + 1, note: "Plaintext row" })));
    await db.table("transactions").put({ id: CHUNK_SIZE + 1, encryptedContent: await encryptField(await generateDek(), { amount: 42 }) });
    await expect(useAppLockStore.getState().completeRecovery("5678", await generateDek())).rejects.toThrow(RecoveryKeyMismatchError);
    expect(useAppLockStore.getState().pinHash).toBeNull();
    expect(useEncryptionSessionStore.getState().dek).toBeNull();
    expect(await db.transactions.count()).toBe(CHUNK_SIZE + 1);
  });
});
