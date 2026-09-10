---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T2 — Create PasswordReset collection

## Links

- ADR-0001: [../adr/0001-store-reset-tokens-in-a-separate-collection.md](../adr/0001-store-reset-tokens-in-a-separate-collection.md)
- Data model: [../data-model.md](../data-model.md) `PasswordReset` entity table + Indexes table + Schema-change log entries ("create PasswordReset collection", "add attemptsRemaining to PasswordReset")

## Scope

`src/models/PasswordReset.ts` — new Mongoose model, fields exactly per `data-model.md`:

- `userId` (ObjectId, required, `ref: 'User'`)
- `tokenHash` (String, required, unique, `maxlength: 64`)
- `expiresAt` (Date, required)
- `attemptsRemaining` (Number, required, default `3`)
- `createdAt` (Date, required, default now, immutable — no `updatedAt`, per data-model.md's explicit "never mutated after creation" rule)

Indexes: `tokenHash_1` (unique), `userId_1`, TTL index on `expiresAt` (`expireAfterSeconds: 0`).

**Hard rule check (`.claude/rules/migrations.md`):** no `used`/`consumed` boolean field — single-use is enforced by document absence after `findOneAndDelete` (T3), not a schema-layer flag. Do not add one.

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] All three indexes present and match `data-model.md`'s Indexes table.
- [ ] No business-state field (e.g. `used`) added to the schema — model stays dumb storage.
- [ ] `data-model.md`'s existing Schema-change log entries already cover this — no new entry needed unless implementation deviates.
