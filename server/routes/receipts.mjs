import { Router } from "express";
import fs from "node:fs";
import { prisma } from "../db.mjs";
import { requireAuth } from "../auth.mjs";
import { listUserCategories, resolveCategorySlug } from "../categories.mjs";
import { normalizeCurrency } from "../currency.mjs";
import {
  decodeBase64Image,
  deleteReceiptFile,
  getReceiptFilePath,
  saveReceiptImage,
} from "../files.mjs";
import { normalizeParsedReceipt, parseReceiptImage } from "../receiptParse.mjs";
import {
  findDuplicateReceipt,
  findDuplicateTransaction,
  hashBuffer,
  mapDuplicateReceipt,
  mapDuplicateTransaction,
} from "../duplicates.mjs";
import { mapTransaction, validateAndPrepareTransaction } from "../transactionsService.mjs";

const router = Router();

function mapReceipt(row) {
  return {
    id: row.id,
    status: row.status,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    parseSource: row.parseSource,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    category: row.category,
    transactionId: row.transactionId,
    createdAt: row.createdAt.toISOString(),
    imageUrl: `/api/receipts/${row.id}/image`,
  };
}

async function getOwnedReceipt(id, userId) {
  return prisma.receiptFile.findFirst({
    where: { id, userId },
  });
}

router.use(requireAuth);

router.get("/unsorted", async (req, res) => {
  const rows = await prisma.receiptFile.findMany({
    where: { userId: req.auth.id, status: "unsorted" },
    orderBy: { createdAt: "desc" },
  });
  res.json({ receipts: rows.map(mapReceipt) });
});

router.post("/upload", async (req, res) => {
  const { imageBase64, mimeType, originalName, parsed, parseSource, force } = req.body || {};

  let buffer;
  try {
    buffer = decodeBase64Image(imageBase64);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid image" });
    return;
  }

  const contentHash = hashBuffer(buffer);
  const allowForce = Boolean(force);

  if (!allowForce) {
    const duplicateReceipt = await findDuplicateReceipt(req.auth.id, contentHash);
    if (duplicateReceipt) {
      res.status(409).json({
        error: "This receipt image was already uploaded.",
        code: "DUPLICATE_RECEIPT",
        duplicateReceipt: mapDuplicateReceipt(duplicateReceipt),
      });
      return;
    }
  }

  const categories = await listUserCategories(req.auth.id);
  const categorySlugs = categories.map((item) => item.slug);
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  const baseCurrency = normalizeCurrency(user?.baseCurrency);

  let normalized = null;
  let source = typeof parseSource === "string" ? parseSource : null;

  if (parsed && typeof parsed === "object") {
    normalized = normalizeParsedReceipt(parsed, categorySlugs);
    source = source || "local";
  } else {
    const result = await parseReceiptImage({ imageBase64, mimeType, categorySlugs });
    if (result.parsed) {
      normalized = result.parsed;
      source = result.source;
    }
  }

  const receiptCurrency = normalizeCurrency(normalized?.currency, baseCurrency);

  const warnings = {};
  if (!allowForce && normalized?.amount && normalized?.description && normalized?.date) {
    const duplicateTransaction = await findDuplicateTransaction(req.auth.id, {
      date: normalized.date,
      amount: normalized.amount,
      description: normalized.description,
    });
    if (duplicateTransaction) {
      warnings.duplicateTransaction = mapDuplicateTransaction(duplicateTransaction);
    }
  }

  const saved = saveReceiptImage({
    userId: req.auth.id,
    buffer,
    mimeType,
    originalName,
  });

  const row = await prisma.receiptFile.create({
    data: {
      userId: req.auth.id,
      status: "unsorted",
      storageName: saved.storageName,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      contentHash,
      parseSource: source,
      description: normalized?.description ?? null,
      amount: normalized?.amount ?? null,
      currency: receiptCurrency,
      date: normalized?.date ?? new Date().toISOString().split("T")[0],
      category: normalized?.category
        ? await resolveCategorySlug(req.auth.id, normalized.category)
        : null,
    },
  });

  res.status(201).json({ receipt: mapReceipt(row), warnings });
});

router.get("/:id/image", async (req, res) => {
  const row = await getOwnedReceipt(req.params.id, req.auth.id);
  if (!row) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }

  try {
    const filePath = getReceiptFilePath(req.auth.id, row.storageName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File missing on server." });
      return;
    }
    res.setHeader("Content-Type", row.mimeType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: "File not available." });
  }
});

router.patch("/:id", async (req, res) => {
  const row = await getOwnedReceipt(req.params.id, req.auth.id);
  if (!row) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }
  if (row.status !== "unsorted") {
    res.status(409).json({ error: "Receipt is already linked to a transaction." });
    return;
  }

  const description =
    typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 200) : row.description;
  const amountNum = req.body?.amount != null ? Number(req.body.amount) : row.amount;
  const amount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : row.amount;
  const date = typeof req.body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)
    ? req.body.date
    : row.date;
  const category = req.body?.category != null
    ? await resolveCategorySlug(req.auth.id, req.body.category)
    : row.category;
  const parseSource = typeof req.body?.parseSource === "string" ? req.body.parseSource : row.parseSource;
  const currency = req.body?.currency != null ? normalizeCurrency(req.body.currency) : row.currency;

  const updated = await prisma.receiptFile.update({
    where: { id: row.id },
    data: { description, amount, date, category, parseSource, currency },
  });
  res.json({ receipt: mapReceipt(updated) });
});

router.post("/:id/confirm", async (req, res) => {
  const row = await getOwnedReceipt(req.params.id, req.auth.id);
  if (!row) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }
  if (row.status !== "unsorted") {
    res.status(409).json({ error: "Receipt is already linked." });
    return;
  }

  const validated = await validateAndPrepareTransaction(
    {
      description: req.body?.description ?? row.description,
      amount: req.body?.amount ?? row.amount,
      type: req.body?.type ?? "expense",
      date: req.body?.date ?? row.date,
      category: req.body?.category ?? row.category,
      currency: req.body?.currency ?? row.currency,
      force: req.body?.force,
    },
    req.auth.id,
  );

  if (validated.error) {
    res.status(validated.code === "DUPLICATE" ? 409 : 400).json({
      error: validated.error,
      duplicate: validated.duplicate,
      code: validated.code,
    });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: { ...validated.data, userId: req.auth.id },
    });

    const receipt = await tx.receiptFile.update({
      where: { id: row.id },
      data: {
        status: "linked",
        transactionId: transaction.id,
        description: validated.data.description,
        amount: validated.data.amount,
        currency: validated.data.currency,
        date: validated.data.date,
        category: validated.data.category,
      },
    });

    return { transaction, receipt };
  });

  res.status(201).json({
    transaction: mapTransaction({ ...result.transaction, receipt: result.receipt }),
    receipt: mapReceipt(result.receipt),
  });
});

router.delete("/:id", async (req, res) => {
  const row = await getOwnedReceipt(req.params.id, req.auth.id);
  if (!row) {
    res.status(404).json({ error: "Receipt not found." });
    return;
  }

  if (row.status === "linked" && row.transactionId) {
    res.status(409).json({ error: "Unlink or delete the transaction first." });
    return;
  }

  deleteReceiptFile(req.auth.id, row.storageName);
  await prisma.receiptFile.delete({ where: { id: row.id } });
  res.json({ ok: true });
});

export default router;
