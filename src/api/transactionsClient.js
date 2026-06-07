import { apiFetch } from "./httpClient.js";

export async function fetchTransactions() {
  const data = await apiFetch("/api/transactions");
  return data.transactions;
}

export async function createTransaction(transaction) {
  const data = await apiFetch("/api/transactions", {
    method: "POST",
    body: JSON.stringify(transaction),
  });
  return data.transaction;
}

export async function deleteTransaction(id) {
  await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
}

export async function importTransactions(transactions) {
  const data = await apiFetch("/api/transactions/import", {
    method: "POST",
    body: JSON.stringify({ transactions }),
  });
  return data.transactions;
}

export async function bulkImportTransactions(transactions) {
  const data = await apiFetch("/api/transactions/bulk", {
    method: "POST",
    body: JSON.stringify({ transactions }),
  });
  return { imported: data.imported, transactions: data.transactions };
}

export async function downloadAllTransactionsCsv() {
  const response = await fetch("/api/transactions/export.csv", { credentials: "include" });
  if (!response.ok) {
    let message = "Export failed";
    try {
      const body = await response.json();
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowspend-all-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
