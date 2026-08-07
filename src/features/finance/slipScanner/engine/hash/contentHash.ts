// SHA-256 content hash over an image's raw bytes, via the Web Crypto API
// (same primitive as pinHash.ts). Used as the duplicate-prevention key —
// two byte-identical images share a hash and the second is skipped. A
// perceptual hash for near-duplicate/modified-image detection is a later
// task (GS-024, Image Hash Engine); this exact-bytes hash is the baseline
// GS-006 needs for duplicate prevention.
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
