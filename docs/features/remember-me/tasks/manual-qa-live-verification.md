---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T11 — Manual QA: live-Mongo verification + PROGRESS.md update

## Links

- Root `PROGRESS.md`
- Rule: `.claude/rules/frontend/overview.md` (existing "nothing behind auth has been visually
  verified against a live backend" caveat)
- PRD: [../PRD.md](../PRD.md) AC-01..AC-07

## Scope

Final wrap-up task, after every other task in this breakdown has merged:

- Manually exercise the full remember-me flow against a real MongoDB + `.env` (per
  `.claude/rules/backend/overview.md`'s required env vars) in a browser: check "remember me",
  close and reopen the browser, confirm the session survives; leave it unchecked, confirm it
  doesn't; log out, confirm the old session is truly dead; trigger a `forgot-password` reset (if
  deployed) and confirm it also kills the remember-me session (AC-04).
- Update root `PROGRESS.md` to record remember-me as implemented and manually verified — this
  repo's own convention for tracking in-flight work.

## Deps

T1, T3, T4, T5, T6, T7, T9, T10, T12, T13.

## DoD

- [ ] All 7 PRD acceptance criteria (AC-01..AC-07) manually confirmed against a live backend, not
      just unit/integration/k6 tests.
- [ ] `PROGRESS.md` updated with a dated entry.

## Out of scope

- Any new code — this is a verification + documentation task. If verification surfaces a bug,
  open a new task rather than silently patching here.
