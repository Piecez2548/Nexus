import { describe, expect, it } from "vitest";
import { decryptDekFromPairing, encryptDekForPairing, parsePairingPayload } from "./pairingService";
import { exportDekRaw, generateDek } from "@/features/encryption/crypto/encryption";

describe("device pairing QR", () => {
  it("accepts only the versioned Nexus payload", () => {
    expect(parsePairingPayload("nexus-pair:v1:123e4567-e89b-12d3-a456-426614174000:secret-value")).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      secret: "secret-value",
    });
  });

  it.each(["https://example.com", "nexus-pair:v2:id:secret", "nexus-pair:v1:bad:secret", "nexus-pair:v1:"])(
    "rejects an untrusted QR payload: %s",
    (payload) => expect(() => parsePairingPayload(payload)).toThrow("PAIRING_INVALID_QR"),
  );

  it("transfers the DEK end-to-end with the QR secret", async () => {
    const original = await generateDek();
    const secret = "2Q8JYzL8vFYeNqOztc9-7mPF5Q2V6_xeFgL0xS1pKlk";
    const encrypted = await encryptDekForPairing(secret, original);
    const recovered = await decryptDekFromPairing(secret, encrypted.encryptedDek, encrypted.iv);
    expect(await exportDekRaw(recovered)).toBe(await exportDekRaw(original));
    await expect(decryptDekFromPairing(`${secret}x`, encrypted.encryptedDek, encrypted.iv)).rejects.toThrow();
  });
});
