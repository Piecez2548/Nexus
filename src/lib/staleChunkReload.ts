// After a deploy, a tab still running the previous build can request a lazy
// chunk whose hashed file no longer exists. Reloading picks up the new build.
// One reload per window keeps a genuinely broken chunk from looping forever.
const RELOAD_KEY = "nexus-stale-chunk-reload";
const RELOAD_WINDOW_MS = 30_000;

export function installStaleChunkReload(
  reload: () => void = () => window.location.reload(),
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
  now: () => number = Date.now,
): () => void {
  const onPreloadError = (event: Event) => {
    let last = 0;
    try { last = Number(storage.getItem(RELOAD_KEY)) || 0; } catch { /* Storage blocked: fall through once. */ }
    // Already reloaded moments ago: let the router's error screen show instead.
    if (now() - last < RELOAD_WINDOW_MS) return;
    try { storage.setItem(RELOAD_KEY, String(now())); } catch { /* Best effort. */ }
    event.preventDefault();
    reload();
  };
  window.addEventListener("vite:preloadError", onPreloadError);
  return () => window.removeEventListener("vite:preloadError", onPreloadError);
}
