import { useState, type FormEvent } from "react";
import { requestPasswordReset, saveRecoveredPassword, clearRecovery } from "../passwordRecovery";
import "./loginScreen.css";

export default function PasswordRecoveryScreen({ recovery = false }: { recovery?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (recovery) await saveRecoveredPassword(password, confirmation);
      else await requestPasswordReset(email);
      setSent(true); setPassword(""); setConfirmation("");
    } catch (e) { setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ กรุณาลองใหม่"); }
    finally { setBusy(false); }
  }
  function leave(path: string) { clearRecovery(); window.location.assign(path); }
  return <main className="login-page dark">
    <header className="login-header"><div className="login-brand">nexus.</div><span>Nexus All</span></header>
    <section style={{ maxWidth: 520, width: "100%", margin: "48px auto" }}>
      <form className="login-form" onSubmit={submit} aria-busy={busy}>
        <div className="login-intro"><h1>{recovery ? "ตั้งรหัสผ่านใหม่" : "ลืมรหัสผ่าน"}</h1><p>{recovery ? "กำหนดรหัสผ่านใหม่สำหรับบัญชี Nexus ของคุณ" : "กรอกอีเมลที่ใช้สมัคร Nexus เพื่อรับลิงก์ตั้งรหัสผ่านใหม่"}</p></div>
        <div className="login-fields" style={{ marginTop: 24 }}>
          {sent ? <p role="status">{recovery ? "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" : "หากอีเมลนี้มีบัญชีที่รองรับการกู้คืน คุณจะได้รับลิงก์ตั้งรหัสผ่านใหม่ กรุณาตรวจกล่องจดหมายและสแปม"}</p> : <>
            {recovery ? <>
              <label htmlFor="recovery-password">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
              <input className="login-input p-3" id="recovery-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} />
              <label htmlFor="recovery-confirmation">ยืนยันรหัสผ่านใหม่</label>
              <input className="login-input p-3" id="recovery-confirmation" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={e => setConfirmation(e.target.value)} />
            </> : <><label htmlFor="recovery-email">อีเมล</label><input className="login-input p-3" id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></>}
            {error && <p role="alert" className="text-red-400">{error}</p>}
            <button className="login-submit" disabled={busy}>{busy ? "กำลังดำเนินการ…" : recovery ? "บันทึกรหัสผ่านใหม่" : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
          </>}
          {recovery && !sent && <button type="button" disabled={busy} onClick={() => leave("/forgot-password")}>ลิงก์ใช้ไม่ได้? ขอใหม่</button>}
          <button type="button" disabled={busy} onClick={() => leave("/projects")}>{sent && recovery ? "กลับเข้า Nexus" : "กลับหน้าเข้าสู่ระบบ"}</button>
        </div>
      </form>
    </section>
  </main>;
}
