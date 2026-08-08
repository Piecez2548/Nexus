// Bank Template Engine (GS-030): per-bank presentation + extraction metadata
// (colors, a logo placeholder, OCR label hints, and which parser handles the
// bank), behind a registry so future banks are added by registering a template
// — never by editing business logic. Complements the bank *identifier*
// (GS-011). Brand colors are the banks' publicly-known approximate hues (used
// only for UI accenting); no real logo assets are bundled — a text/initials
// placeholder stands in.

export interface BankOcrLabels {
  amount: string[];
  date: string[];
  reference: string[];
  recipient: string[];
}

export interface BankTemplate {
  bankId: string;
  displayName: string;
  shortName: string;
  colors: { primary: string; onPrimary: string };
  logoText: string; // initials placeholder — no bundled logo image
  ocrLabels: BankOcrLabels;
  parserId: string; // the parser that handles this bank's slips
}

// Shared default OCR label hints (Thai + English). Per-bank overrides can be
// supplied via a registered template once real slip specimens exist; guessing
// per-bank labels without specimens would be inventing, so all seeds share this.
const DEFAULT_OCR_LABELS: BankOcrLabels = {
  amount: ["จำนวน", "จำนวนเงิน", "amount"],
  date: ["วันที่", "date"],
  reference: ["เลขที่รายการ", "รหัสอ้างอิง", "หมายเลขอ้างอิง", "reference", "ref"],
  recipient: ["ไปยัง", "ถึง", "ผู้รับเงิน", "to", "name"],
};

const DEFAULT_PARSER = "emvco-ocr"; // shared EMVCo (GS-010) + OCR (GS-028) pipeline

interface SeedTemplate {
  bankId: string;
  displayName: string;
  shortName: string;
  primary: string;
  onPrimary?: string;
}

// Brand-approximate primary colours for the institutions from GS-011.
const SEEDS: readonly SeedTemplate[] = [
  { bankId: "bbl", displayName: "Bangkok Bank", shortName: "BBL", primary: "#1e4598" },
  { bankId: "kbank", displayName: "Kasikornbank", shortName: "KBank", primary: "#00a950" },
  { bankId: "ktb", displayName: "Krungthai Bank", shortName: "Krungthai", primary: "#00a6e3" },
  { bankId: "ttb", displayName: "TMBThanachart Bank", shortName: "TTB", primary: "#001a70" },
  { bankId: "scb", displayName: "Siam Commercial Bank", shortName: "SCB", primary: "#4e2e7f" },
  { bankId: "uob", displayName: "United Overseas Bank (Thai)", shortName: "UOB", primary: "#005eb8" },
  { bankId: "bay", displayName: "Bank of Ayudhya", shortName: "Krungsri", primary: "#fec10e", onPrimary: "#1a1a1a" },
  { bankId: "gsb", displayName: "Government Savings Bank", shortName: "GSB", primary: "#ec008c" },
  { bankId: "baac", displayName: "BAAC", shortName: "BAAC", primary: "#00693e" },
  { bankId: "promptpay", displayName: "PromptPay", shortName: "PromptPay", primary: "#003d6a" },
];

function seedToTemplate(seed: SeedTemplate): BankTemplate {
  return {
    bankId: seed.bankId,
    displayName: seed.displayName,
    shortName: seed.shortName,
    colors: { primary: seed.primary, onPrimary: seed.onPrimary ?? "#ffffff" },
    logoText: seed.shortName,
    ocrLabels: DEFAULT_OCR_LABELS,
    parserId: DEFAULT_PARSER,
  };
}

function buildDefaults(): Map<string, BankTemplate> {
  const map = new Map<string, BankTemplate>();
  for (const seed of SEEDS) map.set(seed.bankId, seedToTemplate(seed));
  return map;
}

let registry = buildDefaults();

// Register (or replace, by bankId) a bank template — the extension point for
// future banks. Missing OCR labels / parser fall back to the shared defaults.
export function registerBankTemplate(template: Partial<BankTemplate> & { bankId: string }): void {
  const existing = registry.get(template.bankId);
  registry.set(template.bankId, {
    displayName: template.displayName ?? existing?.displayName ?? template.bankId,
    shortName: template.shortName ?? existing?.shortName ?? template.bankId,
    colors: template.colors ?? existing?.colors ?? { primary: "#3f3f46", onPrimary: "#ffffff" },
    logoText: template.logoText ?? existing?.logoText ?? (template.shortName ?? template.bankId),
    ocrLabels: template.ocrLabels ?? existing?.ocrLabels ?? DEFAULT_OCR_LABELS,
    parserId: template.parserId ?? existing?.parserId ?? DEFAULT_PARSER,
    bankId: template.bankId,
  });
}

export function getBankTemplate(bankId: string): BankTemplate | null {
  return registry.get(bankId) ?? null;
}

export function getAllBankTemplates(): BankTemplate[] {
  return [...registry.values()];
}

export function resetBankTemplates(): void {
  registry = buildDefaults();
}
