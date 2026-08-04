# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo has no build system, package manager, or test suite — it is a set of standalone,
self-contained HTML prototypes for **diff**, an AI technical-interview trainer product
(React/JavaScript/Node.js/TypeScript topics, reviewed "like a pull request"). Each file is a
complete `<html>` document with inline `<style>` and inline `<script>` — no external JS/CSS
files, no npm dependencies, no backend. All app state (mock history, heatmap data, interview
flow) lives in in-memory JS objects/arrays inside the page; nothing persists (no `localStorage`,
no `fetch` calls to a real API).

There is no build/lint/test command — to "run" a file, just open it directly in a browser
(or serve the folder with any static file server).

## Files and what each one is

- `diff-login.html` — Login / sign-up screen (Google button + email/password tabs, client-side
  tab switching and fake async submit via `setTimeout`).
- `diff-ai-interview-trainer.html` — Marketing landing page, **bilingual** (uk/en). Uses a
  `TRANSLATIONS` object + `data-i18n` / `data-i18n-aria` attributes and an `applyLanguage(lang)`
  function that walks the DOM and swaps text content; language choice is driven by a
  `#langOverlay` picker.
- `diff-ai-interview-trainer_1.html` — Earlier/simpler variant of the same landing page:
  Ukrainian-only, no `TRANSLATIONS`/`data-i18n` machinery, hardcoded copy. Keep this in mind
  when comparing the two — they are not meant to be merged, `_1` is a prior iteration.
- `diff-app-screens.html` — Logged-in app shell with tab/section-based navigation between
  screens (`#screen-home`, `#screen-new`, `#screen-history`, `#screen-progress`), a topic/level
  picker, a GitHub-style contribution heatmap (`#heatGrid`, seeded pseudo-random generator via
  a linear congruential `rand()`), and a review modal (`#reviewModal`). Does **not** include the
  live interview Q&A screen.
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

## Working in this repo

- Since every file is fully self-contained, when asked to change styling or copy, check whether
  the same element/string exists in the other files and whether the user wants the change
  applied everywhere or just to the one file mentioned.
- There is no automated way to verify changes — after editing, the only verification available
  is visually opening the HTML file in a browser.
