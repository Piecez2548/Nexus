// Transaction Linking (GS-047): detect related transactions and emit a
// relationship graph (directed links). Deterministic heuristics over the
// transactions' amount/date/type/merchant — refund, transfer+fee, installment,
// split-payment, cashback. Advisory: it proposes links for the user to review,
// it doesn't alter transactions.

export type LinkType = "refund" | "transfer-fee" | "installment" | "split-payment" | "cashback";

export interface LinkableTxn {
  id: string;
  amount: number;
  type?: string; // "expense" | "income" | "transfer" | "refund" | ...
  date?: string; // YYYY-MM-DD
  merchant?: string;
}

export interface TransactionLink {
  fromId: string;
  toId: string;
  type: LinkType;
}

const FEE_MAX = 50; // a "fee" is a small expense
const CASHBACK_MAX_DAYS = 3;

function norm(value: string | undefined): string {
  return value ? value.trim().toLowerCase() : "";
}

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / 86_400_000);
}

export function linkTransactions(txns: LinkableTxn[]): TransactionLink[] {
  const links: TransactionLink[] = [];
  const seen = new Set<string>();
  const addLink = (fromId: string, toId: string, type: LinkType): void => {
    const key = `${fromId}->${toId}:${type}`;
    if (fromId !== toId && !seen.has(key)) {
      seen.add(key);
      links.push({ fromId, toId, type });
    }
  };

  const expenses = txns.filter((t) => t.type === "expense");

  // Refund: a refund/income matching a prior expense's merchant + amount.
  for (const r of txns) {
    if (r.type !== "refund" && !/refund|คืนเงิน/i.test(norm(r.merchant))) continue;
    const match = expenses.find((e) => norm(e.merchant) === norm(r.merchant) && e.amount === r.amount);
    if (match) addLink(match.id, r.id, "refund");
  }

  // Transfer + fee: a small fee expense on the same day as a transfer.
  for (const fee of txns) {
    const isFee = fee.type === "expense" && (fee.amount <= FEE_MAX || /fee|ค่าธรรมเนียม/i.test(norm(fee.merchant)));
    if (!isFee) continue;
    const transfer = txns.find((t) => t.type === "transfer" && t.date === fee.date);
    if (transfer) addLink(transfer.id, fee.id, "transfer-fee");
  }

  // Cashback: a small income shortly after an expense at the same merchant.
  for (const c of txns) {
    const isCashback = c.type === "income" && (c.amount <= FEE_MAX || /cashback|เงินคืน/i.test(norm(c.merchant)));
    if (!isCashback) continue;
    const source = expenses.find((e) => {
      if (norm(e.merchant) !== norm(c.merchant)) return false;
      const gap = daysBetween(e.date, c.date);
      return gap !== null && gap >= 0 && gap <= CASHBACK_MAX_DAYS;
    });
    if (source) addLink(source.id, c.id, "cashback");
  }

  // Installment: 3+ expenses with the same merchant AND amount → chain to the first.
  const byMerchantAmount = new Map<string, LinkableTxn[]>();
  for (const e of expenses) {
    const key = `${norm(e.merchant)}|${e.amount}`;
    (byMerchantAmount.get(key) ?? byMerchantAmount.set(key, []).get(key)!).push(e);
  }
  for (const group of byMerchantAmount.values()) {
    if (group.length >= 3) {
      const [first, ...rest] = group;
      for (const t of rest) addLink(first!.id, t.id, "installment");
    }
  }

  // Split payment: 2+ expenses to the same merchant on the same day (and not an
  // installment set) → link to the first.
  const byMerchantDate = new Map<string, LinkableTxn[]>();
  for (const e of expenses) {
    if (!e.date) continue;
    const key = `${norm(e.merchant)}|${e.date}`;
    (byMerchantDate.get(key) ?? byMerchantDate.set(key, []).get(key)!).push(e);
  }
  for (const group of byMerchantDate.values()) {
    if (group.length >= 2) {
      const [first, ...rest] = group;
      for (const t of rest) addLink(first!.id, t.id, "split-payment");
    }
  }

  return links;
}
