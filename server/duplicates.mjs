import crypto from "node:crypto";
import { prisma } from "./db.mjs";

export function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function findDuplicateReceipt(userId, contentHash) {
  if (!contentHash) return null;
  return prisma.receiptFile.findFirst({
    where: { userId, contentHash },
    orderBy: { createdAt: "desc" },
  });
}

export async function findDuplicateTransaction(userId, { date, amount, description }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || !date || !description) return null;

  const normalizedDescription = description.trim().toLowerCase();
  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      date,
      amount: { gte: value - 0.01, lte: value + 0.01 },
    },
    take: 20,
  });

  return (
    rows.find((row) => row.description.trim().toLowerCase() === normalizedDescription) ??
    rows.find((row) => {
      const a = row.description.trim().toLowerCase();
      const b = normalizedDescription;
      return a.includes(b) || b.includes(a);
    }) ??
    null
  );
}

export function mapDuplicateReceipt(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    description: row.description,
    amount: row.amount,
    date: row.date,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapDuplicateTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    type: row.type,
    category: row.category,
  };
}
