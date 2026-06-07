import { prisma } from "./db.mjs";
import { listUserCategories, mapCategory } from "./categories.mjs";
import { normalizeCurrency, convertToBase } from "./currency.mjs";
import { getReceiptFilePath } from "./files.mjs";
import fs from "node:fs";

export async function getUserSettings(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  return {
    baseCurrency: normalizeCurrency(user.baseCurrency),
    name: user.name,
    email: user.email,
  };
}

export async function buildTransactionPayload(body, userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const baseCurrency = normalizeCurrency(user?.baseCurrency ?? "USD");
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const amount = Number(body?.amount);
  const type = typeof body?.type === "string" ? body.type.trim().toLowerCase() : "";
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const currency = normalizeCurrency(body?.currency, baseCurrency);

  return { description, amount, type, date, currency, baseCurrency };
}

export async function computeAmountBase({ amount, currency, baseCurrency, date }) {
  try {
    return await convertToBase(amount, currency, baseCurrency, date);
  } catch {
    return currency === baseCurrency ? Math.round(amount * 100) / 100 : Math.round(amount * 100) / 100;
  }
}

export function mapTransaction(row) {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    amountBase: row.amountBase,
    type: row.type,
    category: row.category,
    date: row.date,
    receiptId: row.receipt?.id ?? null,
  };
}

export async function exportFullBackup(userId) {
  const [user, categories, transactions, receipts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    listUserCategories(userId),
    prisma.transaction.findMany({
      where: { userId },
      include: { receipt: { select: { id: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    prisma.receiptFile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const receiptFiles = [];
  for (const receipt of receipts.slice(0, 200)) {
    let imageBase64 = null;
    try {
      const filePath = getReceiptFilePath(userId, receipt.storageName);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        if (buffer.length <= 2 * 1024 * 1024) {
          imageBase64 = buffer.toString("base64");
        }
      }
    } catch {
      // Skip unreadable files in backup.
    }

    receiptFiles.push({
      id: receipt.id,
      status: receipt.status,
      originalName: receipt.originalName,
      mimeType: receipt.mimeType,
      contentHash: receipt.contentHash,
      description: receipt.description,
      amount: receipt.amount,
      currency: receipt.currency,
      date: receipt.date,
      category: receipt.category,
      transactionId: receipt.transactionId,
      createdAt: receipt.createdAt.toISOString(),
      imageBase64,
    });
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: {
      name: user?.name,
      email: user?.email,
      baseCurrency: normalizeCurrency(user?.baseCurrency),
    },
    categories,
    transactions: transactions.map(mapTransaction),
    receipts: receiptFiles,
  };
}

export async function restoreBackup(userId, payload) {
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  const transactions = Array.isArray(payload?.transactions) ? payload.transactions : [];
  const baseCurrency = normalizeCurrency(payload?.user?.baseCurrency, "USD");

  if (payload?.user?.baseCurrency) {
    await prisma.user.update({
      where: { id: userId },
      data: { baseCurrency },
    });
  }

  let categoriesAdded = 0;
  for (const item of categories.slice(0, 100)) {
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!slug || !label) continue;
    const exists = await prisma.category.findFirst({ where: { userId, slug } });
    if (exists) continue;
    await prisma.category.create({
      data: {
        userId,
        slug,
        label,
        color: typeof item.color === "string" ? item.color : "#6366f1",
      },
    });
    categoriesAdded += 1;
  }

  const toCreate = [];
  for (const item of transactions.slice(0, 1000)) {
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const amount = Number(item.amount);
    const type = typeof item.type === "string" ? item.type.trim().toLowerCase() : "";
    const date = typeof item.date === "string" ? item.date.trim() : "";
    const category = typeof item.category === "string" ? item.category.trim().toLowerCase() : "other";
    const currency = normalizeCurrency(item.currency, baseCurrency);
    if (!description || !Number.isFinite(amount) || amount <= 0 || !date || !["income", "expense"].includes(type)) {
      continue;
    }
    const amountBase =
      Number.isFinite(Number(item.amountBase)) && Number(item.amountBase) > 0
        ? Number(item.amountBase)
        : await computeAmountBase({ amount, currency, baseCurrency, date });
    toCreate.push({
      userId,
      description,
      amount: Math.round(amount * 100) / 100,
      currency,
      amountBase,
      type,
      category,
      date,
    });
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate });
  }

  return { categoriesAdded, transactionsImported: toCreate.length };
}

export { mapCategory };
