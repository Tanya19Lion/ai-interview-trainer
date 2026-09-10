---
id: T6
title: "Backend revocation tests (QG-1)"
status: Todo
deps: [T1, T2, T4]
estimate: M
owner: "Tanya19Lion"
---

# T6 — Backend revocation tests (QG-1)

**Links:** [[../sad.md]] §10 QG-1 (How verify) · [[../PRD.md]] AC-04, AC-07

## Scope

Dedicated integration-test suite proving the end-to-end revocation guarantee SAD §10 QG-1
specifies verbatim: *"log in, capture the access+refresh tokens, bump `tokenVersion` (simulating
logout or password reset), replay the captured tokens against a protected route, assert 401 —
no grace period."*

- Login → capture `token` + `refreshToken` cookies.
- Trigger logout (T4) → assert `User.tokenVersion` incremented.
- Replay the captured (pre-logout) `token` against a protected route (e.g. `GET /api/auth/me`) →
  assert 401 (proves T1's check).
- Replay the captured (pre-logout) `refreshToken` against `POST /api/auth/refresh` → assert 401
  `auth.session_revoked` (proves T3's check — note T6 depends on T1/T2/T4 only, not T3 by number,
  but the refresh-replay assertion exercises T3's handler; if T3 hasn't landed yet when this task
  starts, write that assertion but mark it `test.skip` with a comment referencing T3, don't block
  the whole suite on it).

No backend test-fixture/factory convention exists yet in this repo (confirmed in
[[../data-model.md]] Test fixtures section) — inline `UserModel.create({ email: 'user@example.test',
... })` calls per the existing `src/services/ai.service.test.ts` style, don't introduce a new
fixtures file for just this task.

## Out of scope

- k6 latency measurement (T7) — this task is correctness, not performance.
- Rate-limit tests — covered in T5's own DoD, not duplicated here.

## DoD

- New test file (suggested: `src/controllers/auth.controller.test.ts` or
  `src/middleware/auth.test.ts`, whichever the actual T1/T4 code organization ends up favoring)
  passes `npm run test` (Vitest).
- Both replay assertions (access token, refresh token) present and passing (or explicitly skipped
  with a T3 cross-reference, per Scope note above).
- PR ≤ 500 LOC.
