// SHA-256 hashing via the Web Crypto API, salted with a per-installation
// random value. This is a local-only privacy gate (no server, no real
// authentication) — proportionate against "someone glancing at the screen"
// or a shared/borrowed device, not against offline brute-forcing of
// localStorage contents.
export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
