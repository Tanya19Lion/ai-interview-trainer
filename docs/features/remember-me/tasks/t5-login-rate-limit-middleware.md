---
id: T5
title: "Login rate-limit middleware (LoginAttempt)"
status: Todo
deps: []
estimate: M
owner: "Tanya19Lion"
---

# T5 — Login rate-limit middleware (LoginAttempt)

**Links:** [[../adr/0003-mongo-backed-counter-for-login-rate-limiting.md]] · [[../sad.md]] §6
US-01 sequence · [[../PRD.md]] §6 NFR (≤5 attempts / 15 min per email), §6.1 · [[../data-model.md]]
`LoginAttempt` entity (already created, stage 06) · [[../contracts/openapi.yaml]] `login` 429
response

## Scope

New Express middleware (suggested location: `src/middleware/rateLimit.ts`, matching the existing
`middleware/auth.ts` convention) wired onto `POST /api/auth/login` only — not `/register` or
`/google` (ADR-0003 scope, confirmed in `openapi.yaml`'s per-endpoint descriptions).

- Upsert-by-`email` against `LoginAttemptModel` (`src/models/LoginAttempt.ts`, already exists):
  first attempt in a window creates `{ email, windowStart: now, count: 1 }`; subsequent attempts
  within the same (TTL-bounded) window increment `count`.
- `count > 5` → `429 auth.rate_limited`, short-circuit before the credential check.
- Rely on the existing TTL index (`expireAfterSeconds: 900` on `windowStart`) for window reset —
  don't implement manual expiry logic in the middleware itself.

## Out of scope

- The `LoginAttempt` schema itself — already created in `src/models/LoginAttempt.ts` (stage 06).
- Rate-limiting `/register` or `/google` — explicitly not required by ADR-0003.

## DoD

- 6th login attempt for the same email within 15 minutes → `429 auth.rate_limited`, matching
  [[../contracts/openapi.yaml]]'s `login` 429 example.
- A successful login does not reset or bypass the counter (still counts toward the 5, per ADR-0003
  Considered-options rationale — ADR-0003 doesn't distinguish success/failure attempts).
- Integration test: 5 attempts pass through to credential check, 6th is rejected before it.
- k6/manual check that this middleware's extra Mongo round-trip doesn't blow PRD §6's login p95
  ≤ 300 ms budget on its own (full measurement is T7's job; this task just confirms no gross
  regression locally).
- PR ≤ 500 LOC.
