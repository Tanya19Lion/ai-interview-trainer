---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T15 — Integration test: wrong current password (QG-4, AC-04)

## Links

- PRD: [../PRD.md](../PRD.md) AC-04
- SAD: [../sad.md](../sad.md) §10 QG-4

## Scope

Integration test: a change-password attempt with an incorrect `currentPassword` is rejected (400 `auth.invalid_current_password`), and the stored `passwordHash` is byte-for-byte unchanged afterward — asserted by re-reading the document, not just by the response status.

## Deps

T8.

## DoD

- [ ] PR merged.
- [ ] Test asserts both the rejection response AND the unchanged `passwordHash`.
- [ ] Test green.
