---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T8 — POST /api/auth/change-password

## Links

- PRD: [../PRD.md](../PRD.md) AC-04, AC-05, AC-06
- SAD: [../sad.md](../sad.md) §6 "US-03: Change password while logged in" sequence diagram
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/change-password` — 200/400/409/4XX (CookieAuth)

## Scope

`src/routes/auth.routes.ts` + `src/controllers/auth.controller.ts`: new route behind `requireAuth`.

- Account has no `passwordHash` (Google-only, AC-05) → 409 `auth.google_account_no_password`.
- `currentPassword` doesn't match (AC-04) → 400 `auth.invalid_current_password`, `passwordHash` left unchanged.
- `currentPassword` matches → set `User.passwordHash = hash(newPassword)`, increment `User.tokenVersion` (AC-06), 200.

## Deps

T4.

## DoD

- [ ] PR merged.
- [ ] Response shapes match `openapi.yaml`'s `ChangePasswordResponse`/`Error` schemas.
- [ ] A wrong-current-password attempt leaves `passwordHash` byte-for-byte unchanged (verified by T15).
