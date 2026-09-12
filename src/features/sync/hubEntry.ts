export function isHubPath(path: string) {
  return ["/projects", "/projects/", "/projects/index.html"].includes(path);
}

// A return destination only restores navigation after authentication; never access.
export function mainReturnPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const base = "https://nexus.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base || isHubPath(url.pathname)) return null;
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}
