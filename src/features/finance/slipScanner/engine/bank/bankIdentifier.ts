import { getBankPlugins } from "@/features/finance/slipScanner/engine/bank/bankRegistry";
import type { BankIdentification } from "@/features/finance/slipScanner/engine/bank/bankTypes";
import type { EmvcoPayload } from "@/features/finance/slipScanner/engine/emvco/emvcoPayloadParser";
import { findTag } from "@/features/finance/slipScanner/engine/emvco/emvcoTlv";

// The globally-unique identifier (sub-tag 00) of each merchant-account template
// in a payload — the signal a bank-specific rail is recognised by.
function accountGuids(payload: EmvcoPayload): string[] {
  const guids: string[] = [];
  for (const account of payload.merchantAccounts) {
    const guid = account.children ? findTag(account.children, "00")?.value : undefined;
    if (guid) guids.push(guid);
  }
  return guids;
}

// Identify the institution behind a parsed payload. Order of preference:
//   1. A registered plugin whose custom `match` accepts the payload, or whose
//      `aidGuids` prefix a merchant-account GUID (bank-specific QR rails).
//   2. The PromptPay rail, when the payload carries a PromptPay proxy — most
//      PromptPay QRs identify the rail, not the receiving bank (that only
//      becomes known from slip verification or OCR, resolved via
//      `identifyBankByCode`). Returns null when nothing recognises it.
export function identifyBank(payload: EmvcoPayload): BankIdentification | null {
  const guids = accountGuids(payload);

  for (const plugin of getBankPlugins()) {
    if (plugin.bank.id === "promptpay") continue; // handled as the fallback rail below

    if (plugin.match) {
      if (plugin.match(payload)) return { bank: plugin.bank, matchedBy: "aidGuid" };
      continue;
    }
    if (plugin.aidGuids?.some((prefix) => guids.some((g) => g.startsWith(prefix)))) {
      return { bank: plugin.bank, matchedBy: "aidGuid" };
    }
  }

  if (payload.promptPay) {
    const promptPay = getBankPlugins().find((p) => p.bank.id === "promptpay");
    if (promptPay) return { bank: promptPay.bank, matchedBy: "promptPayAid" };
  }

  return null;
}
