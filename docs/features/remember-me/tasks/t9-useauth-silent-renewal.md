---
id: T9
title: "useAuth.ts silent access-token renewal"
status: Todo
deps: [T8]
estimate: M
owner: "Tanya19Lion"
---

# T9 — useAuth.ts silent access-token renewal

**Links:** [[../sad.md]] §6 US-02 sequence (Critical flow 2, "Silent access-token renewal") ·
[[../PRD.md]] US-01 · `.claude/rules/frontend/api-and-hooks.md`

## Scope

`client/src/hooks/useAuth.ts` — the access token is short-lived by design (ADR-0002); a
remembered session needs the client to renew it silently before it expires, without a re-login
prompt.

- The renewal should happen *proactively*, before the access token expires, not reactively after
  `useMe()` already gets a 401 — a 401 there means the app already showed a stale-session UI
  moment before recovering, which is worse UX than never expiring visibly. Exact trigger mechanism
  (a timer derived from the access token's known lifetime, or a React Query
  `refetchInterval`-driven check calling T8's `refreshSession()`) is an open implementation
  decision — flag it to the user rather than picking silently, since it affects `JWT_EXPIRES_IN`
  coupling between client and server.
- On a genuine 401 from `refreshSession()` (no valid `refreshToken`, expired, or revoked): do
  **not** retry silently — let `useMe()`'s existing 401 handling (redirect to `/login` via
  `RequireAuth`, per `.claude/rules/frontend/routing-and-auth.md`) take over, showing the clear
  "session expired" message (AC-02, AC-03) instead of a silent redirect loop.

## Out of scope

- `refreshSession()` itself (T8).
- The login-time `rememberMe` checkbox (T10) — this task only handles renewal of an
  already-established remembered session.

## DoD

- A remembered session (access token near/past expiry, valid `refreshToken` present) renews
  silently — `useMe()` keeps succeeding across a simulated access-token expiry without the user
  seeing a login prompt.
- An actually-ended remembered session (expired/revoked `refreshToken`) surfaces the existing
  "session expired" UX, not a silent failure or an infinite retry loop.
- `tsc -b` + `oxlint` pass in `client/`.
- PR ≤ 500 LOC.
