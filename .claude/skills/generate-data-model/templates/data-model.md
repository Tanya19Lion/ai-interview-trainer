---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: S
stage: "08"
ticket: "<ticket-id>"
persistence_profile: "<relational-SQL | document-store | no-migration-tool>"
---

# Data model — <feature>

> Persistence profile: **<relational-SQL | document-store | no-migration-tool>** (detected in
> `generate-data-model` step 0 — see the audit report for evidence). Types below are expressed in
> this profile's terms; see SKILL.md's Defaults table for the equivalent in another profile.

## ER diagram

```mermaid
erDiagram
    USER ||--o{ <ENTITY> : has
    <ENTITY> {
        <id-type> id PK
        <bounded-string-type> name
        <datetime-type> created_at
    }
```

<!-- id-type: whatever identifier strategy was confirmed in step 5 (e.g. SQL `UUID`/`BIGSERIAL`; document-store `ObjectId` or an app-generated id). -->
<!-- bounded-string-type: SQL `VARCHAR(N)`; document-store `String` with `maxlength: N`. -->
<!-- datetime-type: SQL `TIMESTAMPTZ`; document-store `Date`. -->

## Entities

### `<entity>`

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` / `_id` | <id-type> | PK, per the project's confirmed identifier strategy | <...> |
| `<field>` | <bounded-string-type>(N) | required | <...> |
| `created_at` / `createdAt` | <datetime-type> | required, immutable, default = now | |
| `updated_at` / `updatedAt` | <datetime-type> | **only if explicitly justified** — omit by default | <...> |

**Access patterns:**
- <pattern 1> → index `<idx_name>` on `<fields>`.
- <pattern 2> → <...>.

**Constraints:** UNIQUE on `<...>`, reference → `<other_entity>(id)`.

<!-- Why: business logic lives in code, not in the store. Only uniqueness / required / reference /
     default-now / indexes belong here — no CHECK/TRIGGER-equivalent business validation. -->

## Indexes

| Index | Fields | Query it serves |
|---|---|---|
| <idx_1> | <fields> | <query> |

## Schema-change log

<!-- Only populated for the no-migration-tool profile — this is that profile's forward+rollback
     record in place of executable migration files. Leave this section out entirely for
     relational-SQL / document-store-with-tool profiles, where the migration files themselves are
     the record. -->

### YYYY-MM-DD — <slug of the change>

- **Change:** <what field/entity/index changed, and why>.
- **Backfill:** <how existing documents get the new shape — a described one-off script, or "none needed">.
- **Rollback:** <the manual/scripted steps to undo this change>.

## Test fixtures

<!-- Where the factory functions for this entity live, matching the project's existing
     test-fixture convention (e.g. `internal/testfixtures/<entity>.go`,
     `tests/factories/<entity>.ts`). -->