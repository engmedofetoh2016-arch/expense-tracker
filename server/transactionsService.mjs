import { prisma } from "./db.mjs";
import { getUserCategorySlugs, resolveCategorySlug } from "./categories.mjs";
import {
  buildTransactionPayload,
  computeAmountBase,
  mapTransaction,
} from "./backup.mjs";
import {
  findDuplicateTransaction,
  mapDuplicateTransaction,
} from "./duplicates.mjs";

const ALLOWED_TYPES = new Set(["income", "expense"]);

export async function validateAndPrepareTransaction(body, userId, { skipDuplicateCheck = false } = {}) {
  const fields = await buildTransactionPayload(body, userId);
  const category = await resolveCategorySlug(userId, body?.category);

  if (!fields.description || fields.description.length > 200) {
    return { error: "Enter a valid description." };
  }
  if (!Number.isFinite(fields.amount) || fields.amount <= 0) {
    return { error: "Enter a valid amount." };
  }
  if (!ALLOWED_TYPES.has(fields.type)) {
    return { error: "Invalid transaction type." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) {
    return { error: "Enter a valid date." };
  }

  const allowedCategories = await getUserCategorySlugs(userId);
  if (!allowedCategories.has(category)) {
    return { error: "Invalid category." };
  }

  const amount = Math.round(fields.amount * 100) / 100;
  const amountBase = await computeAmountBase({
    amount,
    currency: fields.currency,
    baseCurrency: fields.baseCurrency,
    date: fields.date,
  });

  const data = {
    description: fields.description,
    amount,
    currency: fields.currency,
    amountBase,
    type: fields.type,
    category,
    date: fields.date,
  };

  if (!skipDuplicateCheck && !body?.force) {
    const duplicate = await findDuplicateTransaction(userId, data);
    if (duplicate) {
      return {
        error: "Possible duplicate transaction.",
        duplicate: mapDuplicateTransaction(duplicate),
        code: "DUPLICATE",
      };
    }
  }

  return { data };
}

export async function listTransactionsForUser(userId) {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    include: { receipt: { select: { id: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapTransaction);
}

export { mapTransaction };
