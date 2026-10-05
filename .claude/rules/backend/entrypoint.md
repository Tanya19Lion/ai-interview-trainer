---
paths:
  - "src/index.ts"
  - "src/app.ts"
  - "src/config/**/*"
  - "api/**/*"
---

# App entry point

- **`src/app.ts`** — builds and exports the Express `app` (no `listen`). Registers `cors` (origin
  from `CLIENT_URL`, `credentials: true`), `express.json()`, `cookie-parser`, `helmet`, a
  `GET /health` check, then mounts four routers under `/api`: `auth`, `interview`, `history`,
  `stats`. Sets `trust proxy` to 1 only when `VERCEL` is set.
- **`src/index.ts`** — local entry point: loads `.env`, connects to MongoDB (`config/db.ts`), then
  `app.listen`.
- **`api/index.js`** — Vercel entry point: caches one MongoDB connection per instance (503 if it
  fails) and hands each request to the compiled `dist/app.js`. Routed by `vercel.json`; see
  `docs/deploy-vercel.md` and `docs/adr/0002-vercel-single-project.md`.
