# Migration rules — baseline

<!-- Bootstrapped by skills/generate-data-model. Edit freely. -->
<!-- These rules are an opinionated default — see "Defaults" in SKILL.md. -->
<!-- The skill copies the "Hard rules" section below PLUS the one profile section that matches
     this repo's detected persistence profile (step 0). Delete the profile sections that don't
     apply once bootstrapped, so this file stays a single source of truth for this repo. -->

## Hard rules (store as dumb storage — applies to every profile)

- No business-rule validation embedded at the schema layer (SQL `CHECK`/`TRIGGER`; document-store
  `validate` functions or `pre('save')` hooks that encode domain rules beyond shape/type).
- No `DEFAULT '<business literal>'` / schema `default:` value that is a business decision — only
  a genuine identity default (`now()`, a generated id) belongs in the schema.
- No stored procedures.
- Business logic lives in app code.
- Every forward change has a stated rollback — as a file, a migration script, or (no-migration-tool
  profile) a documented manual procedure. No exceptions.
- Identifier strategy (app-generated UUID, a DB-side sequence, the store's native identifier, or
  a business key) must be confirmed with the user before use — never assumed by default.
- Test fixtures never live inside the migration/schema-change folder.
- No real-looking PII in seeds — use `example.test` addresses.

---

## Profile: relational-SQL

### Filenames

- Format: `<YYYYMMDDhhmmss>_<verb>_<entity>.up.sql` + matching `.down.sql`.
- Reason: parallel feature branches do not collide on the next sequential number.

### Required constraints

- Every `REFERENCES other_table(id)` is followed by `CREATE INDEX` on the FK column (same or next migration).
- Every `.up.sql` has a matching `.down.sql` that fully reverses it.
- `CREATE TABLE` / `CREATE INDEX` use `IF NOT EXISTS`.
- Seed `INSERT` uses `ON CONFLICT DO NOTHING`.

### Defaults

- PK: type per the confirmed identifier strategy (commonly `UUID`, sometimes `BIGSERIAL`/a DB sequence if that's the project's existing convention).
- Timestamps: `TIMESTAMPTZ NOT NULL DEFAULT now()`.
- Strings: `VARCHAR(N)` bounded; `TEXT` only for URLs / long descriptions.
- Naming: `plural snake_case` tables (`users`, `goal_progress`), `snake_case` columns.
- JSONB: only for semantically opaque payload. Structured fields → first-class columns.

### Zero-downtime patterns (mandatory for existing tables)

- New NOT NULL column → 3-step (add nullable → backfill → `SET NOT NULL`).
- New index on existing table → `CREATE INDEX CONCURRENTLY` (one statement per file — transaction-wrapper migration runners don't allow `CONCURRENTLY` inside a tx).
- Rename / drop column → 3-step (add new + dual-write in app code → backfill → drop old). Each phase = separate PR + deploy.

---

## Profile: document-store (with a migration tool, e.g. migrate-mongo)

### Filenames

- Format: `<YYYYMMDDhhmmss>_<slug>.js` with `up`/`down` exports.
- Reason: same collision-avoidance rationale as relational-SQL.

### Required constraints

- Every field with `ref: '<Model>'` has a matching `schema.index()` on that field.
- Every migration script's `up` has a matching `down`.
- The schema definition file (e.g. the Mongoose schema) is the contract; the migration script is
  only needed for actual data changes (new indexes, backfills) — a new optional field doesn't
  need one.

### Defaults

- Identifier: `_id` — either the store's native identifier (e.g. Mongo `ObjectId`) or an
  app-generated id, per the confirmed strategy — confirm, don't assume.
- Timestamps: `createdAt: { type: Date, default: Date.now, immutable: true }`. No `updatedAt`
  unless justified (don't blanket-enable `timestamps: true` without deciding).
- Strings: `String` with `maxlength`/`enum` for bounded/closed sets.
- Naming: camelCase fields, plural collection names — or whatever the project's existing schema
  files already use.
- `Schema.Types.Mixed` / nested sub-schema: only for semantically opaque or polymorphic payload.

### Zero-downtime patterns (mandatory for existing collections)

- New required field → 3-step (add optional → backfill script → flip to `required: true`).
- Rename / drop field → 3-step (add new + dual-write in app code → backfill → stop writing/read the old field). Each phase = separate PR + deploy.

---

## Profile: no-migration-tool (document-store or schemaless, no migration runner adopted)

This is a deliberate, common state for an early-stage project — not a gap to silently fix. If an
ADR or CLAUDE.md documents the reasoning, respect it.

### Record of change

- Every schema change gets a dated entry in the feature's `data-model.md` **Schema-change log**:
  what changed, the backfill approach (a described one-off script, or "none needed"), and the
  rollback procedure in prose.
- The schema definition file (e.g. the Mongoose schema) is updated directly — there is no separate
  migration file, because nothing would run it.

### Defaults

Same as the document-store profile above (identifier, timestamps, strings, naming, opaque
payload) — only the change-tracking mechanism differs.

### Zero-downtime patterns

Same 3-step decomposition as the document-store profile, expressed as three dated log entries
instead of three files.

---

## Out of scope (every profile)

- Multi-store (read replicas, sharding).
- Partitioning.
- Materialized views.

These are perf / scale topics, not contract topics. Owned by SRE / DBA, decided per-project with a separate ADR.