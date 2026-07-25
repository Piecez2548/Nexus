import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSignInWithPassword = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
    },
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

const { reescrowDek, ReescrowFailedError } = await import("./reescrowDek");
const { useAuthStore } = await import("@/features/sync/store/authStore");
const { useEncryptionSessionStore } = await import("@/features/encryption/store/encryptionSessionStore");
const { generateDek, deriveKek, unwrapDek, base64ToBytes } = await import("@/features/encryption/crypto/encryption");

describe("reescrowDek", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "user-123", email: "a@b.com" } as never });
    useEncryptionSessionStore.getState().clearDek();
    mockSignInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null });
    mockUpsert.mockReset().mockResolvedValue({ error: null });
  });

  it("re-wraps the resident session DEK with a key derived from the verified password and upserts it", async () => {
    const dek = await generateDek();
    useEncryptionSessionStore.getState().setDek(dek);

    await reescrowDek("correct-password");

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "correct-password" });
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    const [payload] = mockUpsert.mock.calls[0];
    expect(payload.user_id).toBe("user-123");

    // Confirms it's really the resident DEK, not some other key.
    const escrowKek = await deriveKek("correct-password", base64ToBytes(payload.escrow_salt), payload.escrow_iterations);
    const recovered = await unwrapDek({ wrapped: payload.wrapped_dek, iv: payload.dek_iv }, escrowKek);
    const exported = await crypto.subtle.exportKey("raw", recovered);
    const originalExported = await crypto.subtle.exportKey("raw", dek);
    expect(new Uint8Array(exported)).toEqual(new Uint8Array(originalExported));
  });

  it("rejects when not signed in", async () => {
    useAuthStore.setState({ user: null });
    const dek = await generateDek();
    useEncryptionSessionStore.getState().setDek(dek);

    await expect(reescrowDek("correct-password")).rejects.toThrow(ReescrowFailedError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects when this device has no resident session DEK (locked)", async () => {
    await expect(reescrowDek("correct-password")).rejects.toThrow(ReescrowFailedError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects when the account password is wrong, without upserting anything", async () => {
    const dek = await generateDek();
    useEncryptionSessionStore.getState().setDek(dek);
    mockSignInWithPassword.mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } });

    await expect(reescrowDek("wrong-password")).rejects.toThrow(ReescrowFailedError);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("propagates an upsert failure", async () => {
    const dek = await generateDek();
    useEncryptionSessionStore.getState().setDek(dek);
    mockUpsert.mockResolvedValue({ error: { message: "network unreachable" } });

    await expect(reescrowDek("correct-password")).rejects.toBeTruthy();
  });
});
