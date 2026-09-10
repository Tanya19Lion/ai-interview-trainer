---
status: Draft
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
| T1 | ThemeContext + useTheme hook | Not started | Tanya19Lion | XS | — |
| T2 | ThemeProvider: resolution logic + anti-FOUC | Not started | Tanya19Lion | S | T1 |
| T3 | Wire ThemeProvider into main.tsx | Not started | Tanya19Lion | XS | T2 |
| T4 | Light-theme design tokens | Not started | Tanya19Lion | S | — |
| T5 | ThemeToggle component + rapid-toggle debounce | Not started | Tanya19Lion | S | T1, T4 |
| T7 | i18n labels for ThemeToggle | Not started | Tanya19Lion | XS | T5 |
| T8 | Unit tests: theme resolution logic | Not started | Tanya19Lion | S | T2 |
| T9 | Component tests: ThemeToggle | Not started | Tanya19Lion | S | T5, T7 |
| T10 | E2E test: theme persistence | Not started | Tanya19Lion | S | T3, T5 |
| T11 | Manual QA: WCAG AA contrast audit | Not started | Tanya19Lion | S | T4 |
| T12 | Manual QA: QG-1/QG-2 perf verification | Not started | Tanya19Lion | XS | T3, T5, T10 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).
