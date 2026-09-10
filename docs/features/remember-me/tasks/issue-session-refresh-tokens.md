---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# T2 — issueSession: access+refresh tokens, rememberMe param

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-02, AC-06
- ADR-0002: [../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md](../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md)
- SAD: [../sad.md](../sad.md) §6 US-01/US-04/US-05 sequences
- Contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `LoginBody`/`RegisterBody`/`GoogleLoginBody.rememberMe`

## Scope

`src/controllers/auth.controller.ts` — the single `issueSession(res, user)` choke point
(`.claude/rules/backend/auth.md`) is extended to accept `rememberMe: boolean`:

- Always signs and sets the short-lived access `token` cookie, now embedding `tokenVersion` in
  the JWT payload.
- `rememberMe: true` → additionally signs a 7-day, non-rolling refresh JWT (also embedding
  `tokenVersion`) and sets it as the `refreshToken` httpOnly cookie.
- `rememberMe: false`/omitted → `token` cookie becomes a session cookie (no `Max-Age`, matching
  the 2026-09-10 default-off decision override, AC-02); no `refreshToken` cookie set.
- `googleLogin`, `register`, `login` each read an optional `rememberMe` from `req.body` and pass
  it through — same rule regardless of method (AC-06).

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] `login`/`register`/`googleLogin` accept `rememberMe`, matching `openapi.yaml`'s request
      schemas.
- [ ] `rememberMe: true` → both `token` and `refreshToken` cookies set.
- [ ] `rememberMe: false`/omitted → only `token` cookie set, no `Max-Age`.
- [ ] Unit tests ([unit-tests-token-and-rate-limit.md](./unit-tests-token-and-rate-limit.md)) pass.

## Out of scope

- The `/refresh` endpoint (T3) — this task only issues the refresh token, doesn't consume it.
- Login rate limiting (T5).
