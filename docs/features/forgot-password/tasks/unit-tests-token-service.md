---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T12 — Unit tests: token issue/consume/rate-limit (QG-1)

## Links

- SAD: [../sad.md](../sad.md) §10 QG-1 ("How verify: unit tests for token-consume-once behavior and the rate-limit threshold")
- PRD: [../PRD.md](../PRD.md) §6 NFR (≤15min TTL, ≤3/hour/email, 100% single-use)

## Scope

Unit tests for `passwordReset.service.ts` in isolation:

- Consuming a token twice — second attempt fails (single-use, 100% guarantee).
- A token past `expiresAt` fails verification (TTL semantics), independent of MongoDB's actual TTL-index deletion timing.
- Rate limit: the 4th request within an hour for the same registered email is rejected; the 3rd is not.
- Rate limit: the unregistered-email counter (T3's separate mechanism) is exercised, not just the registered-email path.

## Deps

T3.

## DoD

- [ ] PR merged.
- [ ] All four scenarios above have a passing test.
- [ ] `make test` (or equivalent) green.
