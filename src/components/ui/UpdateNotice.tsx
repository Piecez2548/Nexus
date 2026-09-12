import { useEffect, useState } from "react";

/** Never reload automatically: another route may contain unsaved work. */
export default function UpdateNotice() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const serviceWorker = navigator.serviceWorker;
    let hadController = Boolean(serviceWorker.controller);
    const changed = () => {
      if (hadController) setAvailable(true);
      hadController = true;
    };
    serviceWorker.addEventListener("controllerchange", changed);
    return () => serviceWorker.removeEventListener("controllerchange", changed);
  }, []);
  if (!available) return null;
  return <aside className="nexus-update-notice" aria-label="อัปเดตเว็บไซต์">
    <p role="status">มีเวอร์ชันใหม่ กรุณาบันทึกงานก่อนรีเฟรช</p>
    <button type="button" onClick={() => window.location.reload()}>รีเฟรชเวอร์ชันใหม่</button>
    <button type="button" onClick={() => setAvailable(false)}>ไว้ภายหลัง</button>
  </aside>;
}
