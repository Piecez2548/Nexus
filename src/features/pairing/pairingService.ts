import { supabase } from "@/lib/supabaseClient";
import { base64ToBytes, bytesToBase64, exportDekRaw, importDekRaw, generateRandomBytes } from "@/features/encryption/crypto/encryption";

const PREFIX = "nexus-pair:v1:";
const EXPIRES_MS = 2 * 60_000;

export interface PairingTicket { id: string; secret: string; payload: string; expiresAt: string }

function base64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(base64);
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(digest);
}
async function pairingKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", fromBase64Url(secret) as BufferSource);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptDekForPairing(secret: string, dek: CryptoKey): Promise<{ encryptedDek: string; iv: string }> {
  const key = await pairingKey(secret);
  const iv = generateRandomBytes(12);
  const rawDek = base64ToBytes(await exportDekRaw(dek));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, rawDek as BufferSource);
  return { encryptedDek: bytesToBase64(encrypted), iv: bytesToBase64(iv) };
}

export async function decryptDekFromPairing(secret: string, encryptedDek: string, iv: string): Promise<CryptoKey> {
  const key = await pairingKey(secret);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) as BufferSource }, key, base64ToBytes(encryptedDek) as BufferSource);
  return importDekRaw(bytesToBase64(decrypted));
}
async function currentUserId(): Promise<string> {
  const { data } = await supabase!.auth.getUser();
  if (!data.user) throw new Error("PAIRING_SIGN_IN_REQUIRED");
  return data.user.id;
}

export async function createPairingTicket(): Promise<PairingTicket> {
  if (!supabase) throw new Error("PAIRING_UNAVAILABLE");
  const userId = await currentUserId();
  const id = crypto.randomUUID();
  const secret = base64Url(generateRandomBytes(32));
  const expiresAt = new Date(Date.now() + EXPIRES_MS).toISOString();
  const { error } = await supabase.from("device_pairing_requests").insert({
    id, user_id: userId, secret_hash: await sha256(secret), expires_at: expiresAt,
  });
  if (error) throw error;
  return { id, secret, expiresAt, payload: `${PREFIX}${id}:${secret}` };
}

export function parsePairingPayload(payload: string): { id: string; secret: string } {
  if (!payload.startsWith(PREFIX)) throw new Error("PAIRING_INVALID_QR");
  const [id, secret] = payload.slice(PREFIX.length).split(":");
  if (!id || !secret || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("PAIRING_INVALID_QR");
  return { id, secret };
}

export async function approvePairing(payload: string, dek: CryptoKey): Promise<void> {
  if (!supabase) throw new Error("PAIRING_UNAVAILABLE");
  const { id, secret } = parsePairingPayload(payload);
  const { data, error } = await supabase.from("device_pairing_requests").select("secret_hash,status,expires_at").eq("id", id).single();
  if (error || !data) throw new Error("PAIRING_NOT_FOUND");
  if (data.status !== "pending" || Date.parse(data.expires_at) <= Date.now()) throw new Error("PAIRING_EXPIRED");
  if (data.secret_hash !== await sha256(secret)) throw new Error("PAIRING_INVALID_QR");
  const encrypted = await encryptDekForPairing(secret, dek);
  const { error: updateError } = await supabase.from("device_pairing_requests").update({
    status: "approved", encrypted_dek: encrypted.encryptedDek, dek_iv: encrypted.iv, approved_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  if (updateError) throw updateError;
}

export async function waitForPairing(ticket: PairingTicket, signal: AbortSignal): Promise<CryptoKey> {
  if (!supabase) throw new Error("PAIRING_UNAVAILABLE");
  while (!signal.aborted && Date.parse(ticket.expiresAt) > Date.now()) {
    const { data, error } = await supabase.from("device_pairing_requests").select("status,encrypted_dek,dek_iv").eq("id", ticket.id).single();
    if (error) throw error;
    if (data.status === "approved" && data.encrypted_dek && data.dek_iv) {
      await supabase.from("device_pairing_requests").delete().eq("id", ticket.id);
      return decryptDekFromPairing(ticket.secret, data.encrypted_dek, data.dek_iv);
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = window.setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, 1200);
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  throw new Error("PAIRING_EXPIRED");
}

export async function cancelPairing(id: string): Promise<void> {
  await supabase?.from("device_pairing_requests").delete().eq("id", id);
}
