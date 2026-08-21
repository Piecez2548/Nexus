import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { clearAuditLog, getAuditLog } from "@/features/security/auditLog";

const mockListFactors = vi.fn();
const mockEnroll = vi.fn();
const mockChallengeAndVerify = vi.fn();
const mockUnenroll = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  isSyncConfigured: true,
  supabase: {
    auth: {
      mfa: {
        listFactors: (...args: unknown[]) => mockListFactors(...args),
        enroll: (...args: unknown[]) => mockEnroll(...args),
        challengeAndVerify: (...args: unknown[]) => mockChallengeAndVerify(...args),
        unenroll: (...args: unknown[]) => mockUnenroll(...args),
      },
    },
  },
}));

const { resolveMfaAccess, enrollTotp, verifyTotpCode, completeTotpEnrollment, unenrollTotp } = await import("./mfa");
const { markMfaVerifiedThisSession } = await import("./mfaSession");

const user = { id: "u1", email: "a@b.com" } as User;

describe("resolveMfaAccess", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockListFactors.mockReset();
  });

  it("passes a null user through without calling the API", async () => {
    const result = await resolveMfaAccess(null);
    expect(result).toEqual({ user: null, mfaPending: false, mfaFactorId: null });
    expect(mockListFactors).not.toHaveBeenCalled();
  });

  it("passes the user through when no verified TOTP factor is enrolled", async () => {
    mockListFactors.mockResolvedValue({ data: { totp: [] }, error: null });

    const result = await resolveMfaAccess(user);
    expect(result).toEqual({ user, mfaPending: false, mfaFactorId: null });
  });

  it("withholds the user and flags mfaPending when a verified factor exists and this session hasn't verified yet", async () => {
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });

    const result = await resolveMfaAccess(user);
    expect(result).toEqual({ user: null, mfaPending: true, mfaFactorId: "factor-1" });
  });

  it("passes the user through when a verified factor exists but this session already satisfied it", async () => {
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });
    markMfaVerifiedThisSession(user.id);

    const result = await resolveMfaAccess(user);
    expect(result).toEqual({ user, mfaPending: false, mfaFactorId: null });
  });

  it("does not honour a different user's session-verified flag", async () => {
    mockListFactors.mockResolvedValue({ data: { totp: [{ id: "factor-1", status: "verified" }] }, error: null });
    markMfaVerifiedThisSession("someone-else");

    const result = await resolveMfaAccess(user);
    expect(result.mfaPending).toBe(true);
  });
});

describe("enrollTotp / verifyTotpCode / unenrollTotp", () => {
  beforeEach(() => {
    mockEnroll.mockReset();
    mockChallengeAndVerify.mockReset();
    mockUnenroll.mockReset();
    clearAuditLog();
  });

  it("enrollTotp returns the factor id, a prefixed QR data URI, and the secret", async () => {
    mockEnroll.mockResolvedValue({
      data: { id: "factor-1", totp: { qr_code: "<svg>...</svg>", secret: "SECRET123", uri: "otpauth://..." } },
      error: null,
    });

    const result = await enrollTotp();
    expect(result).toEqual({
      factorId: "factor-1",
      qrCodeDataUri: "data:image/svg+xml;utf-8,<svg>...</svg>",
      secret: "SECRET123",
    });
  });

  it("enrollTotp throws on a Supabase error", async () => {
    mockEnroll.mockResolvedValue({ data: null, error: new Error("enroll failed") });
    await expect(enrollTotp()).rejects.toThrow("enroll failed");
  });

  it("verifyTotpCode calls challengeAndVerify with the factor id and code", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: {}, error: null });
    await verifyTotpCode("factor-1", "123456");
    expect(mockChallengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
  });

  it("verifyTotpCode throws on an invalid code", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: null, error: new Error("Invalid code") });
    await expect(verifyTotpCode("factor-1", "000000")).rejects.toThrow("Invalid code");
  });

  it("unenrollTotp calls unenroll with the factor id and records a success audit event", async () => {
    mockUnenroll.mockResolvedValue({ data: {}, error: null });
    await unenrollTotp("factor-1");
    expect(mockUnenroll).toHaveBeenCalledWith({ factorId: "factor-1" });
    expect(getAuditLog().some((e) => e.action === "mfa-unenroll" && e.detail?.success === true)).toBe(true);
  });

  it("unenrollTotp records a failure audit event and re-throws on error", async () => {
    mockUnenroll.mockResolvedValue({ data: null, error: new Error("unenroll failed") });
    await expect(unenrollTotp("factor-1")).rejects.toThrow("unenroll failed");
    expect(getAuditLog().some((e) => e.action === "mfa-unenroll" && e.detail?.success === false)).toBe(true);
  });

  it("completeTotpEnrollment verifies the code and records a success mfa-enroll audit event", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: {}, error: null });
    await completeTotpEnrollment("factor-1", "123456");
    expect(mockChallengeAndVerify).toHaveBeenCalledWith({ factorId: "factor-1", code: "123456" });
    expect(getAuditLog().some((e) => e.action === "mfa-enroll" && e.detail?.success === true)).toBe(true);
  });

  it("completeTotpEnrollment records a failure mfa-enroll audit event and re-throws on an invalid code", async () => {
    mockChallengeAndVerify.mockResolvedValue({ data: null, error: new Error("Invalid code") });
    await expect(completeTotpEnrollment("factor-1", "000000")).rejects.toThrow("Invalid code");
    expect(getAuditLog().some((e) => e.action === "mfa-enroll" && e.detail?.success === false)).toBe(true);
  });
});
