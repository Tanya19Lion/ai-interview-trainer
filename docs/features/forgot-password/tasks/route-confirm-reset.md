---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T7 — POST /api/auth/password-reset/confirm

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-03
- SAD: [../sad.md](../sad.md) §6 "US-02: Set a new password via reset link" sequence diagram
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/password-reset/confirm` — 200/400/4XX

## Scope

`src/routes/auth.routes.ts` + `src/controllers/auth.controller.ts`: new unauthenticated route.

- Valid, unexpired, unused token → consume via T3, set `User.passwordHash`, increment `User.tokenVersion` (closes AC-06 for the reset path too), 200.
- Missing/expired/already-used token (AC-03) → 400 `password_reset.invalid_or_expired_token`.
- `newPassword` validated against the existing 8-character minimum (`PASSWORD_MIN_LENGTH`, matching `register`).

## Deps

T3, T4.

## DoD

- [ ] PR merged.
- [ ] Response shapes match `openapi.yaml`'s `ConfirmPasswordResetResponse`/`Error` schemas.
- [ ] `User.tokenVersion` is incremented on success (verified end-to-end by T13, but this task's own manual check should confirm the write happens).
