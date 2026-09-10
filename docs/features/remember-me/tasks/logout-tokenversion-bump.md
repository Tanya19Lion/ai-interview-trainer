---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T4 — logout bumps tokenVersion

## Links

- PRD: [../PRD.md](../PRD.md) AC-07
- ADR-0001: [../adr/0001-extend-tokenversion-counter-to-cover-logout.md](../adr/0001-extend-tokenversion-counter-to-cover-logout.md)
- SAD: [../sad.md](../sad.md) §6 US-06 sequence, Critical flow 3
- Contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `logout` operation

## Scope

`src/controllers/auth.controller.ts` — `logout` currently ignores the request entirely
(`_req: Request`) and only clears the `token` cookie. Extend it to:

- Read and verify the `token` cookie if present; on a valid token, increment that user's
  `User.tokenVersion` (ADR-0001) so any access/refresh token issued before this point is rejected
  by T1's `requireAuth` check and T3's `refreshSession` check, even if replayed (AC-07, no grace
  period).
- Clear both `token` and `refreshToken` cookies unconditionally.
- No valid `token` cookie present → graceful 200 no-op, not an error.

## Deps

T2.

## DoD

- [ ] PR merged.
- [ ] Valid `token` cookie → `User.tokenVersion` bumped, both cookies cleared, matches
      `openapi.yaml`'s `logout` 200 response.
- [ ] No/invalid `token` cookie → still 200, clears cookies, does not throw.
- [ ] Integration test: log in, log out, replay the pre-logout access token against a protected
      route → 401.

## Out of scope

- The `tokenVersion` comparison logic itself (T1 owns that).
- Password-reset-triggered revocation (`forgot-password` feature's own ADR-0002).
