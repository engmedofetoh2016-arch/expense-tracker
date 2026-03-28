import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");

const ALLOWED_CATEGORIES = ["food", "housing", "utilities", "transport", "entertainment", "salary", "other"];

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "14mb" }));

const port = Number(process.env.PORT) || 8787;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;
  return new OpenAI({ apiKey: key });
}

app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  res.json({ ok: true, openaiConfigured: hasKey, model });
});

app.post("/api/receipt", async (req, res) => {
  const client = getClient();
  if (!client) {
    res.status(503).json({ error: "OPENAI_API_KEY is not set on the server." });
    return;
  }

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "Missing imageBase64" });
    return;
  }
  const mime = typeof mimeType === "string" && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const dataUrl = `data:${mime};base64,${imageBase64}`;

  const system = `You extract structured data from receipt photos for a personal finance app.
Return ONLY valid JSON with keys: description (string, merchant or short title), amount (number, total the customer paid in the receipt's main currency), date (string YYYY-MM-DD), category (string).
category must be exactly one of: ${ALLOWED_CATEGORIES.join(", ")}.
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
            {
              type: "text",
              text: "Read this receipt image and fill the JSON fields.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      res.status(502).json({ error: "Empty model response" });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(502).json({ error: "Model did not return valid JSON" });
      return;
    }

    const description = typeof parsed.description === "string" ? parsed.description.trim().slice(0, 120) : "Receipt";
    const amountNum = Number(parsed.amount);
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : null;

    let dateStr = typeof parsed.date === "string" ? parsed.date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr = new Date().toISOString().split("T")[0];
    }

    let category = typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "other";
    if (!ALLOWED_CATEGORIES.includes(category)) category = "other";

    res.json({ description, amount, date: dateStr, category });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    res.status(502).json({ error: message });
  }
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  const mode = fs.existsSync(distPath) ? "app + API" : "API only";
  console.log(`FlowSpend (${mode}) on http://0.0.0.0:${port}`);
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn("Warning: OPENAI_API_KEY is not set. POST /api/receipt will return 503.");
  }
});
