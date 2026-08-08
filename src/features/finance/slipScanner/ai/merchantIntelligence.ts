// Merchant Intelligence (GS-044): build merchant profiles from slip-derived
// transactions — merging alias/duplicate spellings, grouping chains by a brand
// key, surfacing location variants, and computing spending frequency. Pure and
// deterministic. Note: chain grouping keys on the first (brand) token, which is
// a pragmatic heuristic — a generic first token (e.g. a city name) could
// over-group, so `merchantKey` is exposed for callers that want to override it.

export interface MerchantTxn {
  merchant: string;
  amount: number;
  date?: string;
}

export interface MerchantProfile {
  key: string; // brand/chain key
  displayName: string; // most representative raw name
  aliases: string[]; // distinct normalised names seen (location variants)
  isChain: boolean; // seen under more than one distinct name/location
  count: number; // spending frequency
  total: number;
  average: number;
  firstSeen?: string;
  lastSeen?: string;
}

function clean(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeMerchant(name: string): string {
  return clean(name);
}

// Brand/chain key — the first significant token of the cleaned name.
export function merchantKey(name: string): string {
  return clean(name).split(" ")[0] ?? "";
}

export function buildMerchantProfiles(txns: MerchantTxn[]): MerchantProfile[] {
  const groups = new Map<string, MerchantTxn[]>();
  for (const txn of txns) {
    const key = merchantKey(txn.merchant);
    if (key === "") continue;
    const list = groups.get(key);
    if (list) list.push(txn);
    else groups.set(key, [txn]);
  }

  const profiles: MerchantProfile[] = [];
  for (const [key, group] of groups) {
    const aliases = [...new Set(group.map((t) => normalizeMerchant(t.merchant)))];

    // Most frequent raw name → display name.
    const rawCounts = new Map<string, number>();
    for (const t of group) rawCounts.set(t.merchant, (rawCounts.get(t.merchant) ?? 0) + 1);
    const displayName = [...rawCounts.entries()].sort((a, b) => b[1] - a[1])[0]![0];

    const total = group.reduce((sum, t) => sum + t.amount, 0);
    const dates = group.map((t) => t.date).filter((d): d is string => typeof d === "string").sort();

    profiles.push({
      key,
      displayName,
      aliases,
      isChain: aliases.length > 1,
      count: group.length,
      total,
      average: group.length > 0 ? total / group.length : 0,
      firstSeen: dates[0],
      lastSeen: dates[dates.length - 1],
    });
  }

  return profiles.sort((a, b) => b.count - a.count);
}
