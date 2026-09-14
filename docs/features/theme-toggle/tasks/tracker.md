---
type: tracker
feature: theme-toggle
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-14"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# Tracker — theme-toggle

<!-- Stage 08 → see skills/divide-tasks/SKILL.md. Update Status as tasks progress. -->

| ID | Title | Status | Owner | Estimate | Blocked by |
|----|-------|--------|-------|----------|------------|
| T1 | ThemeContext + useTheme hook | Merged | Tanya19Lion | XS | — |
| T2 | ThemeProvider: resolution logic + anti-FOUC | Merged | Tanya19Lion | S | T1 |
| T3 | Wire ThemeProvider into main.tsx | Merged | Tanya19Lion | XS | T2 |
| T4 | Light-theme design tokens | Merged | Tanya19Lion | S | — |
| T5 | ThemeToggle component + rapid-toggle debounce | Merged | Tanya19Lion | S | T1, T4 |
| T7 | i18n labels for ThemeToggle | In review | Tanya19Lion | XS | T5 |
| T8 | Unit tests: theme resolution logic | In review | Tanya19Lion | S | T2 |
| T9 | Component tests: ThemeToggle | In review | Tanya19Lion | S | T5, T7 |
| T10 | E2E test: theme persistence | In review | Tanya19Lion | S | T3, T5 |
| T11 | Manual QA: WCAG AA contrast audit | Not started | Tanya19Lion | S | T4 |
| T12 | Manual QA: QG-1/QG-2 perf verification | Not started | Tanya19Lion | XS | T3, T5, T10 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).

## Blocked notes

- **T4 (resolved 2026-09-14)** — was blocked because SAD §5's token table assumes token names
  that don't exist in `client/src/styles/tokens.css` (`--canvas`, `--text-strong`, etc.) while the
  actual tokens were `--ink`/`--off-white`/`--slate`/`--slate-2` (170 usages, 21 files). Resolved
  by renaming the "page canvas" family (`--ink`→`--canvas`, `--ink-2`→`--canvas-2`,
  `--ink-3`→`--canvas-3`, `--off-white`→`--text-strong`, `--slate`→`--text-soft`,
  `--slate-2`→`--text-faint`) across all 21 call sites, extracting `LandingPage`'s hardcoded navbar
  backdrop into `--nav-bg`, and adding a `--shadow` token wired into `EditorWindow`'s outer drop
  shadow only. The `[data-theme="light"]` block was added for exactly this structural set
  (`--canvas*`, `--text-*`, `--line`, `--nav-bg`, `--shadow`).
  **Deliberately NOT done** (open follow-up, not part of T4): `--green`/`--rust`/`--amber`/`--plum`
  (+ soft variants) and `--btn-primary-*` were left unthemed. Reason: `CodeDiffLine` and
  `EditorWindow`'s traffic-light dots read the *same* shared `--green`/`--rust`/`--amber` tokens as
  page-level badges/chips (`Badge`, `LevelPicker`, `Heatmap`, `HistoryTable`) — SAD §5's plan to
  darken them for light mode would recolor the diff card too, violating SAD's own "editor-window
  unchanged" / QG-4 requirement. Also, SAD assumes the primary CTA is green (`--btn-primary-bg`)
  but `Button variant="primary"` is actually amber everywhere in the app — wiring that token would
  silently repaint the CTA. Needs an explicit decision before continuing: either give
  `CodeDiffLine`/`EditorWindow` dots their own theme-invariant tokens (unblocks theming the shared
  semantic accents), or accept amber as primary and revise SAD §5's button-token proposal. Blocks
  full WCAG AA coverage in T11 for chips/badges specifically. See conversation with Tanya19Lion,
  2026-09-14.
