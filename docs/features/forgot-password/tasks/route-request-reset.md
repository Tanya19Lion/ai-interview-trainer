---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T6 — POST /api/auth/password-reset/request

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-02, AC-05, §6 NFR (rate limit)
- SAD: [../sad.md](../sad.md) §6 "US-01: Request a password reset" sequence diagram
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/password-reset/request` — request/response schemas, 200/429/4XX

## Scope

`src/routes/auth.routes.ts` + `src/controllers/auth.controller.ts`: new unauthenticated route, following the existing controller pattern (`res.status(...).json({ error })`).

Branches, exactly per SAD §6 US-01 and openapi.yaml:

- Unknown email (AC-02) → 200 generic confirmation, no existence leak.
- Known Local account, under rate limit → 200 generic confirmation + `attemptsRemaining`, triggers T3's issue flow + T5's send.
- Known Local account, rate limit exceeded → 429 `password_reset.rate_limited`.
- Known Google-only account (AC-05) → 200 with `hint: google_account`, no token generated.

## Deps

T3, T5.

## DoD

- [ ] PR merged.
- [ ] Response shapes match `openapi.yaml`'s `RequestPasswordResetResponse` schema exactly (including the `hint` and `attemptsRemaining` fields' conditional presence).
- [ ] The unknown-email rate limit does not use `checkUnregisteredEmailRateLimit`'s in-memory `Map` (`passwordReset.service.ts`): it is per instance on serverless and grows without bound. Replace it with a counter in Mongo (window 1 hour, max 3, same as `RATE_LIMIT_MAX`) with a `docs/data-model.md` Schema-change log entry, or drop it if the generic 200 makes it unnecessary. Nothing calls it before this task, so it was left as is (PROGRESS.md, open item 4).
- [ ] No response distinguishes "unknown email" from "known email" except the deliberate Google-account hint (AC-02's postcondition, stated explicitly in the SAD sequence's closing note).
