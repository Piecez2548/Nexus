// Cheap, Supabase-free checks so public pages only load the account stack when
// a session or an auth callback could actually be present.
export function hasSavedSession(): boolean {
  try {
    return Object.keys(localStorage).some((key) => key.startsWith("sb-") && key.endsWith("-auth-token"));
  } catch {
    return false;
  }
}

export function hasAuthCallback(location: Pick<Location, "hash" | "search"> = window.location): boolean {
  const hash = new URLSearchParams(location.hash.slice(1));
  const search = new URLSearchParams(location.search);
  return hash.has("access_token") || hash.has("type") || hash.has("error_description") || search.has("code");
}

// Any stored lock state means the hub PIN gate must be evaluated.
export function hasLockState(): boolean {
  try {
    return localStorage.getItem("nexus-app-lock") !== null || localStorage.getItem("nexus-lock-signal") !== null;
  } catch {
    return true;
  }
}

export function needsAccountStack(): boolean {
  return hasSavedSession() || hasAuthCallback() || hasLockState();
}
