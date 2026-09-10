---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T10 — E2E test: theme persistence

## Links

- PRD: [../PRD.md](../PRD.md) §6 NFR "Persistence accuracy" — measurement method stated verbatim: "e2e test asserting re-render from localStorage"
- SAD: [../sad.md](../sad.md) §10 QG-3

## Scope

E2E test: manually choose a theme, reload the page, assert the app re-renders in the previously chosen theme by reading it back from `localStorage` — matches PRD's own stated measurement method for QG-3, not a substitute test approach.

## Deps

T3, T5.

## DoD

- [ ] PR merged.
- [ ] E2E test green, asserts persistence exactly as PRD §6 describes (not just "theme looks right" — must assert the localStorage-driven re-render).
