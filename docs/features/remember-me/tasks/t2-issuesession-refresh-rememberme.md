---
id: T2
title: "issueSession: access+refresh tokens, rememberMe param"
status: Todo
deps: []
estimate: M
owner: "Tanya19Lion"
---

# T2 — issueSession: access+refresh tokens, rememberMe param

**Links:** [[../adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md]] ·
[[../sad.md]] §6 US-01, US-04, US-05 sequences · [[../PRD.md]] AC-01, AC-02, AC-06 ·
[[../contracts/openapi.yaml]] `LoginBody`/`RegisterBody`/`GoogleLoginBody.rememberMe`

## Scope

`src/controllers/auth.controller.ts` — the single `issueSession(res, user)` choke point
(`.claude/rules/backend/auth.md`) is extended to accept a `rememberMe: boolean` argument:

- Always signs and sets the short-lived access `token` cookie (unchanged shape), now embedding
  `tokenVersion` in the JWT payload.
- When `rememberMe` is `true`: additionally signs a 7-day, non-rolling refresh JWT (also embedding
  `tokenVersion`) and sets it as the `refreshToken` httpOnly cookie.
- When `rememberMe` is `false`/omitted: `token` cookie becomes a session cookie (no `Max-Age`,
  matching the 2026-09-10 default-off decision override, AC-02) and no `refreshToken` cookie is
  set at all.
- `googleLogin`, `register`, `login` each read an optional `rememberMe` from `req.body` and pass
  it through to `issueSession` — same rule regardless of method (AC-06).

## Out of scope

- The `/refresh` endpoint itself (T3) — this task only issues the refresh token, doesn't consume
  it.
- Login rate limiting (T5) — separate middleware, not part of `issueSession`.

## DoD

- `login`/`register`/`googleLogin` all accept `rememberMe` in the request body, matching
  `openapi.yaml`'s `LoginBody`/`RegisterBody`/`GoogleLoginBody` schemas.
- `rememberMe: true` → both `token` and `refreshToken` cookies set, per
  [[../contracts/openapi.yaml]]'s documented `Set-Cookie` behavior on `login`'s 200 response.
- `rememberMe: false`/omitted → only `token` cookie set, no `Max-Age` (session cookie).
- Unit tests for both branches (cookie presence/absence, JWT payload contains `tokenVersion`).
- PR ≤ 500 LOC.
