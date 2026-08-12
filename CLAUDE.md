# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo is transitioning from static HTML prototypes to a real full-stack app. Three things
live side by side, and it's easy to confuse them since the root directory holds both throwaway
mockups and the real server:

- **Root-level `diff-*.html` files** — no build system, package manager, or test suite. Each
  file is a complete, standalone `<html>` document with inline `<style>` and inline `<script>`
  for **diff**, an AI technical-interview trainer product (React/JavaScript/Node.js/TypeScript
  topics, reviewed "like a pull request"). No external JS/CSS files, no npm dependencies. All
  app state (mock history, heatmap data, interview flow) lives in in-memory JS objects/arrays
  inside the page; nothing persists (no `localStorage`, no `fetch` calls to a real API). These
  are **purely disposable mockups** for the visual/UX language — they are not wired to the real
  backend and never will be; there is no build/lint/test command for them — to "run" one, just
  open it directly in a browser (or serve the folder with any static file server).
- **Root-level `src/`, `package.json`, `tsconfig.json`, `eslint.config.js`** — the real backend,
  `ai-interview-trainer-server`: Express + TypeScript + MongoDB (Mongoose), living at repo root
  (not inside a `server/` subfolder — don't confuse its `package.json`/`src/` with the HTML
  mockups sitting next to them). See [Server (`src/`)](#server-src) below.
- **`client/`** — the real Vite + React 19 + TypeScript app that the HTML mockups are being
  turned into, and the actual frontend for the `src/` backend above. See
  [Client app (`client/`)](#client-app-client) below.

The repo also has a devcontainer-based sandbox (`.devcontainer/`, `tests/*.test.sh`, `Makefile`)
for verifying the dev container's network firewall and filesystem sandbox — unrelated to app
logic. `make help` lists the verification targets; only touch this when asked to work on sandbox/
firewall policy, not for ordinary feature work.

## Files and what each one is

- `diff-login.html` — Login / sign-up screen (Google button + email/password tabs, client-side
  tab switching and fake async submit via `setTimeout`).
- `diff-ai-interview-trainer.html` — Marketing landing page, **bilingual** (uk/en). Uses a
  `TRANSLATIONS` object + `data-i18n` / `data-i18n-aria` attributes and an `applyLanguage(lang)`
  function that walks the DOM and swaps text content; language choice is driven by a
  `#langOverlay` picker.
- `diff-app-screens_1.html` — Superset of `diff-app-screens.html` that adds the actual interview
  flow: `#screen-interview` with a question card, an answer textarea, a simulated "AI thinking"
  state (`#thinkingRow`), a feedback/diff card, and a session summary stage (`#summaryStage`)
  with per-topic score badges. This is the more complete/current app-screens prototype.

## Design system conventions (shared across all files)

Each file redefines the same CSS custom properties in `:root` rather than sharing a stylesheet —
when editing colors/spacing/radii, the same values are duplicated across files and must be
updated in each one individually if a global visual change is wanted:

- Color tokens: `--ink`/`--ink-2`/`--ink-3` (dark background surfaces), `--paper`/`--paper-2`
  (light "paper" surfaces used for code-diff cards), `--green`/`--rust`/`--amber`/`--plum` as
  semantic accents (green = added/correct, rust = removed/incorrect, amber = primary CTA/accent).
- Fonts: `Sora` (display/headings), `IBM Plex Sans` (body), `IBM Plex Mono` (code, labels,
  the "eyebrow" tags) — loaded from Google Fonts via `<link>` in `<head>`.
- The whole visual language is a "code review / git diff" metaphor: added/removed lines in
  review cards use green/rust backgrounds like a unified diff, section labels use `//` comment
  syntax, editor-window components mimic a code editor's title bar.
- Interactive behavior throughout is vanilla JS: `querySelector`/`addEventListener`, manual
  `class` toggling (e.g. `is-active`, `hidden` attribute) for tab/screen switching — no
  framework, no virtual DOM, no build step.

## Server (`src/`)

`ai-interview-trainer-server`, run from the repo root (not from a subfolder). Key scripts:
`npm run dev` (`tsx watch src/index.ts`), `npm run build` (`tsc`), `npm run start` (runs
`dist/index.js`), `npm run lint` (`eslint .`), `npm run test` (`vitest run`).

- **`src/index.ts`** — Express app entry point. Registers `cors` (origin from `CLIENT_URL`,
  `credentials: true`), `express.json()`, `cookie-parser`, a `GET /health` check, then mounts
  four routers under `/api`: `auth`, `interview`, `history`, `stats`. Connects to MongoDB
  (`config/db.ts`) before listening.
- **Auth** (`routes/auth.routes.ts`, `controllers/auth.controller.ts`) — real Google Sign-In:
  `POST /api/auth/google` verifies a Google `idToken` server-side via `google-auth-library`,
  upserts a `User`, and sets an httpOnly `token` cookie (JWT signed with `JWT_SECRET`).
  `GET /api/auth/me` and `POST /api/auth/logout` are also wired. `middleware/auth.ts`
  (`requireAuth`) reads that cookie and attaches `req.userId` for protected routes.
- **Known gap**: `client/src/api/auth.ts` calls `POST /api/auth/dev-login` as a temporary
  bypass for local development (see [Client app](#client-app-client)), but no `/dev-login` route
  or controller exists in `src/` yet — that auth path is currently broken end-to-end. Either add
  a matching dev-login endpoint or finish wiring the real `@react-oauth/google` flow on the
  client; don't assume the dev-login call works today.
- **Interview flow** (`routes/interview.routes.ts`, `controllers/interview.controller.ts`,
  `services/ai.service.ts`) — all routes require auth. `POST /api/interview/start` and
  `POST /api/interview/:sessionId/answer` drive the session; `ai.service.ts` calls the real
  Anthropic API (`@anthropic-ai/sdk`, model `claude-sonnet-4-5`) to generate questions and to
  score/review free-text answers, returning strict JSON (`{score, feedback, correctAnswer,
  weakTopics}`) that the model is prompted to produce without markdown fencing — if that parsing
  ever breaks, the prompt/response-shape contract in `ai.service.ts` is the first place to look.
- **Data model** (`models/User.ts`, `models/InterviewSession.ts`) — `InterviewSession` embeds a
  `questions` array of `{question, answer, score, feedback, weakTopics}` sub-documents plus
  `topic`/`level`/`status`/`averageScore`; `TOPICS`/`LEVELS` enums are duplicated (not imported)
  in `client/src/types/interview.ts` — keep both lists in sync by hand when adding a topic/level.
- **Required env vars** (no `.env.example` currently checked in): `ANTHROPIC_API_KEY`,
  `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CLIENT_URL`, plus whatever Mongo connection string
  `config/db.ts` expects.

## Client app (`client/`)

A Vite + React 19 + TypeScript rebuild of the `diff-*.html` prototypes, living entirely under
`client/`, and the real frontend consuming the `src/` API above. Key scripts (run from inside
`client/`): `npm run dev` (Vite dev server), `npm run build` (`tsc -b && vite build`), `npm run
lint` (`oxlint`), `npm run preview`.

- **Routing** (`client/src/AppRoutes.tsx`, `main.tsx`) — `react-router-dom` v7 with
  `TanStack Query` for server state (`QueryClient` set up once in `main.tsx`). Real routes:
  `/interview/new` (`pages/NewSessionPage.tsx`) and `/interview/:sessionId`
  (`pages/InterviewSessionPage.tsx`), both wrapped in `RequireAuth`. `/` redirects to
  `/interview/new`; `/showcase` still serves the old kitchen-sink `App.tsx` (see below) as a
  living style guide — it is **not** the app's home route anymore.
- **`client/src/RequireAuth.tsx`** — auth gate using `hooks/useAuth.ts` (`useMe`,
  `useDevLogin`). While `useMe` errors (no session), it currently renders a **temporary**
  dev-login email form instead of a real Google Sign-In button — explicitly marked `TEMPORARY`
  in the code and meant to be swapped once `@react-oauth/google` is wired up. See the server-side
  gap noted above: this form currently calls an endpoint that doesn't exist yet.
- **`client/src/api/`** — thin fetch layer: `client.ts` (`apiFetch`, `credentials: 'include'` so
  the auth cookie is sent, throws `ApiError` on non-2xx), `auth.ts`, `interview.ts`. All request/
  response shapes are typed in `client/src/types/interview.ts`, which mirrors (but does not
  import) the server's Mongoose schema shapes — update both sides together.
- **`client/src/hooks/`** — TanStack Query wrappers per concern (`useAuth.ts`,
  `useStartSession.ts`, `useSubmitAnswer.ts`); prefer adding a hook here over calling `api/`
  functions directly from components.
- **Dependencies not yet wired up**: `i18next`/`react-i18next` are installed but there is no
  `i18n.init()` or `useTranslation()` call anywhere in `client/src` yet — the bilingual behavior
  from `diff-ai-interview-trainer.html` (`TRANSLATIONS` + `data-i18n`) hasn't been ported. Don't
  assume translation infra is live; it needs to be set up when that page is ported.
- **`client/src/styles/tokens.css`** — the single source of truth for design tokens (color,
  typography, spacing, radii), consolidated from the three HTML mockups' duplicated `:root`
  blocks with the drift between them manually reconciled (it's a superset — includes every
  token used in *any* mockup, e.g. `--plum-soft`, `--space-7`). This is the most important
  config decision in the client app: components read `var(--token-name)` instead of hardcoding
  values, so a palette/spacing change is made once here instead of once per component (which is
  exactly the maintenance problem the duplicated `:root` blocks in the root `diff-*.html` files
  still have — see below). Breakpoints are intentionally **not** tokenized here since `@media`
  can't take a `var()` condition; they're hardcoded per-component instead (640/700/760/860/960/1100px).
- **`client/src/styles/reset.css`** and **`client/src/styles/fonts.css`** — global reset and
  `@fontsource` font-face imports (`Onest`, `IBM Plex Sans`, `IBM Plex Mono` — note: `Onest` is
  the display font here, whereas the older root-level HTML prototypes use `Sora` for the same
  role; don't assume they match).
- **`client/src/components/`** — the design-system component library, one folder per component
  (primitives: `Button/`, `Badge/`, `EditorWindow/`, `CodeDiffLine/`, `Eyebrow/`, `Spinner/`,
  `Textarea/`; interview-flow-specific: `TopicPicker/`, `LevelPicker/`, `ProgressSegments/`,
  `QuestionCard/`, `AnswerForm/`, `FeedbackCard/`, `SessionSummary/`), each with a `.tsx` and a
  co-located CSS Module (`.module.css`) that consumes the tokens from `tokens.css`. All exports
  are re-exported centrally through `client/src/components/index.ts` — when adding a new
  component, export it there too.
- **`client/src/App.tsx`** — now mounted only at `/showcase` (see routing above); still a
  kitchen-sink page rendering primitives from the component library, not a real app screen.
  `pages/NewSessionPage.tsx` and `pages/InterviewSessionPage.tsx` are the real screens now,
  composed from the interview-flow-specific components listed above.
- When porting behavior or markup from a root-level `diff-*.html` prototype into `client/`,
  prefer expressing it as a token-driven component under `client/src/components/` rather than
  copying inline styles — that's the whole point of the ongoing migration.

## Working in this repo

- Since every root-level `diff-*.html` file is fully self-contained, when asked to change
  styling or copy in one, check whether the same element/string exists in the other `.html`
  files and whether the user wants the change applied everywhere or just to the one file
  mentioned.
- There is no automated way to verify changes to the `.html` prototypes — after editing, the
  only verification available is visually opening the file in a browser. For `client/`, use
  `npm run dev`/`npm run build`/`npm run lint` as appropriate; for the server, `npm run
  dev`/`npm run build`/`npm run lint`/`npm run test` from the repo root.
- Root-level `package.json`/`tsconfig.json`/`eslint.config.js` belong to the **server**, not the
  HTML mockups — don't assume `npm install`/`npm run <script>` at the repo root touches the
  `diff-*.html` files in any way; they have no tooling at all.
- The client and server type the interview domain independently (`client/src/types/interview.ts`
  vs. `src/models/InterviewSession.ts`'s Mongoose schemas) — there's no shared package, so a
  field/enum change on one side (e.g. adding a `TOPICS`/`LEVELS` value) must be applied to both
  by hand.
- `client/src/RequireAuth.tsx` and `client/src/api/auth.ts` call a `/api/auth/dev-login` endpoint
  that doesn't exist on the server (see [Server](#server-src)) — if auth-related work surfaces a
  404 there, that's why; it's not a regression to chase.
