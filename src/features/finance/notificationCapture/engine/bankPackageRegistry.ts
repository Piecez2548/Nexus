// Maps a Thai banking app's Android package name to the SAME bank id used
// throughout the rest of the slip scanner (bankRegistry.ts) -- so a
// notification-derived candidate's bankId lines up with everything else that
// already understands those ids (categorization, Import History's per-bank
// grouping, etc). Package name is an exact, reliable signal (we know exactly
// which app posted the notification), unlike bankTextIdentifier.ts's fuzzy
// keyword matching over OCR text -- so this is a flat lookup, not a scored
// match.
//
// Phase 1 (Payment Notification Capture): SCB, K PLUS, Krungthai NEXT only.
// SCB Easy and K PLUS confirmed against a real device (`pm list packages`);
// K PLUS additionally confirmed end-to-end with a real payment. Krungthai
// NEXT confirmed via `aapt2 dump badging` against the real installed APK
// (application-label "NEXT") -- the original guess ("com.ktb.next") was
// wrong; "com.ktb.customer.qr" is a different app (เป๋าตัง/Pao Tang).
export const BANK_APP_PACKAGES: Readonly<Record<string, string>> = {
  "com.scb.phone": "scb", // SCB Easy
  "com.kasikorn.retail.mbanking.wap": "kbank", // K PLUS
  "ktbcs.netbank": "ktb", // Krungthai NEXT
};

export function bankIdForPackage(packageName: string): string | null {
  return BANK_APP_PACKAGES[packageName] ?? null;
}
