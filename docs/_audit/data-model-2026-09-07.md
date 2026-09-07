# Data model audit — project level — 2026-09-07

## Detected profile

**no-migration-tool** — `package.json` has `mongoose` (no `migrate-mongo`/other runner);
`src/models/User.ts` + `InterviewSession.ts` use `mongoose.Schema` directly, no `migrations/`
folder exists; `docs/adr/0001-initial-setup.md` explicitly states this is deliberate: "Mongoose
without formal migrations means a document-shape change has no automatic rollback path —
`make migrate` stays a documentation placeholder until the schema stabilizes enough to justify
a migration tool." Respected as ground truth, not treated as a gap to fix.

## Generated files

- `.claude/rules/migrations.md` — bootstrapped (was missing), no-migration-tool profile.
- `docs/data-model.md` — full retrofit: ER diagram, `User` + `InterviewSession` (+ embedded
  `QuestionAttempt`) entity tables, indexes table, empty Schema-change log (no changes applied
  this pass), test-fixtures note.

## Default deviations applied

- **`updatedAt` present on both models.** The skill's own default is "`createdAt` only unless
  justified." Both `User` and `InterviewSession` use Mongoose's `{ timestamps: true }` shorthand,
  which ships both fields. This is pre-existing, shipped behavior — documented as a deviation in
  both `data-model.md` and `.claude/rules/migrations.md`, not changed.
- **Identifier strategy: Mongo-native `ObjectId`**, not an app-generated UUID. Confirmed from the
  codebase's own established convention (`ref: 'User'`, `_id` used directly throughout
  controllers/routes) rather than asked, per the skill's "don't re-litigate settled precedent"
  rule.

## Self-check results (step 13)

- **Naming.** Pass — camelCase fields, PascalCase model names, matches `client/src/types/*.ts`.
- **Reversibility.** N/A this pass — no schema change was applied (see Recommended follow-up
  below; its rollback will be documented in `data-model.md`'s Schema-change log if/when applied).
- **Reference indexes — FAIL, then fixed.** `InterviewSession.userId` has `ref: 'User'` but had
  no matching index. Confirmed independently two ways: (a) the reference-index self-check rule
  itself, and (b) every query against `InterviewSessionModel` in the codebase
  (`getActiveSession`, `getHistory`, `getStats` — `src/controllers/{interview,history,
  stats}.controller.ts`) filters by `{ userId, status }` with no supporting index. User confirmed
  the fix — see Applied follow-up below.
- **Forbidden features — flagged for manual review, not a hard fail.** No `validate`/`pre('save')`
  hooks exist anywhere in `src/models/` (clean). One borderline `default:` value:
  `status: { default: 'in_progress' }` on `InterviewSession` — arguably a business decision
  rather than a pure identity default (like `Date.now`), though it reads more like a lifecycle-
  initialization default ("a new session starts unstarted") than an arbitrary business rule.
  Flagging for the user's judgment rather than silently accepting or silently rewriting it.

## Applied follow-up

**Added a compound index `{ userId: 1, status: 1 }` on `InterviewSession`** (user confirmed
2026-09-07, after an explanation of why: collection-scan cost at scale, and that `userId`
filtering is also the ownership-enforcement mechanism for PRD AC-05, not just an optimization).
Every one of the three controllers that query this collection by `userId`
(`getActiveSession`, `getHistory`, `getStats`) also filters by `status`, and none had index
support before this change — they ran as collection scans.

- **Change:** `src/models/InterviewSession.ts` — added
  `interviewSessionSchema.index({ userId: 1, status: 1 })`.
- **Backfill:** none needed.
- **Rollback:** `db.interviewsessions.dropIndex({ userId: 1, status: 1 })`.
- Recorded in `docs/data-model.md`'s Schema-change log (2026-09-07 entry).

## Drift findings

**None.** Compared `src/models/{User,InterviewSession}.ts` against
`client/src/types/interview.ts` and `client/src/api/auth.ts`'s `AuthUser`:
- `TOPICS`/`LEVELS` enums match exactly (9 topics, 3 levels, same order) — the exact drift class
  `check_enums.py`'s pre-commit hook already guards.
- `QuestionAttempt` (client) matches `questionAttemptSchema` (server) field-for-field.
- `InterviewSessionDetail`/`HistorySessionSummary` (client) are legitimate subsets of the server
  schema (omit `userId` — correctly never sent to the client).
- `AuthUser` (client) is a legitimate subset of `User` (omits `googleId`/`passwordHash` —
  correctly never sent to the client, per PRD §6.1).

## Breaking changes decomposed

None this pass.

## TBDs

None — this is a full retrofit of an already-shipped, stable schema; no entity was left
undecided.

## Next stage

`define-api` (stage 10) — though note `src/index.ts`'s route table (documented in `docs/sad.md`
§5) already exists; this would be a retrofit pass akin to this one, not greenfield design.
