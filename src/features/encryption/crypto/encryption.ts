// Core crypto primitives for local encryption-at-rest. Nothing in this file
// touches Dexie, Zustand, or Supabase — it's pure WebCrypto plumbing so the
// higher-risk pieces (session key wiring, the migration) can be tested and
// reasoned about independently of it.

// OWASP's current minimum for PBKDF2-HMAC-SHA256 (2023 guidance). Benchmark
// on real target hardware (including the Android build) before shipping —
// revisit only if unlock is actually too slow in practice.
export const PBKDF2_ITERATIONS = 600_000;

// AES-GCM's recommended IV size. Generated fresh per encryption call — never
// reused under the same key.
export const GCM_IV_BYTES = 12;

// Bumped only if the envelope's crypto parameters ever change, so future
// code can tell old and new envelopes apart.
export const ENVELOPE_VERSION = 1;

export interface EncryptedEnvelope {
  v: number;
  iv: string; // base64
  ct: string; // base64 (ciphertext + GCM auth tag)
}

export interface WrappedKey {
  wrapped: string; // base64
  iv: string; // base64
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const toBase64 = bytesToBase64;
const fromBase64 = base64ToBytes;

export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derives a Key-Encryption-Key from a secret (PIN or account password) via
 * PBKDF2. Non-extractable and scoped to wrapKey/unwrapKey only — a KEK is
 * never used to encrypt data directly, only to wrap/unwrap a DEK.
 */
export async function deriveKek(
  secret: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

/** Generates a new Data Encryption Key. Extractable — needed for escrow export. */
export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<WrappedKey> {
  const iv = generateRandomBytes(GCM_IV_BYTES);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv: iv as BufferSource });
  return { wrapped: toBase64(wrapped), iv: toBase64(iv) };
}

export async function unwrapDek(wrappedKey: WrappedKey, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(wrappedKey.wrapped) as BufferSource,
    kek,
    { name: "AES-GCM", iv: fromBase64(wrappedKey.iv) as BufferSource },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/** Encrypts an arbitrary JSON-serializable value into a storable envelope. */
export async function encryptField(dek: CryptoKey, data: unknown): Promise<EncryptedEnvelope> {
  const iv = generateRandomBytes(GCM_IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    dek,
    plaintext as BufferSource
  );
  return { v: ENVELOPE_VERSION, iv: toBase64(iv), ct: toBase64(ciphertext) };
}

/** Reverses encryptField. Throws (GCM auth failure) on the wrong key or a tampered envelope. */
export async function decryptField<T>(dek: CryptoKey, envelope: EncryptedEnvelope): Promise<T> {
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ct);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    dek,
    ciphertext as BufferSource
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

/** Exports the raw DEK bytes for server-side escrow only — never for local storage. */
export async function exportDekRaw(dek: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", dek);
  return toBase64(raw);
}

export async function importDekRaw(base64: string): Promise<CryptoKey> {
  const raw = fromBase64(base64);
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}
