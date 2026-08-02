import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSignInWithPassword = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
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
  beforeEach(() => {
    useAuthStore.setState({ user: null, error: null, loading: false });
    mockSignInWithPassword.mockReset();
    mockSelect.mockReset();
    mockEq.mockReset();
    mockMaybeSingle.mockReset();
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
});
