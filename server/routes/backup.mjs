import { Router } from "express";
import { prisma } from "../db.mjs";
import { requireAuth } from "../auth.mjs";
import { exportFullBackup, mapTransaction, restoreBackup } from "../backup.mjs";
import { saveReceiptImage, decodeBase64Image } from "../files.mjs";
import { hashBuffer } from "../duplicates.mjs";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const backup = await exportFullBackup(req.auth.id);
  res.json(backup);
});

router.get("/download", async (req, res) => {
  const backup = await exportFullBackup(req.auth.id);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="flowspend-backup-${stamp}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

router.post("/restore", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "Invalid backup payload." });
    return;
  }

  const result = await restoreBackup(req.auth.id, payload);

  const receipts = Array.isArray(payload.receipts) ? payload.receipts : [];
  let receiptsRestored = 0;
  for (const item of receipts.slice(0, 100)) {
    if (!item?.imageBase64 || item.transactionId) continue;
    try {
      const buffer = decodeBase64Image(item.imageBase64);
      const saved = saveReceiptImage({
        userId: req.auth.id,
        buffer,
        mimeType: item.mimeType || "image/jpeg",
        originalName: item.originalName || "receipt.jpg",
      });
      await prisma.receiptFile.create({
        data: {
          userId: req.auth.id,
          status: "unsorted",
          storageName: saved.storageName,
          originalName: saved.originalName,
          mimeType: saved.mimeType,
          sizeBytes: saved.sizeBytes,
          contentHash: item.contentHash || hashBuffer(buffer),
          description: item.description ?? null,
          amount: item.amount ?? null,
          currency: item.currency ?? null,
          date: item.date ?? null,
          category: item.category ?? null,
        },
      });
      receiptsRestored += 1;
    } catch {
      // Skip broken receipt payloads.
    }
  }

  const rows = await prisma.transaction.findMany({
    where: { userId: req.auth.id },
    include: { receipt: { select: { id: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  res.status(201).json({
    ...result,
    receiptsRestored,
    transactions: rows.map(mapTransaction),
  });
});

export default router;
