# Deploy FlowSpend on Coolify (one site: UI + API)

**Production URL:** https://financetracker.tibasidas.com/

One Node process serves the React app and `/api/*` on the **same port** — point your domain at Coolify once; no separate API subdomain.

---

## 1. Push code

Coolify builds from your Git repo. After pushing `main`, trigger **Redeploy** in Coolify (or enable auto-deploy on push).

---

## 2. Coolify application settings

| Setting | Value |
|---------|--------|
| **Build pack** | Dockerfile |
| **Port** | `3000` (matches Dockerfile `EXPOSE`) |
| **Domain** | `financetracker.tibasidas.com` |
| **HTTPS** | Enable (Coolify / Let's Encrypt) |

Do **not** set a separate API URL in the frontend — the app calls `/api/...` on the same origin.

---

## 3. Environment variables (Coolify → Environment)

```env
NODE_ENV=production
PORT=3000

# Required — use a long random string (openssl rand -hex 32)
JWT_SECRET=your-production-secret-here

# SQLite on a persistent volume (see step 4)
DATABASE_URL=file:/app/prisma/dev.db

# Receipt images on a persistent volume
UPLOAD_PATH=/app/data/uploads

# Optional — OpenAI receipt parsing
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

---

## 4. Persistent storage (required)

Without volumes, **users and receipts are lost on every redeploy**.

Add **two storage mounts** in Coolify:

| Mount path | Purpose |
|------------|---------|
| `/app/prisma` | SQLite database (`dev.db`) |
| `/app/data/uploads` | Receipt image files |

---

## 5. Health check

Coolify can use:

- **Path:** `/api/health`
- **Port:** `3000`

The Dockerfile already includes a `HEALTHCHECK` on this endpoint.

---

## 6. Verify after deploy

1. Open https://financetracker.tibasidas.com/
2. Create an account (signup/login)
3. Check https://financetracker.tibasidas.com/api/health — should return `"ok": true`

---

## Local vs production

| | Local dev | Coolify |
|---|-----------|---------|
| UI | Vite `:5173` | Built static files from Express |
| API | Express `:8787` | Same process, port `3000` |
| Command | `npm run dev:all` | `node server/index.mjs` (Docker CMD) |
