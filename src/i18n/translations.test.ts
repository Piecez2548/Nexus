import { describe, expect, it } from "vitest";
import { translations } from "./translations";

// CI-enforced key-parity check (closes a TECHNICAL_DEBT.md gap): a one-off
// manual key-by-key diff was previously the only thing catching a key added
// to one language and never mirrored to the other -- nothing stopped it
// from drifting again on the next change. This test walks both `en` and
// `th` dictionaries recursively and fails with the exact key paths whenever
// one language has a key the other doesn't.
function collectLeafKeyPaths(node: unknown, prefix = ""): Set<string> {
  const keys = new Set<string>();

  if (typeof node !== "object" || node === null) {
    if (prefix) keys.add(prefix);
    return keys;
  }

  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      for (const nested of collectLeafKeyPaths(value, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }

  return keys;
}

function difference(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((key) => !b.has(key)).sort();
}

describe("translations (en/th key parity)", () => {
  it("has no key present in `en` but missing from `th`", () => {
    const enKeys = collectLeafKeyPaths(translations.en);
    const thKeys = collectLeafKeyPaths(translations.th);
    expect(difference(enKeys, thKeys)).toEqual([]);
  });

  it("has no key present in `th` but missing from `en`", () => {
    const enKeys = collectLeafKeyPaths(translations.en);
    const thKeys = collectLeafKeyPaths(translations.th);
    expect(difference(thKeys, enKeys)).toEqual([]);
  });
});
