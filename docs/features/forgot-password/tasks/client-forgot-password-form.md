---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T9 — Client: forgot-password request form

## Links

- PRD: [../PRD.md](../PRD.md) US-01, AC-02, AC-05 (§1 Context notes the LoginPage's "Forgot password" link is currently plain text with no functionality)
- SAD: [../sad.md](../sad.md) §5 C4 Container ("React SPA — Forgot-password entry, reset form, change-password form")
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/password-reset/request`

## Scope

Wire `LoginPage`'s existing "Forgot password" link to a new form/page that submits an email to T6's endpoint and renders:

- The generic confirmation message (never distinguishes registered/unregistered, AC-02).
- The Google-account hint message + a "Sign in with Google" CTA when `hint: google_account` is present (AC-05, US-04).
- The 429 rate-limited response as a user-facing message, not a raw error.

## Deps

T6.

## DoD

- [ ] PR merged.
- [ ] Manual check: submitting an unregistered email shows the same message as a registered one.
- [ ] Manual check: submitting a Google-account email shows the explanatory hint + Google CTA, not a generic error.
