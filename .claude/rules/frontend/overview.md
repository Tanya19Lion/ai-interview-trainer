---
paths:
  - "client/**/*"
---

# Client app (`client/`) — overview

A Vite + React 19 + TypeScript app,  the real frontend consuming the server API in `src/` (see
`.claude/rules/backend/`). Key scripts (run
from inside `client/`): `npm run dev` (Vite dev server), `npm run build` (`tsc -b && vite build`),
`npm run lint` (`oxlint`), `npm run preview`.

- **i18n is live**: `client/src/i18n.ts` initializes `react-i18next` with `keySeparator: false`/
  `nsSeparator: false` — translation keys are flat strings (`t('hero.h1pre')`) stored in
  `client/src/locales/{uk,en}.json`, not nested i18next namespacing. `main.tsx` wraps the app in
  `I18nextProvider`. Every page and component reads
  its text through `t()` — no hardcoded user-facing strings (`src/noHardcodedCyrillic.test.ts`
  fails on Cyrillic outside comments/tests; `App.tsx`, the `/showcase` dev page, is the exception).
  The language is resolved in `i18n.ts`: `detectInitialLang()` (`localStorage['diff-lang-chosen']`
  → `navigator.language` → `uk`), `setLanguage()` (persists the choice), `currentLang()`; `<html
  lang>` follows it. `LangToggle` (nav + landing) and `LangOverlay` switch it. Plurals use
  `_one/_few/_many/_other` keys with `count`; `locales.test.ts` guards key and variable parity.
  The UI language is separate from the **session language** the AI uses (fixed at session start —
  `NewSessionPage` sends `currentLang()`; see `.claude/rules/backend/interview-flow.md`).
  Stored questions/feedback in history are shown as saved, not translated.
- `client/tsconfig.app.json` has `"resolveJsonModule": true` specifically so `i18n.ts` can
  `import uk from './locales/uk.json'` and have `tsc -b` type-check it — don't remove it while
  those imports exist.
- If auth-related work surfaces a 404 on `/api/auth/dev-login`, that's the known gap described
  in `.claude/rules/backend/auth.md`, not a regression to chase.
- `HomePage` (`/home`), `HistoryPage` (`/history`), `ProgressPage` (`/progress`), and `LandingPage`
  (`/`, public) are real, data-backed/bilingual screens now (not redirects/placeholders)
  — see `.claude/rules/frontend/routing-and-auth.md`. `InterviewSessionPage` also survives a hard
  reload / direct link now (reload fallback re-derives state from the server — see
  `.claude/rules/frontend/routing-and-auth.md`). All 10 tasks in `PROGRESS.md`'s plan are done;
  what's left is manual verification against a live Mongo/backend, not new screens.
- `client/src/lib/topicLabel.ts` (`TOPIC_LABEL`) is the shared display-text map for `Topic`
  values (`nodejs` → `"node.js"`, `nextjs` → `"next.js"`, everything else identity) — reach for
  it instead of printing a raw `Topic` enum value in new UI; it's already used by `HomePage`,
  `HistoryTable`, `HistoryPage`'s filter chips, `ReviewModal`, and `ProgressPage`.
- Nothing **behind auth** has been visually verified against a live backend since the
  auth/AppShell work in `PROGRESS.md` task 4 — every protected page/behavior built after that
  (`HomePage`, `HistoryPage`, `ReviewModal`, `ProgressPage`, `Heatmap`,
  `InterviewSessionPage`'s reload fallback) has only been confirmed via `tsc`/`oxlint`/`build`
  plus observing that `RequireAuth` correctly redirects to `/login` with no Mongo/`.env` running.
  This matters most for `ProgressPage`'s `Heatmap`/trend-chart/level-distribution widgets (entire
  date-bucketing and SVG-coordinate logic is client-side) and for the reload fallback's branching
  (completed vs. in-progress vs. genuinely unavailable session) — none of it has run against real
  `completedAt`/session data. Don't assume any of these screens or flows are correct until someone
  opens them with a live Mongo + `.env` session.
  `LandingPage` (`/`) is the one exception — it's public, needs no backend, and *has* been
  opened and scrolled through in Chrome: hero, demo picker, review card, heatmap, history table,
  CTA, and the `Reveal`-driven scroll animations all rendered correctly with no console errors.
  Not yet checked there: the `LangOverlay` language switch (didn't trigger in that session because
  `localStorage['diff-lang-chosen']` was already set from earlier browser use) and the mobile
  nav-toggle.
