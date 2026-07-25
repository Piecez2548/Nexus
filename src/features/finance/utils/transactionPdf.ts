import type { jsPDF } from "jspdf";

import type { Transaction } from "@/features/finance/types";

// jsPDF (plus its autotable plugin) is a heavy dependency only needed by
// the "Export PDF" button — imported dynamically so it isn't bundled into
// every page that happens to render this file's exports.
export async function buildTransactionsPdf(transactions: Transaction[]): Promise<jsPDF> {
  const [{ jsPDF: JsPdf }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new JsPdf();

  doc.setFontSize(16);
  doc.text("Nexus Finance - Transactions", 14, 16);

  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleDateString("th-TH")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Date", "Title", "Type", "Category", "Account", "Amount"]],
    body: transactions.map((t) => [
      t.date,
      t.title,
      t.type,
      t.category ?? "-",
      t.type === "transfer" ? `${t.account} -> ${t.toAccount ?? "-"}` : t.account,
      `${t.type === "expense" ? "-" : ""}${t.amount.toLocaleString()}`,
    ]),
  });

  return doc;
}

export async function downloadTransactionsPdf(transactions: Transaction[]): Promise<void> {
  const doc = await buildTransactionsPdf(transactions);
  doc.save(`nexus-transactions-${new Date().toISOString().slice(0, 10)}.pdf`);
}
