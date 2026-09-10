---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T14 — Integration test: Google-account edge case (QG-3, AC-05)

## Links

- PRD: [../PRD.md](../PRD.md) AC-05
- SAD: [../sad.md](../sad.md) §10 QG-3, §6 "US-04: Understand why reset doesn't apply to a Google account" sequence diagram (both entry points)

## Scope

Integration tests asserting the specific response path for an account with no `passwordHash` (Google-only) at BOTH entry points named in SAD §6 US-04:

- Via `/password-reset/request` (T6) → 200 with `hint: google_account`, no `PasswordReset` document created.
- Via `/change-password` (T8) → 409 `auth.google_account_no_password`.

## Deps

T6, T8.

## DoD

- [ ] PR merged.
- [ ] Both entry points asserted — a test covering only one of them does not satisfy this task.
- [ ] Test asserts no `PasswordReset` document is created for the request-path case (confirms no wasted token issuance for an account that can't use it).
