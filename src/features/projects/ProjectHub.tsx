import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAppSettingsStore, type ThemeMode } from "@/store/appSettingsStore";
import HubAccountMenu from "./HubAccountMenu";
import AppLockGate from "@/features/lock/components/AppLockGate";
import { useAppLockStore } from "@/store/appLockStore";
import { useAuthStore } from "@/features/sync/store/authStore";
import markup from "./projectHub.html?raw";
import "./projectHub.css";
import { initializeMonogramTilt } from "./monogramTilt";

const trustedMarkup = { __html: markup };

export default function ProjectHub() {
  const hubLockRequired = useAppLockStore(s => s.hubLockRequired);
  return hubLockRequired ? <AppLockGate><ProjectHubContent /></AppLockGate> : <ProjectHubContent />;
}

function ProjectHubContent() {
  const user = useAuthStore((state) => state.user);
  const [accountSlot, setAccountSlot] = useState<Element | null>(null);
  const [themeSlot, setThemeSlot] = useState<Element | null>(null);
  const metadata = user?.user_metadata;
  const profileName = [metadata?.first_name, metadata?.last_name].filter((value) => typeof value === "string" && value.trim()).join(" ");
  const accountName = profileName || (typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "") || user?.email || "บัญชีของฉัน";
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setAccountSlot(root.current?.querySelector("[data-account-slot]") ?? null);
    setThemeSlot(root.current?.querySelector("[data-theme-slot]") ?? null);
    const previousTitle = document.title;
    document.title = "Nexus All — Projects";
    const cleanupTilt = initializeMonogramTilt(root.current!);
    return () => {
      cleanupTilt();
      document.title = previousTitle;
    };
  }, []);

  // Trusted, bundled presentation only. Never interpolate user data or URLs
  // here. The hub is public; only Main's routes require a signed-in session.
  return <>
    <div id="top" className="project-hub" ref={root} dangerouslySetInnerHTML={trustedMarkup} />
    {themeSlot && createPortal(<HubThemeControl />, themeSlot)}
    {accountSlot && createPortal(user
      ? <HubAccountMenu name={accountName} />
      : <Link className="hub-account" to="/projects?returnTo=%2Fdashboard">เข้าสู่ระบบ</Link>, accountSlot)}
  </>;
}

function HubThemeControl() {
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const setThemeMode = useAppSettingsStore((state) => state.setThemeMode);
  return (
    <label className="hub-theme-control">
      <span>ธีม</span>
      <select aria-label="เลือกธีมสี" value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)}>
        <option value="system">ตามระบบ</option>
        <option value="light">สว่าง</option>
        <option value="dark">มืด</option>
        <option value="mono">โมโน</option>
      </select>
    </label>
  );
}
