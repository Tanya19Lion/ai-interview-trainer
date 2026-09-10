---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T4 — requireAuth: tokenVersion check

## Links

- PRD: [../PRD.md](../PRD.md) AC-06
- ADR-0002: [../adr/0002-tokenversion-counter-for-session-invalidation.md](../adr/0002-tokenversion-counter-for-session-invalidation.md)
- SAD: [../sad.md](../sad.md) §5 (`middleware/auth.ts` extension), §8 Crosscutting (Authentication row)
- Rule: `.claude/rules/backend/auth.md` — existing `issueSession`/`requireAuth` pattern this must extend, not replace

## Scope

`src/middleware/auth.ts`:

- JWT issuance (`issueSession`) embeds the current `User.tokenVersion` at sign-time.
- `requireAuth` compares the JWT's embedded `tokenVersion` claim against the current `User.tokenVersion` in the database; mismatch → reject (401), matching ADR-0002's chosen mechanism.
- This is the single choke point — no per-route wiring (ADR-0002 Positive consequence).

## Deps

T1.

## DoD

- [ ] PR merged.
- [ ] Existing auth tests (login, protected routes) still green — this must not break any current session flow for users who haven't changed their password.
- [ ] A JWT issued before a `tokenVersion` bump is rejected after the bump (this is the behavior T13's integration test asserts end-to-end).
