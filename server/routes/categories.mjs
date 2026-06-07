import { Router } from "express";
import { prisma } from "../db.mjs";
import { requireAuth } from "../auth.mjs";
import {
  listUserCategories,
  mapCategory,
  uniqueSlugForUser,
} from "../categories.mjs";

const router = Router();
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

router.use(requireAuth);

router.get("/", async (req, res) => {
  const categories = await listUserCategories(req.auth.id);
  res.json({ categories });
});

router.post("/", async (req, res) => {
  const label = typeof req.body?.label === "string" ? req.body.label.trim() : "";
  const color = typeof req.body?.color === "string" ? req.body.color.trim() : "#6366f1";

  if (label.length < 1 || label.length > 60) {
    res.status(400).json({ error: "Enter a category name (1–60 characters)." });
    return;
  }
  if (!HEX_COLOR.test(color)) {
    res.status(400).json({ error: "Invalid color." });
    return;
  }

  const slug = await uniqueSlugForUser(req.auth.id, label);
  const row = await prisma.category.create({
    data: {
      userId: req.auth.id,
      slug,
      label,
      color,
    },
  });
  res.status(201).json({ category: mapCategory(row) });
});

router.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.category.findFirst({
    where: { id, userId: req.auth.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Category not found." });
    return;
  }

  const label = typeof req.body?.label === "string" ? req.body.label.trim() : existing.label;
  const color = typeof req.body?.color === "string" ? req.body.color.trim() : existing.color;

  if (label.length < 1 || label.length > 60) {
    res.status(400).json({ error: "Enter a category name (1–60 characters)." });
    return;
  }
  if (!HEX_COLOR.test(color)) {
    res.status(400).json({ error: "Invalid color." });
    return;
  }

  const row = await prisma.category.update({
    where: { id },
    data: { label, color },
  });
  res.json({ category: mapCategory(row) });
});

router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.category.findFirst({
    where: { id, userId: req.auth.id },
  });
  if (!existing) {
    res.status(404).json({ error: "Category not found." });
    return;
  }

  const inUse = await prisma.transaction.count({
    where: { userId: req.auth.id, category: existing.slug },
  });
  if (inUse > 0) {
    res.status(409).json({ error: "Category is used by transactions. Reassign them first." });
    return;
  }

  const remaining = await prisma.category.count({ where: { userId: req.auth.id } });
  if (remaining <= 1) {
    res.status(400).json({ error: "Keep at least one category." });
    return;
  }

  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
