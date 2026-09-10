---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# T6 — Integration test: session revocation (QG-1)

## Links

- SAD: [../sad.md](../sad.md) §10 QG-1 ("How verify: log in, capture the access+refresh tokens,
  bump tokenVersion, replay the captured tokens, assert 401")
- PRD: [../PRD.md](../PRD.md) AC-04, AC-07

## Scope

Dedicated integration-test suite proving the end-to-end revocation guarantee SAD §10 QG-1
specifies:

- Login → capture `token` + `refreshToken` cookies.
- Trigger logout (T4) → assert `User.tokenVersion` incremented.
- Replay the captured (pre-logout) `token` against a protected route (e.g. `GET /api/auth/me`) →
  assert 401 (proves T1's check).
- Replay the captured (pre-logout) `refreshToken` against `POST /api/auth/refresh` → assert 401
  `auth.session_revoked` (proves T3's check).

No backend test-fixture/factory convention exists yet in this repo (confirmed in
[../data-model.md](../data-model.md) Test fixtures section) — inline `UserModel.create({ email:
'user@example.test', ... })` calls per the existing `src/services/ai.service.test.ts` style, don't
introduce a new fixtures file for just this task.

## Deps

T1, T2, T4.

## DoD

- [ ] PR merged.
- [ ] `npm run test` (Vitest) green.
- [ ] Both replay assertions (access token, refresh token) present and passing.

## Out of scope

- k6 latency measurement (T7) — this task is correctness, not performance.
- Rate-limit tests — covered in T5's own DoD.
