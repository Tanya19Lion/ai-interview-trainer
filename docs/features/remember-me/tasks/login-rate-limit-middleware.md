---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# T5 — Login rate-limit middleware (LoginAttempt)

## Links

- PRD: [../PRD.md](../PRD.md) §6 NFR (≤5 attempts / 15 min per email), §6.1
- ADR-0003: [../adr/0003-mongo-backed-counter-for-login-rate-limiting.md](../adr/0003-mongo-backed-counter-for-login-rate-limiting.md)
- SAD: [../sad.md](../sad.md) §6 US-01 sequence
- Data model: [../data-model.md](../data-model.md) `LoginAttempt` entity (already created, stage 06)
- Contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `login` 429 response

## Scope

New Express middleware (suggested: `src/middleware/rateLimit.ts`, matching the existing
`middleware/auth.ts` convention) wired onto `POST /api/auth/login` only — not `/register` or
`/google` (ADR-0003 scope).

- Upsert-by-`email` against `LoginAttemptModel` (`src/models/LoginAttempt.ts`, already exists):
  first attempt in a window creates `{ email, windowStart: now, count: 1 }`; subsequent attempts
  within the same (TTL-bounded) window increment `count`.
- `count > 5` → 429 `auth.rate_limited`, short-circuit before the credential check.
- Rely on the existing TTL index (`expireAfterSeconds: 900` on `windowStart`) for window reset —
  no manual expiry logic in the middleware.

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] 6th login attempt for the same email within 15 minutes → 429 `auth.rate_limited`, matching
      `openapi.yaml`'s example.
- [ ] A successful login does not reset or bypass the counter.
- [ ] Integration test: 5 attempts pass through, 6th is rejected before the credential check.
- [ ] Unit tests ([unit-tests-token-and-rate-limit.md](./unit-tests-token-and-rate-limit.md)) pass.

## Out of scope

- The `LoginAttempt` schema itself — already created in `src/models/LoginAttempt.ts` (stage 06).
- Rate-limiting `/register` or `/google`.
