---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T8 — Unit tests: theme resolution logic

## Links

- PRD: [../PRD.md](../PRD.md) AC-02, AC-03, AC-06
- SAD: [../sad.md](../sad.md) §10 QG-3 "How verify" (test intent, not this specific suite — QG-3 is the e2e in T10; this task covers the resolution logic in isolation)

## Scope

Unit tests for `ThemeProvider`'s resolution function in isolation (mock `localStorage` and `matchMedia`):

- Valid stored value present → used, OS read skipped (covers the "manual choice wins" rule).
- Missing/corrupted/invalid stored value → falls back to `prefers-color-scheme`, no thrown error (AC-02).
- No stored value, first visit → OS preference read once, not persisted (AC-06).
- OS preference changes after a manual choice exists → stored choice still wins (AC-03).

## Deps

T2.

## DoD

- [ ] PR merged.
- [ ] All four scenarios above have a passing test.
- [ ] `make test` (or client equivalent) green.
