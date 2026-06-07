import { Router } from "express";
import { prisma } from "../db.mjs";
import { requireAuth } from "../auth.mjs";
import { listUserCategories } from "../categories.mjs";
import {
  listTransactionsForUser,
  mapTransaction,
  validateAndPrepareTransaction,
} from "../transactionsService.mjs";

const router = Router();

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  res.json({ transactions: await listTransactionsForUser(req.auth.id) });
});

router.get("/export.csv", async (req, res) => {
  const rows = await prisma.transaction.findMany({
    where: { userId: req.auth.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const categories = await listUserCategories(req.auth.id);
  const labelBySlug = Object.fromEntries(categories.map((item) => [item.slug, item.label]));

  const header = "date,description,amount,currency,amount_base,type,category,category_label";
  const lines = rows.map((row) =>
    [
      escapeCsv(row.date),
      escapeCsv(row.description),
      escapeCsv(row.amount),
      escapeCsv(row.currency),
      escapeCsv(row.amountBase),
      escapeCsv(row.type),
      escapeCsv(row.category),
      escapeCsv(labelBySlug[row.category] ?? row.category),
    ].join(","),
  );

  const csv = [header, ...lines].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="flowspend-transactions.csv"');
  res.send(`\uFEFF${csv}`);
});

router.post("/", async (req, res) => {
  const validated = await validateAndPrepareTransaction(req.body, req.auth.id);
  if (validated.error) {
    res.status(validated.code === "DUPLICATE" ? 409 : 400).json({
      error: validated.error,
      duplicate: validated.duplicate,
      code: validated.code,
    });
    return;
  }

  const row = await prisma.transaction.create({
    data: { ...validated.data, userId: req.auth.id },
    include: { receipt: { select: { id: true } } },
  });
  res.status(201).json({ transaction: mapTransaction(row) });
});

router.post("/bulk", async (req, res) => {
  const items = req.body?.transactions;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "No transactions to import." });
    return;
  }

  const toCreate = [];
  for (const item of items.slice(0, 500)) {
    const validated = await validateAndPrepareTransaction(item, req.auth.id, { skipDuplicateCheck: true });
    if (!validated.error) {
      toCreate.push({ ...validated.data, userId: req.auth.id });
    }
  }

  if (toCreate.length === 0) {
    res.status(400).json({ error: "No valid transactions to import." });
    return;
  }

  await prisma.transaction.createMany({ data: toCreate });
  res.status(201).json({
    imported: toCreate.length,
    transactions: await listTransactionsForUser(req.auth.id),
  });
});

router.post("/import", async (req, res) => {
  const items = req.body?.transactions;
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "No transactions to import." });
    return;
  }

  const existingCount = await prisma.transaction.count({ where: { userId: req.auth.id } });
  if (existingCount > 0) {
    res.status(409).json({ error: "Account already has transactions." });
    return;
  }

  const toCreate = [];
  for (const item of items.slice(0, 500)) {
    const validated = await validateAndPrepareTransaction(item, req.auth.id, { skipDuplicateCheck: true });
    if (!validated.error) {
      toCreate.push({ ...validated.data, userId: req.auth.id });
    }
  }

  if (toCreate.length === 0) {
    res.status(400).json({ error: "No valid transactions to import." });
    return;
  }

  await prisma.transaction.createMany({ data: toCreate });
  res.status(201).json({
    imported: toCreate.length,
    transactions: await listTransactionsForUser(req.auth.id),
  });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.transaction.findFirst({
    where: { id, userId: req.auth.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Transaction not found." });
    return;
  }

  await prisma.transaction.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
