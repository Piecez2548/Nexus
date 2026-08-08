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

// Returns the first bank whose keyword appears in the text, or null. "กรุงเทพ"
// (Bangkok) is checked as part of "ธนาคารกรุงเทพ"/"กรุงเทพ" — placed after the
// other banks so a more specific match wins first.
export function identifyBankFromText(text: string): BankIdentification | null {
  const haystack = text.toLowerCase();
  for (const { id, keywords } of BANK_TEXT_KEYWORDS) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      const bank = getBankPlugins().find((p) => p.bank.id === id)?.bank;
      if (bank) return { bank, matchedBy: "ocrText" };
    }
  }
  return null;
}
