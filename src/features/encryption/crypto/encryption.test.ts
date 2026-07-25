import { describe, expect, it } from "vitest";
import {
  deriveKek,
  generateDek,
  generateRandomBytes,
  wrapDek,
  unwrapDek,
  encryptField,
  decryptField,
  exportDekRaw,
  importDekRaw,
  type EncryptedEnvelope,
} from "./encryption";

describe("encryption primitives", () => {
  it("round-trips arbitrary JSON data through encryptField/decryptField", async () => {
    const dek = await generateDek();
    const payload = { title: "Coffee", amount: 120, tags: ["food", "morning"] };

    const envelope = await encryptField(dek, payload);
    const decrypted = await decryptField<typeof payload>(dek, envelope);

    expect(decrypted).toEqual(payload);
  });

  it("produces a different ciphertext each time (random IV per call)", async () => {
    const dek = await generateDek();
    const a = await encryptField(dek, { title: "Coffee" });
    const b = await encryptField(dek, { title: "Coffee" });

    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("rejects decryption with the wrong key", async () => {
    const dekA = await generateDek();
    const dekB = await generateDek();
    const envelope = await encryptField(dekA, { title: "Coffee" });

    await expect(decryptField(dekB, envelope)).rejects.toThrow();
  });

  it("rejects a tampered ciphertext", async () => {
    const dek = await generateDek();
    const envelope = await encryptField(dek, { title: "Coffee" });

    const tampered: EncryptedEnvelope = {
      ...envelope,
      ct: envelope.ct.slice(0, -4) + (envelope.ct.slice(-4) === "AAAA" ? "BBBB" : "AAAA"),
    };

    await expect(decryptField(dek, tampered)).rejects.toThrow();
  });

  it("rejects a tampered IV", async () => {
    const dek = await generateDek();
    const envelope = await encryptField(dek, { title: "Coffee" });

    const tampered: EncryptedEnvelope = {
      ...envelope,
      iv: envelope.iv.slice(0, -2) + (envelope.iv.slice(-2) === "AA" ? "BB" : "AA"),
    };

    await expect(decryptField(dek, tampered)).rejects.toThrow();
  });

  it("wraps and unwraps a DEK with a PIN-derived KEK", async () => {
    const dek = await generateDek();
    const salt = generateRandomBytes(16);
    const kek = await deriveKek("1234", salt);

    const wrapped = await wrapDek(dek, kek);
    const unwrapped = await unwrapDek(wrapped, kek);

    // Prove it's really the same key by round-tripping data through both.
    const envelope = await encryptField(dek, { ok: true });
    const decrypted = await decryptField<{ ok: boolean }>(unwrapped, envelope);
    expect(decrypted).toEqual({ ok: true });
  });

  it("fails to unwrap with a KEK derived from the wrong PIN", async () => {
    const dek = await generateDek();
    const salt = generateRandomBytes(16);
    const correctKek = await deriveKek("1234", salt);
    const wrongKek = await deriveKek("9999", salt);

    const wrapped = await wrapDek(dek, correctKek);

    await expect(unwrapDek(wrapped, wrongKek)).rejects.toThrow();
  });

  it("fails to unwrap with a KEK derived from a different salt", async () => {
    const dek = await generateDek();
    const kek = await deriveKek("1234", generateRandomBytes(16));
    const wrapped = await wrapDek(dek, kek);

    const differentSaltKek = await deriveKek("1234", generateRandomBytes(16));

    await expect(unwrapDek(wrapped, differentSaltKek)).rejects.toThrow();
  });

  it("round-trips a DEK through raw export/import for escrow", async () => {
    const dek = await generateDek();
    const raw = await exportDekRaw(dek);
    const restored = await importDekRaw(raw);

    const envelope = await encryptField(dek, { hello: "world" });
    const decrypted = await decryptField<{ hello: string }>(restored, envelope);
    expect(decrypted).toEqual({ hello: "world" });
  });
});
