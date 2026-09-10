---
id: T3
title: "POST /api/auth/refresh handler"
status: Todo
deps: [T1, T2]
estimate: M
owner: "Tanya19Lion"
---

# T3 — POST /api/auth/refresh handler

**Links:** [[../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md]] ·
[[../sad.md]] §6 US-02 sequence, Critical flow 2 & 4 · [[../PRD.md]] AC-03, AC-04, AC-05, AC-07,
QG-3 · [[../contracts/openapi.yaml]] `refreshSession` operation

## Scope

New `refreshSession` handler in `src/controllers/auth.controller.ts` + `POST /api/auth/refresh`
route in `src/routes/auth.routes.ts` (protected by `CookieAuth` reading the `refreshToken` cookie,
not `requireAuth`'s `token` cookie).

- Verify `refreshToken` signature + expiry (server clock + token's own embedded timestamp only —
  never client-reported time, AC-05/QG-3).
- Reuse T1's `tokenVersion` comparison helper against the refresh token's embedded value.
- On success: issue a new access `token` cookie (reuse `issueSession`'s access-token signing
  logic, or extract it if `issueSession` doesn't cleanly expose it standalone). Do **not** touch
  or renew `refreshToken` — fixed 7-day, no rolling extension (AC-05).
- On failure: `401` with `auth.refresh_token_expired` (expired) or `auth.session_revoked`
  (`tokenVersion` mismatch) — both examples already in [[../contracts/openapi.yaml]].

## Out of scope

- Issuing the refresh token in the first place (T2).
- Rate-limiting this endpoint — no NFR or ADR calls for it; `openapi.yaml` deliberately has no
  `Idempotency-Key` here either (no retry annotation in any sequence).

## DoD

- `POST /api/auth/refresh` matches [[../contracts/openapi.yaml]]'s `refreshSession` operation:
  200 with renewed `token` cookie only; 401 with the two documented error codes.
- No `refreshToken` cookie present → 401 (same `auth.refresh_token_expired` treatment as an
  actually-expired one — client behavior is identical either way, per [[../sad.md]] §6 US-02).
- Integration test covering both 401 branches + the happy path.
- Mock-server contract still resolves cleanly (`npm run mock:api -- docs/features/remember-me/
  contracts/openapi.yaml`) — no accidental drift from the frozen contract.
- PR ≤ 500 LOC.
