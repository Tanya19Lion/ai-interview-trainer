---
id: T8
title: "client api/auth.ts: rememberMe + refresh"
status: Todo
deps: []
estimate: S
owner: "Tanya19Lion"
---

# T8 — client api/auth.ts: rememberMe + refresh

**Links:** [[../contracts/openapi.yaml]] (`login`, `register`, `googleLogin`, `refreshSession`
operations) · `.claude/rules/frontend/api-and-hooks.md`

## Scope

`client/src/api/auth.ts`:

- Add `rememberMe?: boolean` to `googleLogin`'s param, `register`'s body type, and
  `loginWithPassword`'s body type — matching `openapi.yaml`'s `RememberMe` schema (default
  `false` when omitted).
- Add a new `refreshSession(): Promise<void>` (or equivalent) calling
  `POST /api/auth/refresh`, matching the `refreshSession` operation (no request body, relies on
  the `refreshToken` cookie via `apiFetch`'s existing `credentials: 'include'`).

This task depends only on the already-frozen `openapi.yaml` contract — build and smoke-test
against the Prism mock (`npm run mock:api -- docs/features/remember-me/contracts/openapi.yaml`),
no need to wait for T1-T7 to land first.

## Out of scope

- `useAuth.ts` hook wiring (T9) — this task is the thin `api/` layer only.
- `LoginPage.tsx` UI (T10).

## DoD

- `AuthUser`/request types updated, `tsc -b` passes in `client/`.
- Manual smoke test against the Prism mock: `refreshSession()` resolves on the mock's 200
  example, rejects (throws `ApiError`) on its 401 examples.
- PR ≤ 500 LOC.
