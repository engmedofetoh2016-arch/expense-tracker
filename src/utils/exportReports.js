/**
 * @param {Array<{ date: string, description: string, category: string, type: string, amount: number, id?: number }>} transactions
 * @param {Record<string, string>} t translations object with categories map
 */
export function mapTransactionsForExport(transactions, t) {
  return transactions.map((tx) => ({
    date: tx.date,
    description: tx.description,
    category: t.categories[tx.category] ?? tx.category,
    typeLabel: tx.type === "income" ? t.incomeType : t.expenseType,
    amount: Number(tx.amount),
    kind: tx.type,
  }));
}

/**
 * @param {ReturnType<typeof mapTransactionsForExport>} rows
 */
export async function exportTransactionsExcel({ rows, t, filename }) {
  const XLSX = await import("xlsx");
  const sheetRows = rows.map((r) => ({
    [t.date]: r.date,
    [t.description]: r.description,
    [t.category]: r.category,
    [t.type]: r.typeLabel,
    [t.amount]: r.kind === "income" ? r.amount : -r.amount,
  }));
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  XLSX.writeFile(workbook, filename);
}

/**
 * @param {ReturnType<typeof mapTransactionsForExport>} rows
 * @param {(n: number) => string} formatCurrency
 */
export async function exportTransactionsPdf({ rows, t, filename, formatCurrency, title }) {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(80);
  const head = [[t.date, t.description, t.category, t.type, t.amount]];
  const body = rows.map((r) => [
    r.date,
    r.description,
    r.category,
    r.typeLabel,
    r.kind === "income" ? `+${formatCurrency(r.amount)}` : `-${formatCurrency(r.amount)}`,
  ]);
  autoTable(doc, {
    startY: 22,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [13, 148, 136] },
    margin: { left: 14, right: 14 },
  });
  doc.save(filename);
}

export function safeExportFilenamePart(value) {
  return String(value ?? "data")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "export";
}
