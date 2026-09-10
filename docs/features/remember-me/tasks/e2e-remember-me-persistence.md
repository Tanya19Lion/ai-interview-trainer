---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T13 — E2E: remember-me persistence (AC-01, AC-02)

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-02
- SAD: [../sad.md](../sad.md) §6 Critical flow 1, US-01, US-05 sequences

## Scope

No e2e tooling (Playwright/Cypress) exists in this repo yet — this task introduces the first one;
flag the chosen tool to the user rather than assuming.

End-to-end test covering both branches of the "remember me" checkbox across a simulated browser
restart:

- Check "remember me", log in, close and reopen the browser context (clearing session-only
  in-memory state but preserving cookies) → still authenticated, no re-login prompt (AC-01).
- Leave "remember me" unchecked, log in, close and reopen the browser context → not authenticated,
  must log in again (AC-02).

## Deps

T9, T10.

## DoD

- [ ] E2E test green for both branches, exercises the full login → (simulated restart) →
      session-check chain, not individual endpoints in isolation.
- [ ] Test runs against a real backend instance (or CI-provisioned Mongo), not the Prism mock —
      the behavior under test (cookie persistence across a session boundary) is meaningless
      against a mock.
