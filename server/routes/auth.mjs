import { Router } from "express";
import { prisma } from "../db.mjs";
import {
  clearAuthCookie,
  hashPassword,
  requireAuth,
  setAuthCookie,
  signToken,
  verifyPassword,
} from "../auth.mjs";
import { ensureDefaultCategories } from "../categories.mjs";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    baseCurrency: user.baseCurrency || "USD",
  };
}

function validateCredentials(email, password, name, isSignup) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const rawPassword = typeof password === "string" ? password : "";
  const rawName = typeof name === "string" ? name.trim() : "";

  if (!EMAIL_RE.test(normalizedEmail)) {
    return { error: "Enter a valid email address." };
  }
  if (rawPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (isSignup && rawName.length < 1) {
    return { error: "Enter your name." };
  }
  if (isSignup && rawName.length > 80) {
    return { error: "Name is too long." };
  }

  return { email: normalizedEmail, password: rawPassword, name: rawName };
}

router.post("/signup", async (req, res) => {
  const validated = validateCredentials(req.body?.email, req.body?.password, req.body?.name, true);
  if (validated.error) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: validated.email } });
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  try {
    const passwordHash = await hashPassword(validated.password);
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        name: validated.name,
      },
    });

    await ensureDefaultCategories(user.id);

    const token = signToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch {
    res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  const validated = validateCredentials(req.body?.email, req.body?.password, "", false);
  if (validated.error) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: validated.email } });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const ok = await verifyPassword(validated.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ user: sanitizeUser(user) });
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({ user: sanitizeUser(user) });
});

export default router;
