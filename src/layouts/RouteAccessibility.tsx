import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation";

// Mounted inside the route Suspense boundary: the heading and hash target
// exist before we announce/focus a completed client-side navigation.
export default function RouteAccessibility() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);
  const { language } = useTranslation();
  useEffect(() => {
    const previousLang = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previousLang; };
  }, [language]);
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const updateTitle = () => {
      const title = main.querySelector("h1")?.textContent;
      if (title) document.title = `${title} — Nexus`;
    };
    // Exit transitions and lazy routes can replace the heading after the
    // navigation effect. Observe this subtree, without polling or layout reads.
    const observer = new MutationObserver(updateTitle);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    updateTitle();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    const frame = requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      const title = main?.querySelector("h1")?.textContent;
      if (title) document.title = `${title} — Nexus`;
      let id = "";
      try { id = decodeURIComponent(hash.slice(1)); } catch { /* malformed hash is not a route failure */ }
      const target = id ? document.getElementById(id) : changed ? main : null;
      // A shortcut can open a modal before this frame runs (for example right
      // after the skip link). Completed route work must not steal modal focus.
      if (target && !document.querySelector('[role="dialog"][aria-modal="true"]')) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, language]);
  return null;
}
