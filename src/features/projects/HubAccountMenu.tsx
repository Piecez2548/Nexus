import { lazy, Suspense, useId, useRef, useState } from "react";
import { ChevronDown, Lock, LogOut, QrCode, UserRound } from "lucide-react";
import { Capacitor } from "@capacitor/core";

const MobilePairScanner = lazy(() => import("@/features/pairing/MobilePairScanner"));
import DropdownPanel from "@/components/ui/DropdownPanel";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";

export default function HubAccountMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const enabled = useAppLockStore(s => s.isEnabled());
  const lockHub = useAppLockStore(s => s.lockHub);
  const signOut = useAuthStore(s => s.signOut);
  useClickOutside(ref, () => setOpen(false));
  async function leave() {
    setPending(true);
    setError(false);
    try { await signOut(); } catch { setError(true); }
    finally { setPending(false); }
  }
  return <div className="hub-account-menu" ref={ref}>
    <button className="hub-account" type="button" aria-label={`เมนูบัญชี ${name}`} title={name} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>
      <span className="hub-account-avatar"><UserRound size={20} aria-hidden="true" /></span>
      <span className="hub-account-name">{name}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    <DropdownPanel open={open} className="hub-account-dropdown">
      <div id={id} role="region" aria-label="จัดการบัญชี">
        <button type="button" disabled={!enabled || pending} onClick={lockHub}><Lock size={18} aria-hidden="true" />ล็อคบัญชี</button>
        {!enabled && <p className="hub-menu-help">ยังไม่ได้ตั้งค่า PIN บนอุปกรณ์นี้</p>}
        {Capacitor.isNativePlatform() && <button type="button" disabled={pending} onClick={() => { setOpen(false); setScannerOpen(true); }}><QrCode size={18} aria-hidden="true" />สแกน QR เพื่อปลดล็อกคอม</button>}
        <button type="button" disabled={pending} onClick={() => void leave()}><LogOut size={18} aria-hidden="true" />{pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}</button>
        {error && <p role="alert" className="hub-menu-help">ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง</p>}
      </div>
    </DropdownPanel>
    {scannerOpen && <Suspense fallback={null}><MobilePairScanner onClose={() => setScannerOpen(false)} /></Suspense>}
  </div>;
}
