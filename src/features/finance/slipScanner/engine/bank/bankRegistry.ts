import type { BankInfo, BankPlugin } from "@/features/finance/slipScanner/engine/bank/bankTypes";

// Default institutions, keyed by the real Bank of Thailand 3-digit codes used
// in PromptPay / interbank / slip-verification payloads. These are published,
// standardised codes — not guessed. PromptPay is included as a rail (code null)
// because most PromptPay QRs identify the rail, not the receiving bank. Adding
// a new bank is a `registerBankPlugin` call, never an edit to the identifier.
const DEFAULT_PLUGINS: readonly BankPlugin[] = [
  { bank: { id: "bbl", code: "002", name: "Bangkok Bank", shortName: "BBL" } },
  { bank: { id: "kbank", code: "004", name: "Kasikornbank", shortName: "KBank" } },
  { bank: { id: "ktb", code: "006", name: "Krungthai Bank", shortName: "Krungthai" } },
  { bank: { id: "ttb", code: "011", name: "TMBThanachart Bank", shortName: "TTB" } },
  { bank: { id: "scb", code: "014", name: "Siam Commercial Bank", shortName: "SCB" } },
  { bank: { id: "uob", code: "024", name: "United Overseas Bank (Thai)", shortName: "UOB" } },
  { bank: { id: "bay", code: "025", name: "Bank of Ayudhya", shortName: "Krungsri" } },
  { bank: { id: "gsb", code: "030", name: "Government Savings Bank", shortName: "GSB" } },
  { bank: { id: "baac", code: "034", name: "Bank for Agriculture and Agricultural Co-operatives", shortName: "BAAC" } },
  { bank: { id: "promptpay", code: null, name: "PromptPay", shortName: "PromptPay" } },
  // เป๋าตัง (Pao Tang): Krungthai-operated but a digital wallet app, not a
  // traditional bank account -- same "rail, not a bank" reasoning as
  // PromptPay above (code null, unreachable via identifyBankByCode).
  // Package Notification Capture (Phase 1) needs its own id/label here
  // rather than mapping its notifications to "Krungthai", since a user
  // thinks of เป๋าตัง transactions as เป๋าตัง, not their KTB bank account.
  { bank: { id: "paotang", code: null, name: "เป๋าตัง", shortName: "เป๋าตัง" } },
];

// Mutable registry, seeded from the defaults. Kept as a module-level list so
// plugins registered anywhere are visible to the identifier.
let registry: BankPlugin[] = [...DEFAULT_PLUGINS];

// Register (or replace, by bank id) a bank plugin. Returns nothing; later
// lookups and identification see it immediately.
export function registerBankPlugin(plugin: BankPlugin): void {
  const index = registry.findIndex((p) => p.bank.id === plugin.bank.id);
  if (index >= 0) registry[index] = plugin;
  else registry.push(plugin);
}

// Restore the built-in defaults (drops any registered plugins). Primarily for
// test isolation.
export function resetBankRegistry(): void {
  registry = [...DEFAULT_PLUGINS];
}

export function getBankPlugins(): readonly BankPlugin[] {
  return registry;
}

// Resolve a Bank of Thailand institution code to a bank. This is the reusable
// core other stages (OCR, future slip verification) call once they have a code
// from wherever it appears. Returns null for unknown or rail-only (null) codes.
export function identifyBankByCode(code: string): BankInfo | null {
  const normalized = code.trim();
  if (normalized === "") return null;
  return registry.find((p) => p.bank.code !== null && p.bank.code === normalized)?.bank ?? null;
}
