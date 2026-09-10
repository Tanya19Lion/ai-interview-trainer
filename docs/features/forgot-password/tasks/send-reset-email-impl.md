---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T5 — sendResetEmail implementation

## Links

- SAD: [../sad.md](../sad.md) §4 strategic choice 3 (pluggable email boundary), §7 Deployment view (new required env var)
- Epic: [./_epic.md](./_epic.md) "Open-decision handling" — depends on T0's spike outcome

## Scope

Implement the single `sendResetEmail(email, rawToken)` function behind `passwordReset.service.ts`'s boundary, using whatever T0's spike decided (real provider or dev-only stub). Add the new required environment variable(s) T0 named, following the existing convention alongside `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CLIENT_URL` (`.claude/rules/backend/overview.md`) — including a `.env.example` update if one exists in this repo.

## Deps

T0.

## DoD

- [ ] PR merged.
- [ ] A reset request observably sends (or logs, if T0 chose a dev stub) the email with a working reset link pointing at `CLIENT_URL`.
- [ ] New env var documented (`.env.example` or equivalent) and named exactly as T0 decided.

## Out of scope

- Deciding the provider — see T0.
- The request/confirm route handlers that call this — see T6.
