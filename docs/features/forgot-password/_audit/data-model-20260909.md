# Data-model audit — forgot-password

**Detected profile:** no-migration-tool (MongoDB via Mongoose). Evidence:
`.claude/rules/migrations.md` (project-wide, already documents this profile) and root
`docs/adr/0001-initial-setup.md`. No new rules bootstrap was needed — the existing file already
covers the document-store/no-migration-tool profile.

**Scope of this pass:** documentation-only, by explicit user choice — `src/models/*.ts` were
**not** edited. `data-model.md` describes the planned schema change as a plan for implementation
time, not a change already made in code.

**Generated files:**
- `docs/features/forgot-password/data-model.md` — ER diagram, `User` (1 new field) and
  `PasswordReset` (new collection) entity tables, indexes table, Schema-change log (2 entries),
  test-fixtures note.

**Default deviations applied:** none beyond what the project already established — `createdAt`-only
on `PasswordReset` (no `updatedAt`, per this skill's default and consistent with the entity never
being mutated after creation); native Mongo `_id` identifier strategy kept (matches existing
`User`/`InterviewSession` convention, not re-litigated); single-use enforced by document deletion
rather than a `used` boolean, to avoid a business-state schema default.

**Drift findings:** none. No client-side (`client/src/types/*.ts`) duplicate of the `User` shape
exists to drift against, and `PasswordReset` is a new server-only entity with no client type yet.

**Breaking changes decomposed:** none — both changes (`User.tokenVersion`, new `PasswordReset`
collection) are purely additive; neither needed the 3-step expand/backfill/contract sequence.

**TBDs:**
- `data-model.md` §Indexes note — rate-limiting for *unregistered* emails (PRD §6 NFR, ≤3
  requests/hour/email) has no schema-level answer yet; flagged as an app-level implementation
  question, not a data-model gap.
- Which email-delivery provider to integrate remains open (PRD §8, SAD §11) — does not affect this
  schema (the provider is called from `passwordReset.service.ts`, never persisted).

**Next stage:** `define-api forgot-password` (stage 10) — this project has no such skill installed
yet; the next real step is implementing `src/models/PasswordReset.ts` and the `tokenVersion` field
on `User.ts` per this plan, once a maintainer picks this up.
