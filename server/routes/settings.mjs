import { Router } from "express";
import { prisma } from "../db.mjs";
import { requireAuth } from "../auth.mjs";
import { normalizeCurrency } from "../currency.mjs";
import { getUserSettings } from "../backup.mjs";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  const settings = await getUserSettings(req.auth.id);
  if (!settings) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json({ settings });
});

router.patch("/", async (req, res) => {
  const baseCurrency = normalizeCurrency(req.body?.baseCurrency, "USD");
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : null;

  const data = { baseCurrency };
  if (name && name.length >= 1 && name.length <= 80) {
    data.name = name;
  }

  const user = await prisma.user.update({
    where: { id: req.auth.id },
    data,
  });

  res.json({
    settings: {
      baseCurrency: normalizeCurrency(user.baseCurrency),
      name: user.name,
      email: user.email,
    },
  });
});

export default router;
