# Migration rules — ai-interview-trainer

<!-- Bootstrapped by skills/generate-data-model on 2026-09-07 for the detected profile
     (no-migration-tool). Edit freely if the team's conventions change. -->
<!-- Detected profile evidence: package.json → `mongoose` (no `migrate-mongo`/other migration
     runner); src/models/User.ts + InterviewSession.ts use mongoose.Schema directly;
     docs/adr/0001-initial-setup.md states `make migrate` is a deliberate documentation
     placeholder "поки схема не стабілізується настільки, щоб виправдати міграційний
     інструмент." Respect that decision — don't introduce a migration framework unasked. -->

## Hard rules (store as dumb storage)

- No business-rule validation embedded at the schema layer (Mongoose `validate` functions or
  `pre('save')` hooks that encode domain rules beyond shape/type).
- No schema `default:` value that is a business decision — only a genuine identity default
  (`Date.now`, a generated id) belongs in the schema.
- No stored procedures / heavy hooks.
- Business logic lives in app code (`services/`, `controllers/`), not in `models/`.
- Every forward change gets a dated entry in `docs/data-model.md`'s Schema-change log with a
  stated rollback procedure in prose — no exceptions, even though there's no migration file to
  pair it with.
- Identifier strategy: this repo already relies on Mongo's native `_id` (`ObjectId`) everywhere
  (`ref: 'User'` in `InterviewSession.userId`, `_id` used directly in controllers/routes) — keep
  that convention. Don't introduce app-generated UUIDs without an explicit reason.
- Test fixtures never live inside a migration/schema-change folder (n/a here — no such folder
  exists; keep it that way unless a migration tool is adopted).
- No real-looking PII in seeds — use `example.test` addresses.

## Record of change (no-migration-tool profile)

- Every schema change gets a dated entry in `docs/data-model.md`'s **Schema-change log**: what
  changed, the backfill approach (a described one-off script, or "none needed"), and the rollback
  procedure in prose.
- The schema definition file (`src/models/*.ts`) is updated directly — there is no separate
  migration file, because nothing would run it.

## Defaults

- Timestamps: this repo's existing schemas use Mongoose's `{ timestamps: true }` shorthand, which
  gives both `createdAt` AND `updatedAt` on every document (`User`, `InterviewSession`) — this is
  a deliberate deviation from the skill's own "createdAt only by default" opinion, already shipped
  and in use; don't silently strip `updatedAt` from existing schemas to match the skill's default.
  New entities should default to `createdAt`-only unless the same justification (mutable
  documents that benefit from a visible last-modified timestamp) applies.
- Strings: `String` with `enum` for closed sets (`topic`, `level`, `status` already do this).
- Naming: camelCase fields, PascalCase model names (`InterviewSessionModel`), singular collection
  names via Mongoose's default pluralization — matches `client/src/types/*.ts`'s casing.
- Opaque/polymorphic payload: none currently in use — if one is introduced, use
  `Schema.Types.Mixed` or a nested sub-schema, justified inline in `data-model.md`.

## Zero-downtime patterns

- New required field on an existing collection → add optional → backfill script → flip to
  `required: true`.
- Rename / drop field → add new + dual-write in app code → backfill → stop writing/reading the
  old field. Each phase = separate dated log entry = separate PR = separate deploy.

## Out of scope

- Multi-store (read replicas, sharding).
- Partitioning.
- Materialized views.

Perf/scale topics, not contract topics — decided per-project with a separate ADR if they ever
become relevant.