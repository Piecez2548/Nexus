import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";

const marker = "nexus-password-recovery";
const hash = new URLSearchParams(window.location.hash.slice(1));
const arriving = hash.get("type") === "recovery";
export const usePasswordRecovery = create<{ active: boolean }>(() => ({
  active: arriving || sessionStorage.getItem(marker) === "1",
}));
if (arriving) sessionStorage.setItem(marker, "1");

// Subscribe before React mounts: Supabase may consume the URL during startup.
const subscription = supabase?.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    sessionStorage.setItem(marker, "1");
    usePasswordRecovery.setState({ active: true });
  }
});
if (import.meta.hot) import.meta.hot.dispose(() => subscription?.data.subscription.unsubscribe());

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error("ระบบบัญชียังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง");
  // The established site origin avoids requiring a new redirect allowlist entry.
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
  if (error) throw error;
}
export async function saveRecoveredPassword(password: string, confirmation: string) {
  if (password.length < 8) throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  if (password !== confirmation) throw new Error("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
  if (!supabase) throw new Error("ระบบบัญชียังไม่พร้อมใช้งาน");
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session) throw new Error("ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
export function clearRecovery() {
  sessionStorage.removeItem(marker);
  usePasswordRecovery.setState({ active: false });
}
