---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T1 — Add User.tokenVersion field

## Links

- ADR-0002: [../adr/0002-tokenversion-counter-for-session-invalidation.md](../adr/0002-tokenversion-counter-for-session-invalidation.md)
- Data model: [../data-model.md](../data-model.md) `User` entity table + Schema-change log entry "2026-09-09 — add tokenVersion to User"

## Scope

`src/models/User.ts`: add `tokenVersion: { type: Number, required: true, default: 0 }` — exactly as specified in `data-model.md`. No backfill script needed (Mongoose applies the schema default on read for existing documents, per the log entry's own reasoning).

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] Field matches `data-model.md`'s table exactly (type, required, default).
- [ ] `data-model.md`'s Schema-change log entry already covers this — no new entry needed unless the implementation deviates from what's documented (if it does, update the log, don't silently diverge).

## Out of scope

- The `requireAuth` check that reads this field — see T4.
