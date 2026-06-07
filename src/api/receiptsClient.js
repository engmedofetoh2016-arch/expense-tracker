import { apiFetch } from "./httpClient.js";

async function fileToPayload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  if (typeof dataUrl !== "string" || !dataUrl.includes(",")) {
    throw new Error("Could not read image");
  }

  const [header, imageBase64] = dataUrl.split(",");
  const mimeMatch = header.match(/^data:(.*?);/);
  const mimeType = mimeMatch?.[1] || file.type || "image/jpeg";
  return { imageBase64, mimeType, originalName: file.name };
}

export async function fetchUnsortedReceipts() {
  const data = await apiFetch("/api/receipts/unsorted");
  return data.receipts;
}

export async function uploadReceipt(file, { parsed, parseSource, force = false } = {}) {
  const payload = await fileToPayload(file);
  const data = await apiFetch("/api/receipts/upload", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      parsed: parsed ?? undefined,
      parseSource: parseSource ?? undefined,
      force,
    }),
  });
  return { receipt: data.receipt, warnings: data.warnings ?? {} };
}

export async function updateReceiptDraft(id, draft) {
  const data = await apiFetch(`/api/receipts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
  return data.receipt;
}

export async function confirmReceipt(id, transaction, { force = false } = {}) {
  const data = await apiFetch(`/api/receipts/${id}/confirm`, {
    method: "POST",
    body: JSON.stringify({ ...transaction, force }),
  });
  return data;
}

export async function deleteReceipt(id) {
  await apiFetch(`/api/receipts/${id}`, { method: "DELETE" });
}

export function receiptImageUrl(receiptId) {
  return `/api/receipts/${receiptId}/image`;
}
