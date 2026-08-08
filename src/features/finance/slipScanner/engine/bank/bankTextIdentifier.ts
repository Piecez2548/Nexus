import { getBankPlugins } from "@/features/finance/slipScanner/engine/bank/bankRegistry";
import type { BankIdentification } from "@/features/finance/slipScanner/engine/bank/bankTypes";

// Identify a bank from OCR text (GS-011 companion). Most real Thai *completed*
// slips carry a slip-verification QR (not an EMVCo payment QR), so the QR path
// yields no bank — the bank name/logo text on the slip is then the best signal.
// Keyword table is Thai + English + common abbreviations, most-distinctive-first.
const BANK_TEXT_KEYWORDS: Array<{ id: string; keywords: string[] }> = [
  { id: "scb", keywords: ["scb", "ไทยพาณิชย์", "siam commercial"] },
  { id: "kbank", keywords: ["kbank", "kasikorn", "กสิกร", "k plus", "k+"] },
  { id: "ktb", keywords: ["krungthai", "กรุงไทย", "ktb", "krung thai"] },
  { id: "bbl", keywords: ["bangkok bank", "ธนาคารกรุงเทพ", "กรุงเทพ", "bualuang", "bbl"] },
  { id: "bay", keywords: ["krungsri", "กรุงศรี", "ayudhya", "bay"] },
  { id: "ttb", keywords: ["ttb", "ทีทีบี", "tmb", "thanachart", "ธนชาต"] },
  { id: "uob", keywords: ["uob", "ยูโอบี"] },
  { id: "gsb", keywords: ["gsb", "ออมสิน", "government savings"] },
  { id: "baac", keywords: ["baac", "ธ.ก.ส", "ธกส", "เพื่อการเกษตร"] },
  { id: "promptpay", keywords: ["promptpay", "พร้อมเพย์", "prompt pay"] },
];

// Identify the bank by the *earliest-appearing* name keyword in the text. On a
// transfer/bill slip the payer's own bank is printed at the top (the account
// the money left), while other bank names can appear lower — e.g. a merchant
// called "SCB มณี SHOP" on a KBank slip. Earliest-position wins so the payer's
// bank (the one relevant to the user's expense) is chosen over a name buried in
// the recipient/merchant text.
export function identifyBankFromText(text: string): BankIdentification | null {
  const haystack = text.toLowerCase();

  let bestId: string | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const { id, keywords } of BANK_TEXT_KEYWORDS) {
    for (const kw of keywords) {
      const index = haystack.indexOf(kw.toLowerCase());
      if (index >= 0 && index < bestIndex) {
        bestIndex = index;
        bestId = id;
      }
    }
  }

  if (bestId === null) return null;
  const bank = getBankPlugins().find((p) => p.bank.id === bestId)?.bank;
  return bank ? { bank, matchedBy: "ocrText" } : null;
}
