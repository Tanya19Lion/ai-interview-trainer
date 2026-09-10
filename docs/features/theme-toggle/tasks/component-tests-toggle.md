---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T9 — Component tests: ThemeToggle

## Links

- PRD: [../PRD.md](../PRD.md) AC-01

## Scope

Component-level tests for `ThemeToggle`:

- Click toggles the active theme and calls `setTheme()` with the alternate value (AC-01).
- Icon swaps (`Sun` ↔ `Moon`) to match the resulting theme.
- `aria-label` matches the active locale (uk/en) from T7.

## Deps

T5, T7.

## DoD

- [ ] PR merged.
- [ ] Tests above pass.
