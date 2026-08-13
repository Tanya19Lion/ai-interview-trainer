---
paths:
  - "client/**/*"
---

# Client app (`client/`) — overview

A Vite + React 19 + TypeScript rebuild of the root-level `diff-*.html` prototypes, and the real
frontend consuming the server API in `src/` (see `.claude/rules/backend/`). Key scripts (run
from inside `client/`): `npm run dev` (Vite dev server), `npm run build` (`tsc -b && vite build`),
`npm run lint` (`oxlint`), `npm run preview`.

- **Dependencies not yet wired up**: `i18next`/`react-i18next` are installed but there is no
  `i18n.init()` or `useTranslation()` call anywhere in `client/src` yet — the bilingual behavior
  from `diff-ai-interview-trainer.html` (`TRANSLATIONS` + `data-i18n`) hasn't been ported. Don't
  assume translation infra is live; it needs to be set up when that page is ported.
- When porting behavior or markup from a root-level `diff-*.html` prototype into `client/`,
  prefer expressing it as a token-driven component under `client/src/components/` rather than
  copying inline styles — that's the whole point of the ongoing migration.
- If auth-related work surfaces a 404 on `/api/auth/dev-login`, that's the known gap described
  in `.claude/rules/backend/auth.md`, not a regression to chase.
