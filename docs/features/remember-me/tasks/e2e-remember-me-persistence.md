---
status: In review
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-10-14"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T13 — E2E: remember-me persistence (AC-01, AC-02)

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-02
- SAD: [../sad.md](../sad.md) §6 Critical flow 1, US-01, US-05 sequences

## Scope

End-to-end test covering both branches of the "remember me" checkbox across a simulated browser
restart:

- Check "remember me", log in, close and reopen the browser context (clearing session-only
  in-memory state but preserving cookies) → still authenticated, no re-login prompt (AC-01).
- Leave "remember me" unchecked, log in, close and reopen the browser context → not authenticated,
  must log in again (AC-02).

## Deps

T9, T10.

## DoD

- [x] E2E test green for both branches, exercises the full login → (simulated restart) →
      session-check chain, not individual endpoints in isolation.
- [x] ~~Test runs against a real backend instance (or CI-provisioned Mongo)~~ — **superseded
      2026-10-14**: by the time this task was picked up, Playwright had already been added to the
      repo (`client/package.json`'s `test:e2e`, `client/e2e/theme-persistence.spec.ts`), and
      `client/playwright.config.ts`'s `webServer` only boots the Vite dev server, not a
      backend/Mongo — a live-backend e2e run isn't feasible with the current config. Implemented
      with `page.route` mocks of `/api/auth/*` instead; a live-backend variant stays open as a
      possible follow-up (candidate for T11 or a new task), not done here.
