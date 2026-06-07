import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.mjs";
import backupRoutes from "./routes/backup.mjs";
import categoryRoutes from "./routes/categories.mjs";
import currencyRoutes from "./routes/currency.mjs";
import receiptRoutes from "./routes/receipts.mjs";
import settingsRoutes from "./routes/settings.mjs";
import transactionRoutes from "./routes/transactions.mjs";
import { ensureUploadRoot } from "./files.mjs";
import { parseReceiptImage } from "./receiptParse.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");

function runMigrations() {
  try {
    execSync("npx prisma migrate deploy", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
  } catch (err) {
    console.warn("Migration deploy failed, trying db push:", err.message);
    execSync("npx prisma db push", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
  }
}

runMigrations();
ensureUploadRoot();

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "14mb" }));

const port = Number(process.env.PORT) || 8787;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.get("/api/health", (_req, res) => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasJwt = Boolean(process.env.JWT_SECRET?.trim());
  const uploadPath = process.env.UPLOAD_PATH?.trim() || "data/uploads";
  res.json({ ok: true, openaiConfigured: hasKey, authConfigured: hasJwt, model, uploadPath });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/transactions", transactionRoutes);

app.post("/api/receipt", async (req, res) => {
  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "Missing imageBase64" });
    return;
  }

  const result = await parseReceiptImage({ imageBase64, mimeType });
  if (result.error && !result.parsed) {
    res.status(result.error.includes("OPENAI") ? 503 : 502).json({ error: result.error });
    return;
  }
  if (!result.parsed) {
    res.status(502).json({ error: result.error || "Parse failed" });
    return;
  }
  res.json(result.parsed);
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
  if (!process.env.JWT_SECRET?.trim()) {
    console.warn("Warning: JWT_SECRET is not set. Auth routes will fail.");
  }
});
