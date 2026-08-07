// A QR decoder returns the raw QR payload string found in an image's bytes,
// or null when the image has no readable QR. Deliberately abstract: the
// scanner depends on this interface, not on jsQR or any browser API, so the
// decoding backend is swappable and the detection logic is unit-testable with
// a fake decoder.
export interface QrDecoder {
  decode(bytes: Uint8Array): Promise<string | null>;
}

export interface QrDetectionResult {
  hasQr: boolean;
  // The raw QR payload — returned as-is, NOT parsed (payload parsing is a
  // later task, GS-010).
  payload: string | null;
}
