# Data model audit — remember-me — 2026-09-10

## Detected profile

**no-migration-tool** — matches the already-documented project profile in
`.claude/rules/migrations.md` and the prior project-level audit
(`docs/_audit/data-model-2026-09-07.md`): MongoDB via Mongoose, no migration runner, root
`docs/adr/0001-initial-setup.md` states this is deliberate. `.claude/rules/migrations.md` already
existed — bootstrap step skipped.

## Generated files

- `src/models/User.ts` — extended: added `tokenVersion: { type: Number }` (Phase 1 of 3, ADR-0001).
- `src/models/LoginAttempt.ts` — new collection (ADR-0003): `email` (unique), `windowStart`
  (TTL-indexed, `expireAfterSeconds: 900`), `count`.
- `docs/features/remember-me/data-model.md` — ER diagram, `User` (extended) + `LoginAttempt` (new)
  entity tables, indexes table, Schema-change log (2 entries), test-fixtures note.

## Default deviations applied

- **`User.tokenVersion` has no schema `default`.** Per this project's own zero-downtime pattern
  (`.claude/rules/migrations.md`: "New required field on an existing collection → add optional →
  backfill script → flip to required: true"), only Phase 1 (add optional) runs in this pass —
  Phase 2 (backfill) and Phase 3 (enforce) are documented in the Schema-change log as follow-up
  work, owned by whoever implements the `requireAuth` revocation check.
- **`LoginAttempt.count` has no schema `default`** despite always starting at 1 — deliberately left
  to app code (the login handler's upsert), so the "first attempt = 1" business rule doesn't live
  in the store. `windowStart`'s `default: Date.now` is kept, since record-creation time is a
  genuine identity default, not a business rule.
- **No `createdAt`/`updatedAt` on `LoginAttempt`** — deviates from `User`'s shipped
  `{ timestamps: true }` exception, but matches the project's actual default (createdAt-only for
  new entities) *and* omits even that, because `windowStart` already serves as the creation
  timestamp — a second one would be redundant, not an oversight.

## Self-check results (step 13)

- **Naming.** Pass — camelCase fields, singular PascalCase model name/file (`LoginAttempt`,
  matches `User`/`InterviewSession` convention), Mongoose's default pluralization for the
  collection name (`loginattempts`).
- **Reversibility.** Pass — both Schema-change log entries state an explicit rollback in prose
  (unset-field for `tokenVersion`, drop-collection for `LoginAttempt`), as required for the
  no-migration-tool profile.
- **Reference indexes.** N/A — `LoginAttempt.email` is deliberately not a `ref: 'User'` (the
  rate-limit check runs before credential lookup, so it must work for emails with no matching
  `User`); no other reference-shaped field was added. `User.tokenVersion` is a plain counter, not
  a reference.
- **Forbidden features.** Pass — no `validate`/`pre('save')` hooks in either model; the only new
  `default` (`windowStart: Date.now`) is a genuine identity default, not a business decision.

## Drift findings

**None.** Compared `src/models/User.ts` (post-change) against `client/src/api/auth.ts`'s
`AuthUser` type: `tokenVersion` is correctly absent from `AuthUser`, the same way `googleId` and
`passwordHash` already are — a session-revocation counter must never reach the client (PRD §6.1),
so this is a legitimate subset, not drift. No client-side type exists for `LoginAttempt` (and
shouldn't — it's server-only rate-limit state never serialized to a response).

## Breaking changes decomposed

**`User.tokenVersion`** — 3-phase decomposition per ADR-0001 + this project's zero-downtime rule:

1. **Phase 1 (this pass, applied):** add `tokenVersion: { type: Number }`, optional, no default.
   Purely additive — no code path reads or writes it yet.
2. **Phase 2 (not yet scheduled):** backfill script sets `tokenVersion: 0` on every existing
   `User` document missing the field.
3. **Phase 3 (not yet scheduled):** flip to `required: true` with a genesis `default: 0` for new
   documents, once `requireAuth`'s revocation check is implemented and Phase 2 has run in every
   environment.

Owner for Phase 2/3: whoever implements the ADR-0001 `requireAuth` check — tracked as a stage-08
task, not executed in this data-model pass.

## TBDs

None — both entities are fully specified for this pass; the only open items are Phase 2/3 of the
`tokenVersion` rollout, which are explicitly logged as future work, not left ambiguous.

## Next stage

`api-forge remember-me` (stage 07) — new `POST /api/auth/refresh` endpoint, updated
`/login`/`/register` (`rememberMe` param), `/logout` (server-side revocation).
