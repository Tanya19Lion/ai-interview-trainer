---
id: T11
title: "PROGRESS.md update + manual verification against live Mongo"
status: Todo
deps: [T1, T3, T4, T5, T6, T7, T9, T10]
estimate: S
owner: "Tanya19Lion"
---

# T11 — PROGRESS.md update + manual verification against live Mongo

**Links:** root `PROGRESS.md` · `.claude/rules/frontend/overview.md` (existing "nothing behind
auth has been visually verified against a live backend" caveat) · [[../PRD.md]] all AC-01..AC-07

## Scope

Final wrap-up task, after every other task in this breakdown has merged:

- Manually exercise the full remember-me flow against a real MongoDB + `.env` (per
  `.claude/rules/backend/overview.md`'s required env vars) in a browser: check "remember me",
  close and reopen the browser, confirm the session survives; leave it unchecked, confirm it
  doesn't; log out, confirm the old session is truly dead; trigger a `forgot-password` reset (if
  that feature is deployed) and confirm it also kills the remember-me session (AC-04).
- Update root `PROGRESS.md` to record remember-me as implemented and manually verified — this
  repo's own convention for tracking in-flight work (root `CLAUDE.md`: "check it before starting
  new work so you don't duplicate or skip a step").

## Out of scope

- Any new code — this is a verification + documentation task, not an implementation one. If
  verification surfaces a bug, open a new task rather than silently patching here.

## DoD

- All 7 PRD acceptance criteria (AC-01..AC-07) manually confirmed against a live backend, not
  just unit/integration/k6 tests.
- `PROGRESS.md` updated with a dated entry.
- No PR — this task is a doc update + a verification log, small enough to fold into whichever PR
  closes the last remaining task, or its own trivial PR.
