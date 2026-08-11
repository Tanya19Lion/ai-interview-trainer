# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo is transitioning from static HTML prototypes to a real front-end app, and both live
side by side:

- **Root-level `diff-*.html` files** — no build system, package manager, or test suite. Each
  file is a complete, standalone `<html>` document with inline `<style>` and inline `<script>`
  for **diff**, an AI technical-interview trainer product (React/JavaScript/Node.js/TypeScript
  topics, reviewed "like a pull request"). No external JS/CSS files, no npm dependencies, no
  backend. All app state (mock history, heatmap data, interview flow) lives in in-memory JS
  objects/arrays inside the page; nothing persists (no `localStorage`, no `fetch` calls to a
  real API). There is no build/lint/test command for these — to "run" one, just open it
  directly in a browser (or serve the folder with any static file server).
- **`client/`** — the real Vite + React 19 + TypeScript app that these prototypes are being
  turned into. See [Client app (`client/`)](#client-app-client) below.

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

## Client app (`client/`)

A Vite + React 19 + TypeScript rebuild of the `diff-*.html` prototypes, living entirely under
`client/`. Key scripts (run from inside `client/`): `npm run dev` (Vite dev server), `npm run
build` (`tsc -b && vite build`), `npm run lint` (`oxlint`), `npm run preview`.

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
- **`client/src/components/`** — the emerging design-system component library, one folder per
  component (e.g. `Button/`, `Badge/`, `EditorWindow/`, `CodeDiffLine/`, `Eyebrow/`, `Spinner/`),
  each with a `.tsx` and a co-located CSS Module (`.module.css`) that consumes the tokens from
  `tokens.css`. All exports are re-exported centrally through `client/src/components/index.ts` —
  when adding a new component, export it there too.
- **`client/src/App.tsx`** — currently a showcase/kitchen-sink page rendering the component
  library, not the real app screens yet. Treat it as a living style-guide, not a production route.
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
  `npm run dev`/`npm run build`/`npm run lint` as appropriate.
