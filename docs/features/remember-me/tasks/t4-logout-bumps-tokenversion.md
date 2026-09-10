---
id: T4
title: "logout bumps tokenVersion"
status: Todo
deps: [T2]
estimate: S
owner: "Tanya19Lion"
---

# T4 — logout bumps tokenVersion

**Links:** [[../adr/0001-extend-tokenversion-counter-to-cover-logout.md]] · [[../sad.md]] §6
US-06 sequence, Critical flow 3 · [[../PRD.md]] AC-07 · [[../contracts/openapi.yaml]] `logout`
operation

## Scope

`src/controllers/auth.controller.ts` — `logout` currently ignores the request entirely
(`_req: Request`) and only clears the `token` cookie. Extend it to:

- Read and verify the `token` cookie if present; on a valid token, increment that user's
  `User.tokenVersion` (ADR-0001) so any access/refresh token issued before this point is rejected
  by T1's `requireAuth` check and T3's `refreshSession` check, even if replayed (AC-07, no grace
  period).
- Clear both `token` and `refreshToken` cookies unconditionally.
- No valid `token` cookie present → graceful `200` no-op (not an error) — logging out of an
  already-ended session isn't a failure case, per [[../sad.md]] §6 US-06's `alt` branch.

## Out of scope

- The `tokenVersion` comparison logic itself (T1 owns that).
- Password-reset-triggered revocation — that's the `forgot-password` feature's own ADR-0002,
  already shares the same `User.tokenVersion` field but is implemented separately.

## DoD

- `POST /api/auth/logout` with a valid `token` cookie bumps `User.tokenVersion` and clears both
  cookies; matches [[../contracts/openapi.yaml]]'s `logout` 200 response.
- Same endpoint with no/invalid `token` cookie still returns 200, clears cookies, does not throw.
- Integration test: log in, log out, replay the pre-logout access token against a protected route
  → 401 (proves the bump actually took effect via T1's check).
- PR ≤ 500 LOC.
