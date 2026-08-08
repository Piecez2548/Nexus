// Smart Learning application (GS-045): pure helpers that apply locally-stored
// user corrections — merchant mapping, OCR text fixes, and bank naming — to
// freshly-extracted data. Preferred-category learning lives in
// categoryLearningStore (GS-043); this covers the remaining correction types.
// All learning is local (no cloud AI).

export function learningKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Replace a merchant name with the user's corrected canonical, if learned.
export function applyMerchantMapping(name: string, map: Record<string, string>): string {
  return map[learningKey(name)] ?? name;
}

// Apply learned OCR text fixes (wrong → right substring replacements). Longer
// wrong-strings are applied first so a specific fix wins over a broader one.
export function applyOcrCorrections(text: string, corrections: Record<string, string>): string {
  let out = text;
  const entries = Object.entries(corrections).sort((a, b) => b[0].length - a[0].length);
  for (const [wrong, right] of entries) {
    if (wrong !== "") out = out.split(wrong).join(right);
  }
  return out;
}

// Resolve a bank id to the user's preferred display name, if set.
export function applyBankNaming(bankId: string, map: Record<string, string>, fallback: string = bankId): string {
  return map[bankId] ?? fallback;
}
