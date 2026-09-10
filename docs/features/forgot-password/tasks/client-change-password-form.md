---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T11 — Client: change-password form (profile)

## Links

- PRD: [../PRD.md](../PRD.md) US-03, AC-04, AC-05, AC-06
- SAD: [../sad.md](../sad.md) §6 "US-03" and "US-04" sequence diagrams
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/change-password`

## Scope

A change-password form on the existing profile screen, current + new password fields, submitting to T8's endpoint:

- 409 `auth.google_account_no_password` (AC-05) → the same "signs in with Google" explanation pattern as T9, not a raw error.
- 400 `auth.invalid_current_password` (AC-04) → clear inline error, form retains the new-password input for retry.
- 200 → confirms the change; since this ends every other session (AC-06), consider whether the current session needs any client-side awareness (e.g., no special handling needed — the current session's own JWT keeps the tokenVersion it was issued with until its next request, per ADR-0002 §5).

## Deps

T8.

## DoD

- [ ] PR merged.
- [ ] Manual check: wrong current password shows the AC-04 message, doesn't clear the form destructively.
- [ ] Manual check: a Google-only account opening this screen sees the AC-05 explanation, not a broken form.
