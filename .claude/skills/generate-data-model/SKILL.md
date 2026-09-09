---
name: generate-data-model
description: >
  Use when the user wants to design the data model AND generate the actual
  forward + rollback schema changes in one pass, for any persistence store
  (relational/SQL, document-store like MongoDB, or a project with no formal
  migration tool yet). Triggers on "data model for {slug}", "schema for
  {feature}", "generate migrations for {slug}", "DB design + migration",
  "stage 06 for {slug}", "/generate-data-model {slug}". Detects the
  project's actual persistence stack first (never assumes SQL), then reads
  PRD §4 + SAD §6.4 ER + sequence diagrams + (optional) domain types in the
  project's language and produces docs/features/{slug}/data-model.md +
  stack-appropriate schema-change files (or a schema-change plan, if no
  migration tool exists) + a markdown report. Supersedes legacy design-db +
  plan-migration skills. Prerequisites: docs/features/{slug}/PRD.md
  (stage 03) + docs/features/{slug}/sad.md (stage 04) — hard refuse if
  missing.
---

# Skill: generate-data-model (SDLC stage 06)

End-to-end runner for the persistence cut: design + schema changes + drift check. Stack-agnostic by design — it detects whether the project is relational, document-store, or has no migration tool at all, and adapts its output accordingly. Never assumes SQL. Output is **shippable**: real schema-change files (or a real schema-change plan, when that's what the project's stack actually supports), not an abstract plan.

Supersedes the legacy `design-db` (stage 08 — data-model.md only) and `plan-migration` (stage 09 — migration plan only) skills. The "DB as dumb storage" rules carry over verbatim across every profile. The opinionated additions are below ("Defaults" section).

## Owner

Backend Lead.

## When to use

- "data model for <slug>", "schema for <feature>", "generate migrations for <slug>".
- After PRD + SAD §6.4 (ER stub) + at least the critical sequences exist. Run after `complete-sequence-diagrams` so the skill knows every entity the runtime needs.
- `/generate-data-model <slug>` — explicit invocation.
- `/generate-data-model <slug> --mode brownfield` — analyze the existing schema/migrations and propose a delta.
- `/generate-data-model <slug> --drift-only` — just compare the project's domain types against the current schema; no generation.
- Skip if `data-model.md` exists AND every entity in it has a matching pair of schema-change files (or, for a no-migration-tool project, a matching entry in the schema-change log).

## Inputs

- `<slug>` — same as for PRD / SAD.
- **Gate (hard refuse if missing):**
  - `docs/features/<slug>/PRD.md` — entities live in §4 user-story acceptance criteria.
  - `docs/features/<slug>/sad.md` — §6.4 ER section provides initial relationships.
  - Optional: `docs/features/<slug>/diagrams/` (or SAD §6 inline) — sequences inform indexes (one index per query, justified).
  - Optional: existing domain types in the project's language (Go structs, TypeScript interfaces / Mongoose schemas, Java records, Python dataclasses, ...) — drift detection only.

## Step 0: Detect the persistence profile (always runs first, before any defaults apply)

**Never assume SQL.** Determine which profile the project actually uses, in this priority order:

1. `.claude/rules/migrations.md` already exists → the profile it documents wins; read it instead of re-detecting.
2. The project's dependency manifest for its language/ecosystem (e.g. a package manager or module file) — look for persistence-related packages (an ORM, a query builder, a driver for a relational or document store, an existing migration tool).
3. Existing schema/migration folders: `migrations/*.sql` → relational-SQL; `migrations/*.js` + a `migrate-mongo-config` → document-store; `src/models/*.ts` (or `.js`) with `mongoose.Schema` → document-store; `prisma/schema.prisma` → relational-SQL (via Prisma).
4. CLAUDE.md / ADRs / project docs — an explicit statement of the stack and its migration story (e.g. "MongoDB via Mongoose, `make migrate` is a documentation stub until the schema stabilizes" is itself the profile — read it as ground truth, don't second-guess it).

Classify into exactly one of:

- **relational-SQL** — Postgres/MySQL/SQLite via raw SQL or a query builder. Output = `.up.sql` / `.down.sql` pairs.
- **document-store** — MongoDB/Mongoose, Firestore, DynamoDB. Output = versioned schema definitions (e.g. a Mongoose schema file per collection) + migration scripts in whatever runner the project already uses (`migrate-mongo`, a custom script runner).
- **no-migration-tool** — a document-store (or schemaless store) where the project has deliberately not adopted a migration tool yet (confirm via CLAUDE.md/ADR — this is a legitimate, common state for an early-stage single-maintainer project, not a gap to silently "fix"). Output = a **schema-change plan**: a dated entry appended to `data-model.md`'s "Schema-change log" describing the field/collection change, its backfill approach, and its rollback story in prose — no executable migration file, because none would be run by anything.
- **other / unclear** — ask the user which profile applies before continuing ("This repo's persistence stack isn't clear from the code — which applies: relational SQL, document store with a migration tool, document store with no migration tool yet, or something else?").

Report the detected profile in one line before proceeding: `Detected profile: <profile> (evidence: <file/reference>).` Silently defaulting to SQL is the single most common failure mode this step exists to prevent.

## Defaults (the opinionated set)

These defaults are baked into the skill and into the baseline `.claude/rules/migrations.md` the skill writes on first run (profile-scoped — see step 2). They differ from common community defaults; the skill flags this explicitly in the report. The **Principle** column is what's actually opinionated and portable; the profile columns are just its expression in each stack.

| Topic | Principle | relational-SQL | document-store / no-migration-tool |
|---|---|---|---|
| Schema-change identifier | Timestamped, collision-free across parallel branches | `YYYYMMDDhhmmss_<slug>.up.sql` + `.down.sql` | `YYYYMMDDhhmmss_<slug>.js` migration script (document-store), or a dated `### YYYY-MM-DD — <slug>` entry in `data-model.md`'s schema-change log (no-migration-tool) |
| Idempotency | Re-running a single change against a partially-applied store must not error | `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING` | New optional fields are inherently additive in a schemaless store — no guard needed; a backfill script must still check-before-write |
| Audit fields | `created_at` only by default, immutable-leaning | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` — no `updated_at` unless justified | `createdAt: { type: Date, default: Date.now, immutable: true }` — no `updatedAt` unless justified (Mongoose's `timestamps: true` opts into both; override to createdAt-only unless the user asks for updatedAt) |
| Delete strategy | Hard delete + a separate audit trail if history is required; no soft-delete flag by default | no `deleted_at` column | no `deleted: boolean` field |
| Identifier / PK | No fixed default — confirm the strategy with the user (app-generated UUID, a DB-side sequence, the store's native identifier, or a business key) before generating anything | `id <confirmed type>` (e.g. `UUID`, or `BIGSERIAL` if the project already uses sequence PKs) | `_id` — either the store's native identifier (e.g. Mongo `ObjectId`) or an app-generated id, per what's confirmed; don't fight an established convention |
| Naming | Plural, matching the project's existing casing convention (read it from the code, don't impose one) | `snake_case` plural tables/columns | camelCase fields / plural collection names, or whatever `client/src/types/*.ts`-equivalent files already use |
| Indexes | One per query, justified by a sequence diagram's read/write note | `CREATE INDEX ... CONCURRENTLY` on existing tables | `schema.index({ field: 1 })` in the schema definition, or `db.collection.createIndex()` in a migration script / schema-change log entry |
| Breaking changes | Auto-decompose: expand → backfill → contract | 3 migration files | 3 phases: add optional field (backward-compatible) → backfill script → enforce via app-level validation (`required: true`); documents aren't physically rewritten until next save |
| New required field on an existing entity | Auto-decompose: add optional → backfill → enforce | add nullable → backfill → `SET NOT NULL` | add optional field → backfill script → flip to `required: true` at the app/schema-validation layer |
| Field types | Bounded/typed — no stringly-typed catch-alls | `VARCHAR(N)` bounded, `TEXT` for long text/URLs | `String` with `maxlength`/`enum` for closed sets — same bounding discipline, expressed as schema validation instead of a column width |
| Opaque/polymorphic payload | Only for genuinely opaque or polymorphic data, justified inline | `JSONB` | `Schema.Types.Mixed` or a nested sub-schema — same justification requirement |
| Forbidden | Business logic lives in app code, not the store | `CHECK`, `TRIGGER`, `DEFAULT '<business value>'`, sequence-as-PK | Schema `validate` functions encoding business rules (beyond shape/type), `pre('save')` hooks with business logic, `default:` values that are business decisions rather than a genuine identity default |
| Multi-store, replication, sharding, partitioning | Out of scope — perf/scale, not contract | — | — |

## Protocol

1. **Prereq check (hard).** `test -f docs/features/<slug>/PRD.md && test -f docs/features/<slug>/sad.md` → exit ≠ 0 = refuse with pointer to which prereq is missing.

2. **Persistence-profile detection (step 0 above), then rules bootstrap.** If `.claude/rules/migrations.md` is absent, copy the matching profile section(s) of `./templates/rules-migrations-baseline.md` (the shared "Hard rules" section always applies, plus the one profile section that matches the detected profile) into `.claude/rules/migrations.md`, and tell the user "I wrote a baseline rules file for the <profile> profile; edit it if your team disagrees with any default."

3. **Read prereqs in this order:**
   a. PRD §4 — extract entity candidates from acceptance criteria.
   b. SAD §6.4 — initial ER stub (often `<!-- TBD: relationships -->`).
   c. `docs/features/<slug>/diagrams/` (or SAD §6 inline) — every sequence note like `writes <entity.field>` becomes a query requirement → index candidate.
   d. (Optional) domain types in the project's language, if present — the skill builds a type-vs-schema map for drift detection.
   e. (Brownfield only) the existing schema — parse `migrations/*.sql` offline for relational-SQL, or read existing schema definition files (e.g. `src/models/*.ts` Mongoose schemas) for document-store. No live-DB connection.

4. **Aggregate roots discussion.** Ask the user (or infer from PRD acceptance criteria): which aggregate roots? What lives around what? A Lesson aggregates ContentBlocks; an Order aggregates its line items. Without explicit aggregates the reference graph turns into a hairball — this matters just as much in a document-store, where it decides what's embedded vs. what's a separate collection reference.

5. **Identifier strategy.** No default — ask the user which strategy applies: an app-generated UUID, a DB-side sequence, the store's native identifier (e.g. Mongo `ObjectId`), or a business key (e.g. a PRD acceptance criterion demanding a lookup slug as the identifier). First check whether the project already has an established convention elsewhere in the code — don't re-litigate settled precedent, but don't silently assume one either if nothing in the code shows it.

6. **Field types and constraints.** For each entity, per the detected profile's column in the Defaults table above:
   - Bounded strings get an explicit bound (`title: maxLength: 200` in the PRD → `VARCHAR(200)` or `maxlength: 200`).
   - Long text / URLs get the profile's unbounded text type.
   - Opaque/polymorphic payloads get the profile's opaque type, with a one-line justification in `data-model.md`'s `Notes` column.
   - `created_at`/`createdAt` immutable, default-now. No `updated_at`/`updatedAt` unless justified.
   - `<!-- TBD -->` where honestly undecided.

7. **Indexes per query.** For each sequence note that reads/writes an entity field, produce an index candidate. Discard candidates with no concrete query justification. Print a "Justification" column in `data-model.md`.

8. **Generate `docs/features/<slug>/data-model.md`** from the template (`./templates/data-model.md`):
   - ER Mermaid diagram (manual layout — the skill writes a clean ordered block, not an auto-generated one).
   - Entities table per aggregate, with types expressed per the detected profile.
   - Indexes table with `Query it serves` filled.
   - For a no-migration-tool project, this file also carries the **Schema-change log** (step 9c).

9. **Generate schema-change output**, branching by detected profile:

   **relational-SQL** — in `<repo-root>/migrations/` (or a stack-specific folder if `.claude/rules/migrations.md` overrides):
   - **Greenfield** (default): one `<timestamp>_create_<entity>.up.sql` + `.down.sql` per entity (or per aggregate, if small).
   - **Brownfield** (`--mode brownfield`): diff vs. the parsed existing schema; produce ALTERs only.
   - `IF NOT EXISTS` on every `CREATE TABLE` / `CREATE INDEX`. `ON CONFLICT DO NOTHING` on every seed `INSERT`.
   - For existing-table `CREATE INDEX`: emit `CONCURRENTLY` and warn the file must contain only that one statement (transaction-wrapper migration runners don't allow `CONCURRENTLY` inside a tx).
   - For a new required field on an existing table: emit 3 files (`add_nullable`, `backfill`, `set_not_null`); the user reviews the backfill SQL.

   **document-store** (with an existing migration tool, e.g. `migrate-mongo`) — same shape as above, translated: one `<timestamp>_<slug>.js` migration script per entity/aggregate with `up`/`down` exports; the schema definition itself (e.g. the Mongoose schema file) is generated or updated directly, since the store won't reject documents that don't match it — the schema file is the contract, the migration script is only needed for actual data changes (new indexes, backfills).

   **no-migration-tool** — no executable file is generated. Instead:
   - Update or generate the schema definition file directly (e.g. the Mongoose schema in `src/models/`), matching the project's existing conventions.
   - Append a dated entry to `data-model.md`'s **Schema-change log**: what changed, why, the backfill approach (as a described one-off script or manual step the maintainer runs), and the rollback story in prose. This is the deliberate, first-class output for this profile — not a fallback — matching a project's own documented decision not to adopt a migration tool yet (e.g. a project ADR stating that a document-shape change has no automatic rollback path and a formal migration tool stays a documentation placeholder until the schema stabilizes enough to justify one).

10. **Generate seeds.** Three buckets, expressed per profile:
    - **Bootstrap** (admin user, default org) — relational-SQL: first migration `<timestamp>_bootstrap_<thing>.up.sql`; document-store: a seed script or a documented one-off `insertOne`/`create` call. Hardcode a deterministic identifier in whatever format was confirmed in step 5, so re-running the seed is idempotent.
    - **Lookup data** (statuses, currencies, rating scales) — relational-SQL: separate migration with `INSERT ... ON CONFLICT DO NOTHING`; document-store: idempotent upsert script (`updateOne(..., { upsert: true })`).
    - **Test fixtures** — never inside `migrations/`. Generate factory functions colocated with the project's existing test-fixture convention (e.g. `internal/testfixtures/<entity>.go` for Go, `client/src/test-utils/factories/<entity>.ts` or `tests/factories/<entity>.ts` for TS/JS). Document in `data-model.md` under "Test fixtures".
    - **PII guard:** the skill refuses to write a real-looking email / name / phone in any seed. Use `admin@example.test`, `user-<uuid>@example.test`, `Test User`. Hard rule, applies to every profile.

11. **Drift detection (always runs; `--drift-only` short-circuits to here).** If domain types exist in the project's language:
    - For each type's field, look up the matching schema field (relational-SQL: column; document-store: schema path).
    - Report mismatches in 4 categories: `field-without-schema-entry`, `schema-entry-without-field`, `type-mismatch`, `nullability/optionality-mismatch`.
    - **Auto-propose fix migrations** (relational-SQL / document-store with a tool) or fix entries in the schema-change log (no-migration-tool) in a `_drift/` subfolder — the user reviews before applying.
    - Note: a project that independently types its domain on two sides (e.g. a server-side schema and a hand-duplicated client-side type file, with no shared package) is a common and legitimate drift-detection target — treat "client type ↔ server schema" as just another instance of the field-vs-schema comparison, not a special case.

12. **Breaking changes — 3-step decomposition.** If the user describes a rename / drop / re-type:
    - Phase 1: add the new field, dual-write from app code (not a DB trigger).
    - Phase 2: backfill — batched script with an ETA and resumability, written up as a one-page `backfill-<field>.md` companion file.
    - Phase 3: remove the old field (relational-SQL: `DROP COLUMN`; document-store: stop writing it and, optionally, a cleanup script that unsets it — existing documents don't need an immediate rewrite). Each phase = separate change file/log entry = separate PR = separate deploy.

13. **Self-check (the 4 mandatory checks, run as inline logic).** For every generated artifact, branched by profile where the check itself is profile-specific:
    - **Naming.** Matches the project's established casing/pluralization convention (read from existing code, not imposed).
    - **Reversibility.** relational-SQL: every `.up.sql` has a matching `.down.sql` that fully reverses it (every CREATE has a DROP, every ADD COLUMN a DROP COLUMN, every CREATE INDEX a DROP INDEX). document-store-with-tool: every migration script's `up` has a matching `down`. no-migration-tool: every schema-change log entry states a rollback procedure in prose, even if it's a manual multi-step description — a stated way back is mandatory in every profile, only its form differs.
    - **Reference indexes.** Every foreign-key-shaped reference (`REFERENCES other_table(id)` in SQL; a field with `ref: 'Model'` in a Mongoose schema) has a matching index.
    - **Forbidden features.** relational-SQL: grep for `CHECK (`, `CREATE TRIGGER`, `DEFAULT '` followed by a non-`now()` business literal — fail with line numbers. document-store: flag (for manual review, not an automatic grep-fail — these patterns are harder to distinguish mechanically from legitimate use) any `validate:` function or `pre('save')` hook that appears to encode a business rule rather than a shape/type check, and any `default:` value that reads as a business decision rather than a genuine identity default.

    Any failure or flag → fix or surface to user (no silent commit).

14. **Generate report.** `docs/features/<slug>/_audit/data-model-<timestamp>.md`:
    - **Detected profile:** which one, and the evidence used to determine it.
    - **Generated files:** list of all schema-change files / schema-change-log entries / `data-model.md`.
    - **Default deviations applied:** which defaults differ from the user's repo conventions (e.g., "your repo's existing collections use a sequential-number naming style; I wrote timestamps — see Defaults table").
    - **Drift findings:** if any (with proposed fixes under `_drift/`).
    - **Breaking changes decomposed:** if any 3-step sequence was generated.
    - **TBDs:** every `<!-- TBD -->` in `data-model.md` with file:line.
    - **Next stage:** `api-forge <slug>` (stage 07).

15. **Propose commit.** `06: data-model + schema changes for <slug>` + next owner (Backend Lead → stage 07 API contracts via `api-forge`).

## Questions for discussion

- Aggregate roots — what owns what, and (document-store specifically) what's embedded vs. referenced?
- Where does the user explicitly want an `updated_at`/`updatedAt` field (overriding the immutable-first default)? Surfacing this is mandatory; the skill never adds it silently.
- Soft-delete or hard-delete + audit? Hard-delete is the default; the skill needs an explicit override.
- Indexes — any "just in case" the user wants despite no concrete query?
- Opaque/polymorphic payload usage — confirm each candidate field.
- Identifier strategy — app-generated UUID, a DB-side sequence, the store's native identifier, or a business key? No default for any profile — ask, unless the project already shows a clear precedent.
- For a no-migration-tool project: is this genuinely the team's deliberate choice (check for an ADR), or has the project just never needed one yet and would benefit from adopting a lightweight tool now? Surface this as an open question rather than silently reinforcing or silently overriding the status quo.
- For breaking changes — does the user accept 3-step decomposition, or do they have a maintenance window?

## Definition of Done

- `data-model.md` exists with ER, every entity, every index with query justification (and, for no-migration-tool projects, a schema-change log entry for every change made).
- For every entity/change: a matched forward+rollback pair exists in whatever form the detected profile uses (files, or a documented log entry).
- All 4 self-checks pass or are explicitly flagged for the user.
- Audit report in `_audit/data-model-<timestamp>.md`, including the detected profile and its evidence.
- Drift report (if drift detected) with proposed fixes.

## Anti-patterns

- **Assuming SQL without checking.** The single most common failure this skill exists to prevent — always run step 0 first.
- **Business defaults in the store** (`DEFAULT 'pending'`, or a Mongoose `default:` that's a business decision). Only a genuine identity default (`now()`, a generated ID) belongs in the schema; the rest lives in app code.
- **Business-rule validation embedded at the schema layer** (SQL `CHECK`, or a Mongoose `validate`/`pre('save')` hook encoding domain rules). Business logic lives in code the team actually reads together.
- **Index "just in case" without a concrete query.** Each index costs write performance in every store.
- **Unbounded strings for everything.** Bounded types (`VARCHAR(N)`, `maxlength`) → documentation as much as storage.
- **Triggers / stored procedures / heavy pre-save hooks.** The store stays dumb regardless of profile.
- **Assuming an identifier strategy instead of confirming it.** A DB-side sequence, a native store id, and an app-generated UUID are all legitimate — picking one silently, without checking the project's existing convention or asking, is the anti-pattern.
- **One mega-change with 5 unrelated alterations.** Rollback becomes all-or-nothing. Split.
- **Removing a field/column before the new code deploys.** Breaks running instances mid-rollout. Always the 3-step decomposition.
- **Real-looking PII in seeds** (Gmail / real-domain emails). Use `example.test`.
- **Sequential naming for schema changes in a multi-developer repo.** Two parallel feature branches collide on the next number. Use timestamps.
- **Live-store introspection with no offline-parse fallback.** CI usually has no store credentials; parse the existing schema files/migrations instead.
- **Treating "no migration tool yet" as a gap to silently fix.** If the project has documented that choice (an ADR, a CLAUDE.md note), respect it and produce a schema-change plan — don't introduce a migration framework the team didn't ask for.
- **Generating a baseline `rules/migrations.md` and forgetting to tell the user.** The skill MUST report when it bootstraps a rules file, and which profile it wrote.

## Templates

→ [./templates/data-model.md](./templates/data-model.md) — output structure for the design doc, profile-agnostic.
→ [./templates/rules-migrations-baseline.md](./templates/rules-migrations-baseline.md) — baseline `.claude/rules/migrations.md` content, split into a shared section plus one section per profile; copied at step 2 when missing.
→ [./templates/migration-plan.md](./templates/migration-plan.md) — cross-feature; folded into the audit report, not generated as a separate file in greenfield.

## Example invocations

> **User:** "data model for acme-orders" (relational-SQL profile)
>
> **Skill behavior:**
> 1. `test -f docs/features/acme-orders/PRD.md && test -f docs/features/acme-orders/sad.md` → OK.
> 2. Step 0: the dependency manifest shows a relational-DB driver + a `migrations/*.sql` folder → **relational-SQL**. `.claude/rules/migrations.md` missing → bootstrapped from the SQL profile section. Reported to user.
> 3. Reads PRD (entities: Order, OrderLineItem, Customer, PaymentEvent), SAD §6.4 (ER stub: Order ||--o{ OrderLineItem), sequences (index on `orders.customer_id` for listOrders; on `order_line_items.order_id` for getOrder with line items).
> 4. Aggregate roots: Order aggregates OrderLineItem; Customer is referenced, not embedded.
> 5. Identifier: the repo's existing tables all use `BIGSERIAL` — confirmed with the user to keep that convention rather than introduce something new.
> 6. Types: `status VARCHAR(32)` (enum-in-app), `shipping_address JSONB` (polymorphic — carrier-specific fields, justified inline in the Notes column), `total_cents INTEGER NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, no `updated_at`.
> 7. Indexes: `idx_orders_customer_id`, `idx_line_items_order_id`, `idx_orders_status_pending WHERE status='pending'` (partial, from a sequence's "list pending orders" query).
> 8. Writes `docs/features/acme-orders/data-model.md`.
> 9. Writes 3 migration pairs: `20260523120000_create_orders.up.sql/.down.sql`, ... All `IF NOT EXISTS`.
> 10. Test fixtures: `internal/testfixtures/order.go` with `NewOrder`, `NewOrderLineItem`. PII guard satisfied.
> 11–15. Drift: no Go structs yet → skipped. Self-check: all pass. Report + commit suggestion `08+09: data-model + schema changes for acme-orders`.

> **User:** "data model for order-history" (document-store, no-migration-tool profile)
>
> **Skill behavior:**
> 1. Prereqs OK.
> 2. Step 0: the dependency manifest shows a document-store ORM with no migration-tool dependency, an existing schema definition file uses that ORM's schema API directly, and a project ADR states the missing migration tool is a deliberate placeholder → **no-migration-tool**. `.claude/rules/migrations.md` missing → bootstrapped from the shared "Hard rules" section + the document-store/no-migration-tool profile section. Reported to user.
> 3. Reads PRD (entity: `Order` aggregating line-item attempts), SAD §6.4 ER stub, sequences (`writes Order.lineItems[]`, `reads Order by customerId` → index candidate).
> 4. Aggregate root: `Order` aggregates its line items as an embedded array (matches the project ADR's stated reason for choosing a document store: shape changes more often than a rigid relational schema would allow at this stage).
> 5. Identifier: project already relies on the store's native id everywhere else — confirmed with the user to keep that convention rather than introduce an app-generated id.
> 6. Types: `status: { type: String, enum: STATUSES }`, `channel: { type: String, enum: CHANNELS }`, `lineItems: [{ ... }]` (embedded, not a separate collection — no cross-collection query needs it split out), `createdAt: { type: Date, default: Date.now, immutable: true }`, no `updatedAt`.
> 7. Indexes: `schema.index({ customerId: 1 })` for the history/stats "own orders only" filter (an AC in the project-level PRD).
> 8. Writes `docs/features/order-history/data-model.md` including the Schema-change log section.
> 9. No-migration-tool branch: updates the `Order` schema definition file directly; appends a dated Schema-change log entry describing the new index, its backfill (none needed — new index, no new required field), and its rollback (documented in prose).
> 10. Seeds: none required. Test fixtures: none new (existing factory reused).
> 11. Drift detection: compares the server schema against a hand-duplicated client-side type file — the same drift class a pre-commit enum-sync check might already guard for; reports any field beyond that sync that's out of step.
> 12–15. No breaking change in this pass. Self-check: reversibility check passes because the log entry states a rollback in prose. Report includes detected profile + evidence. Commit suggestion `08+09: data-model + schema changes for order-history`.