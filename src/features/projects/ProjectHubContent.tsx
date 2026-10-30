import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useAppSettingsStore, type ThemeMode } from "@/store/appSettingsStore";
import markup from "./projectHub.html?raw";
import "./projectHub.css";
import { initializeMonogramTilt } from "./monogramTilt";

const trustedMarkup = { __html: markup };

export function HubSignInLink() {
  return <Link className="hub-account" to="/projects?returnTo=%2Fdashboard">เข้าสู่ระบบ</Link>;
}

export default function ProjectHubContent({ account }: { account: ReactNode }) {
  const [accountSlot, setAccountSlot] = useState<Element | null>(null);
  const [themeSlot, setThemeSlot] = useState<Element | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setAccountSlot(root.current?.querySelector("[data-account-slot]") ?? null);
    setThemeSlot(root.current?.querySelector("[data-theme-slot]") ?? null);
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = "Nexus All — Projects";
    document.documentElement.lang = "th";
    const cleanupTilt = initializeMonogramTilt(root.current!);
    return () => {
      cleanupTilt();
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, []);

  // Trusted, bundled presentation only. Never interpolate user data or URLs
  // here. The hub is public; only Main's routes require a signed-in session.
  return <>
    <div id="top" className="project-hub" ref={root} dangerouslySetInnerHTML={trustedMarkup} />
    {themeSlot && createPortal(<HubThemeControl />, themeSlot)}
    {accountSlot && createPortal(account, accountSlot)}
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
