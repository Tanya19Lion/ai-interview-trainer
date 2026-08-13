---
paths:
  - "src/**/*"
---

# Server (`src/`) — overview

This is `ai-interview-trainer-server`, run from the repo root (not from a subfolder). Key
scripts: `npm run dev` (`tsx watch src/index.ts`), `npm run build` (`tsc`), `npm run start`
(runs `dist/index.js`), `npm run lint` (`eslint .`), `npm run test` (`vitest run`).

- **Required env vars** (no `.env.example` currently checked in): `ANTHROPIC_API_KEY`,
  `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CLIENT_URL`, plus whatever Mongo connection string
  `config/db.ts` expects. There is no `.env.example` checked in — when env vars are missing, ask
  the user rather than guessing values.
