import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";

// A financial institution (or the PromptPay rail) the scanner can recognise on
// a slip. `code` is the Bank of Thailand 3-digit institution code used across
// PromptPay / interbank transfer / slip verification; it is null for PromptPay
// itself, which is a shared rail rather than a single bank.
export interface BankInfo {
  id: string;
  code: string | null;
  name: string;
  shortName: string;
}

export type BankMatchSource = "bankCode" | "promptPayAid" | "aidGuid" | "ocrText";

export interface BankIdentification {
  bank: BankInfo;
  matchedBy: BankMatchSource;
}

// A plug-in describing how to recognise one institution. New banks are added by
// registering a plugin — the identifier never hard-codes its bank list. A
// plugin matches when a merchant-account GUID starts with one of `aidGuids`
// (bank-specific QR rails), or via the shared code table by `bank.code`. An
// optional `match` overrides the default derivation for bespoke rules.
export interface BankPlugin {
  bank: BankInfo;
  aidGuids?: string[];
  match?: (payload: EmvcoPayload) => boolean;
}
