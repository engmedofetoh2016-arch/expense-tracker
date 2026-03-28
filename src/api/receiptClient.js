/**
 * Calls the local API (see server/index.mjs). The OpenAI key stays on the server only.
 * @param {File} file
 * @returns {Promise<{ description: string, amount: number | null, date: string, category: string }>}
 */
export async function parseReceiptViaOpenAI(file) {
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

  const base = import.meta.env.VITE_API_BASE || "";
  const res = await fetch(`${base}/api/receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }

  return body;
}
