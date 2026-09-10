---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# T3 — POST /api/auth/refresh handler

## Links

- PRD: [../PRD.md](../PRD.md) AC-03, AC-04, AC-05, AC-07, §6 QG-3
- ADR-0002: [../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md](../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md)
- SAD: [../sad.md](../sad.md) §6 US-02 sequence, Critical flow 2 & 4
- Contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `refreshSession` operation

## Scope

New `refreshSession` handler in `src/controllers/auth.controller.ts` + `POST /api/auth/refresh`
route in `src/routes/auth.routes.ts` (reads the `refreshToken` cookie, not `requireAuth`'s `token`
cookie).

- Verify `refreshToken` signature + expiry (server clock + the token's own embedded timestamp
  only — never client-reported time, AC-05/QG-3).
- Reuse T1's `tokenVersion` comparison helper against the refresh token's embedded value.
- On success: issue a new access `token` cookie only. Do not touch or renew `refreshToken` — fixed
  7-day, no rolling extension (AC-05).
- On failure: 401 with `auth.refresh_token_expired` (expired) or `auth.session_revoked`
  (`tokenVersion` mismatch) — both examples already in `openapi.yaml`.

## Deps

T1, T2.

## DoD

- [ ] PR merged.
- [ ] Matches `openapi.yaml`'s `refreshSession` operation: 200 with renewed `token` cookie only;
      401 with the two documented error codes.
- [ ] No `refreshToken` cookie present → 401 (same treatment as an actually-expired one).
- [ ] Integration test covering both 401 branches + the happy path.
- [ ] Unit test for QG-3 (server-clock-only expiry, [unit-tests-token-and-rate-limit.md](./unit-tests-token-and-rate-limit.md)) passes.
- [ ] Mock-server contract still resolves cleanly (`npm run mock:api -- docs/features/remember-me/contracts/openapi.yaml`).

## Out of scope

- Issuing the refresh token in the first place (T2).
- Rate-limiting this endpoint — no NFR or ADR calls for it.
