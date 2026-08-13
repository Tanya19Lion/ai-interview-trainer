---
paths:
  - "src/index.ts"
  - "src/config/**/*"
---

# App entry point

- **`src/index.ts`** — Express app entry point. Registers `cors` (origin from `CLIENT_URL`,
  `credentials: true`), `express.json()`, `cookie-parser`, a `GET /health` check, then mounts
  four routers under `/api`: `auth`, `interview`, `history`, `stats`. Connects to MongoDB
  (`config/db.ts`) before listening.
