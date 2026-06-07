import OpenAI from "openai";

const DEFAULT_CATEGORY_SLUGS = ["food", "housing", "utilities", "transport", "entertainment", "salary", "other"];

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

export function normalizeParsedReceipt(parsed, categorySlugs = DEFAULT_CATEGORY_SLUGS) {
  const allowed = new Set(categorySlugs.length > 0 ? categorySlugs : DEFAULT_CATEGORY_SLUGS);
  const description = typeof parsed.description === "string" ? parsed.description.trim().slice(0, 120) : "Receipt";
  const amountNum = Number(parsed.amount);
  const amount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : null;

  let dateStr = typeof parsed.date === "string" ? parsed.date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    dateStr = new Date().toISOString().split("T")[0];
  }

  let category = typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "other";
  if (!allowed.has(category)) {
    category = allowed.has("other") ? "other" : [...allowed][0];
  }

  let currency = typeof parsed.currency === "string" ? parsed.currency.trim().toUpperCase().slice(0, 3) : "USD";
  if (!/^[A-Z]{3}$/.test(currency)) currency = "USD";

  return { description, amount, date: dateStr, category, currency };
}

export async function parseReceiptImage({ imageBase64, mimeType, categorySlugs }) {
  const client = getClient();
  if (!client) {
    return { error: "OPENAI_API_KEY is not set on the server.", parsed: null, source: null };
  }

  const mime = typeof mimeType === "string" && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const payload = typeof imageBase64 === "string" && imageBase64.includes(",")
    ? imageBase64.split(",").pop()
    : imageBase64;
  const dataUrl = `data:${mime};base64,${payload}`;
  const slugs = categorySlugs?.length ? categorySlugs : DEFAULT_CATEGORY_SLUGS;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const system = `You extract structured data from receipt photos for a personal finance app.
Return ONLY valid JSON with keys: description (string, merchant or short title), amount (number, total the customer paid in the receipt's main currency), date (string YYYY-MM-DD), category (string), currency (string, ISO 4217 3-letter code such as USD, EUR, SAR).
category must be exactly one of: ${slugs.join(", ")}.
If the date is unreadable, use today's date in ISO form. amount must be a positive number.`;

  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this receipt image and fill the JSON fields." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return { error: "Empty model response", parsed: null, source: null };
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return { error: "Model did not return valid JSON", parsed: null, source: null };
    }

    return {
      error: null,
      parsed: normalizeParsedReceipt(parsedJson, slugs),
      source: "openai",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return { error: message, parsed: null, source: null };
  }
}
