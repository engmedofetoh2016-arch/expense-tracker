import { Router } from "express";
import { requireAuth } from "../auth.mjs";
import { getExchangeRate, SUPPORTED_CURRENCIES } from "../currency.mjs";

const router = Router();

router.get("/supported", (_req, res) => {
  res.json({ currencies: SUPPORTED_CURRENCIES });
});

router.get("/rate", requireAuth, async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().split("T")[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date." });
    return;
  }

  try {
    const result = await getExchangeRate(from, to, date);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Rate lookup failed." });
  }
});

export default router;
