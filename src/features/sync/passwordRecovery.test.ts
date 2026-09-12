import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ reset: vi.fn(), update: vi.fn(), session: vi.fn(), callback: null as null | ((event: string) => void) }));
vi.mock("@/lib/supabaseClient", () => ({ supabase: { auth: {
  resetPasswordForEmail: mocks.reset, updateUser: mocks.update, getSession: mocks.session,
  onAuthStateChange: (callback: (event: string) => void) => { mocks.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
import { clearRecovery, requestPasswordReset, saveRecoveredPassword, usePasswordRecovery } from "./passwordRecovery";
describe("password recovery", () => {
  beforeEach(() => { vi.clearAllMocks(); clearRecovery(); mocks.reset.mockResolvedValue({ error: null }); mocks.update.mockResolvedValue({ error: null }); mocks.session.mockResolvedValue({ data: { session: { user: { id: "fixture" } } }, error: null }); });
  it("trims email and redirects to the current site origin", async () => {
    await requestPasswordReset(" person@example.test ");
    expect(mocks.reset).toHaveBeenCalledWith("person@example.test", { redirectTo: window.location.origin });
  });
  it("surfaces provider errors without claiming email delivery", async () => {
    mocks.reset.mockResolvedValue({ error: new Error("Rate limit") });
    await expect(requestPasswordReset("person@example.test")).rejects.toThrow("Rate limit");
  });
  it("rejects mismatched and short passwords before updating", async () => {
    await expect(saveRecoveredPassword("long-password", "different")).rejects.toThrow();
    await expect(saveRecoveredPassword("short", "short")).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects expired recovery sessions", async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(saveRecoveredPassword("long-password", "long-password")).rejects.toThrow("ลิงก์หมดอายุ");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("updates a password only after a session is available", async () => {
    await saveRecoveredPassword("long-password", "long-password");
    expect(mocks.update).toHaveBeenCalledWith({ password: "long-password" });
  });
  it("does not treat the recovery UI marker as authorization", async () => {
    mocks.callback?.("PASSWORD_RECOVERY");
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(saveRecoveredPassword("long-password", "long-password")).rejects.toThrow("ลิงก์หมดอายุ");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(usePasswordRecovery.getState().active).toBe(true);
  });
  it("keeps recovery active when the provider rejects the new password", async () => {
    mocks.callback?.("PASSWORD_RECOVERY");
    mocks.update.mockResolvedValue({ error: new Error("Password policy rejected") });
    await expect(saveRecoveredPassword("long-password", "long-password")).rejects.toThrow("Password policy rejected");
    expect(usePasswordRecovery.getState().active).toBe(true);
  });
  it("keeps recovery visible when Supabase establishes the recovery session", () => {
    mocks.callback?.("PASSWORD_RECOVERY");
    expect(usePasswordRecovery.getState().active).toBe(true);
    expect(sessionStorage.getItem("nexus-password-recovery")).toBe("1");
    clearRecovery(); expect(usePasswordRecovery.getState().active).toBe(false);
  });
});
