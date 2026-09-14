---
type: tracker
feature: theme-toggle
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
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
| T4 | Light-theme design tokens | Blocked | Tanya19Lion | S | — |
| T5 | ThemeToggle component + rapid-toggle debounce | Not started | Tanya19Lion | S | T1, T4 |
| T7 | i18n labels for ThemeToggle | Not started | Tanya19Lion | XS | T5 |
| T8 | Unit tests: theme resolution logic | Not started | Tanya19Lion | S | T2 |
| T9 | Component tests: ThemeToggle | Not started | Tanya19Lion | S | T5, T7 |
| T10 | E2E test: theme persistence | Not started | Tanya19Lion | S | T3, T5 |
| T11 | Manual QA: WCAG AA contrast audit | Not started | Tanya19Lion | S | T4 |
| T12 | Manual QA: QG-1/QG-2 perf verification | Not started | Tanya19Lion | XS | T3, T5, T10 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).

## Blocked notes

- **T4** — SAD §5's token table assumes token names that don't exist in
  `client/src/styles/tokens.css` today (`--canvas`, `--canvas-2`, `--canvas-3`, `--text-strong`,
  `--text-soft`, `--text-faint`, `--nav-bg`, `--btn-primary-bg`, `--btn-primary-text`,
  `--btn-secondary-border`, `--btn-secondary-text`, `--card-bg`, `--card-titlebar`,
  `--card-body`, `--card-text-strong`, `--card-text-soft`, `--card-border`, `--green-text`,
  `--rust-text`). The actual tokens are `--ink`/`--ink-2`/`--off-white`/`--slate`/`--slate-2`
  (grep: 170 usages across 21 files), and there is currently **no separate token namespace**
  for "page canvas" vs. "editor-window/diff-card" — every consumer, including the editor-window
  card, reads the same shared tokens. T4's scope is written as "extend `tokens.css` with a
  `[data-theme="light"]` block", but making that block meaningful now requires first splitting
  the shared token namespace into page-canvas vs. editor-window-card tokens and re-pointing all
  170 call sites to the correct one — a multi-file rename far beyond a single S-size,
  tokens.css-only task, and risky to do unilaterally since a wrong call on any of the 170 sites
  (page vs. card) would silently violate T4's own DoD ("editor-window tokens untouched"). This is
  the brownfield-drift risk SAD §11 already flagged (scan captured 2026-09-07) — needs an
  explicit decision (rename call-site-by-call-site now vs. defer/re-scope) before continuing,
  not a silent guess. See conversation with Tanya19Lion, 2026-09-14.
