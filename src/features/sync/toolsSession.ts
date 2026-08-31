import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "./store/authStore";

export const toolsOrigin = "https://nexus-tools-chi.vercel.app";

// One handler covers both the React navigation and the bundled Nexus All template.
export function installToolsSessionLinks() {
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (!anchor || anchor.origin !== toolsOrigin || anchor.pathname !== "/" || anchor.search || anchor.hash) return;
    event.preventDefault();
    openNexusTools();
  };
  document.addEventListener("click", click, true);
  return () => document.removeEventListener("click", click, true);
}

/** Called synchronously from a user click so mobile popup blockers allow the tab. */
export function openNexusTools() {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
  const child = window.open("about:blank", "_blank");
  if (!child) { window.location.assign(toolsOrigin); return; }
  let consumed = false;
  const cleanup = () => { window.removeEventListener("message", onMessage); clearTimeout(timeout); };
  const onMessage = (event: MessageEvent) => {
    if (consumed || event.origin !== toolsOrigin || event.source !== child || event.data?.type !== "nexus:ready" || event.data?.nonce !== nonce) return;
    consumed = true;
    cleanup();
    void (async () => {
      if (!supabase || !useAuthStore.getState().user || useAuthStore.getState().mfaPending) return;
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) return;
      const verified = await supabase.auth.getUser(data.session.access_token);
      if (verified.error || verified.data.user?.id !== useAuthStore.getState().user?.id) return;
      child.postMessage({ type: "nexus:session", nonce, access_token: data.session.access_token, refresh_token: data.session.refresh_token }, toolsOrigin);
    })().catch(() => { /* Tools falls back to its own sign-in screen. Never log credentials. */ });
  };
  window.addEventListener("message", onMessage);
  const timeout = setTimeout(cleanup, 20_000);
  child.location.replace(`${toolsOrigin}/?nexus_sso=${nonce}`);
}
