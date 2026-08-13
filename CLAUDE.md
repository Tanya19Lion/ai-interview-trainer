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
  mockups sitting next to them). See `.claude/rules/backend/` for details (topic files,
  path-scoped, auto-loaded when Claude reads matching files under `src/`).
- **`client/`** — the real Vite + React 19 + TypeScript app that the HTML mockups are being
  turned into, and the actual frontend for the `src/` backend above. See
  `.claude/rules/frontend/` for details (topic files, path-scoped, auto-loaded when Claude reads
  matching files under `client/`).

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
- `diff-app-screens_1.html` — App-screens prototype covering the actual interview flow:
  `#screen-interview` with a question card, an answer textarea, a simulated "AI thinking" state
  (`#thinkingRow`), a feedback/diff card, and a session summary stage (`#summaryStage`) with
  per-topic score badges.

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

## Working in this repo

- Since every root-level `diff-*.html` file is fully self-contained, when asked to change
  styling or copy in one, check whether the same element/string exists in the other `.html`
  files and whether the user wants the change applied everywhere or just to the one file
  mentioned.
- There is no automated way to verify changes to the `.html` prototypes — after editing, the
  only verification available is visually opening the file in a browser. For `client/` and
  server verification commands, see `.claude/rules/frontend/overview.md` and
  `.claude/rules/backend/overview.md`.
- Root-level `package.json`/`tsconfig.json`/`eslint.config.js` belong to the **server**, not the
  HTML mockups — don't assume `npm install`/`npm run <script>` at the repo root touches the
  `diff-*.html` files in any way; they have no tooling at all.
- The client and server type the interview domain independently (`client/src/types/interview.ts`
  vs. `src/models/InterviewSession.ts`'s Mongoose schemas) — there's no shared package, so a
  field/enum change on one side (e.g. adding a `TOPICS`/`LEVELS` value) must be applied to both
  by hand.
- If auth-related work surfaces a 404 on `/api/auth/dev-login`, that's the known gap described
  in `.claude/rules/backend/auth.md`, not a regression to chase.
