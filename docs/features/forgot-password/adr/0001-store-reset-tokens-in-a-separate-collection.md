<!-- Format: MADR (Markdown Any Decision Record). -->

---
status: Accepted
owner: "Tanya (architect/eng)"
reviewers: []
updated_at: "2026-09-09"
feature_size: S
stage: "04-05"
ticket: "TBD"
---

# 0001 — Store password-reset tokens in a separate PasswordReset collection

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** Tanya (architect/eng)

## Context

The forgot/reset password feature (PRD AC-01, AC-02, AC-03) needs somewhere durable to hold a
short-lived, single-use reset-token record per attempt. MongoDB is the only stateful store in
this system — there is no Redis or session store (SAD §2 Constraints). The question is whether
that token record lives as new fields on the existing `User` document or as its own collection.
This is fundamental: it shapes `src/models/`, the lookup query shape in the new
`passwordReset.service.ts`, and the `docs/data-model.md` schema-change log entry required by
`.claude/rules/migrations.md`.

## Decision drivers

- Models must stay "dumb storage" — no business-rule validation embedded at the schema layer
  (`.claude/rules/migrations.md`).
- Reset-token churn (issue, expire, single-use consume) is unrelated to the rest of the `User`
  document's lifecycle and its own `updatedAt` timestamp semantics.
- PRD §6 requires a hard TTL (≤15 min) and a single-use guarantee (100%) — the storage shape must
  make atomic, expiry-aware consumption straightforward.
- Zero-downtime pattern for schema changes (`.claude/rules/migrations.md`): adding a wholly new
  collection has no backfill burden at all, versus adding optional fields to an existing,
  frequently-read `User` document.

## Considered options

1. **New optional fields on `User`** (`passwordResetTokenHash`, `passwordResetExpiresAt`) —
   keeps all auth-adjacent state in one collection, one document per job-seeker.
2. **Separate `PasswordReset` collection** — one document per reset attempt, referencing the
   `User` by `_id`, with its own TTL-indexed `expiresAt`.

## Decision outcome

**Chosen:** Option 2, a separate `PasswordReset` collection. It keeps reset-token churn (which
happens per-attempt, not per-account) fully decoupled from the `User` document's own `updatedAt`
semantics, and lets MongoDB's native TTL index on `expiresAt` handle expiry cleanup automatically
instead of the application having to reason about stale fields on every `User` read.

## Consequences

**Positive**
- `User` document stays untouched by reset-token churn — no accidental `updatedAt` bumps on the
  account from a reset attempt that was never completed.
- A TTL index on `PasswordReset.expiresAt` lets MongoDB garbage-collect expired attempts for
  free, with no application-level cleanup job.
- Multiple concurrent reset attempts for the same account are trivially representable as
  multiple documents, without cramming multi-value state onto a single-value `User` field.

**Negative**
- Verifying a reset token now requires a lookup in a second collection instead of a single `User`
  read (no join in MongoDB — this is a second round-trip, acceptable at this project's scale per
  SAD §2 Organisational constraints).
- One more collection to document in `docs/data-model.md`'s Schema-change log per
  `.claude/rules/migrations.md`.

**Neutral**
- Migrating to fields-on-`User` later, if ever needed, is possible but would require a one-off
  backfill script and a new dated schema-change log entry — not expected to be needed.

## Links

- PRD: [[../PRD.md]] AC-01, AC-02, AC-03, §6 NFR (token TTL/rate-limit)
- SAD: [[../sad.md]] §4, §5
- Related ADR: [[0002-tokenversion-counter-for-session-invalidation]]
