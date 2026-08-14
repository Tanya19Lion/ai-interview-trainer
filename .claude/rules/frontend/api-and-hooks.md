---
paths:
  - "client/src/api/**/*"
  - "client/src/hooks/**/*"
  - "client/src/types/**/*"
---

# API layer and hooks

- **`client/src/api/`** — thin fetch layer: `client.ts` (`apiFetch`, `credentials: 'include'` so
  the auth cookie is sent, throws `ApiError` on non-2xx), `auth.ts`, `interview.ts`. All request/
  response shapes are typed in `client/src/types/interview.ts`, which mirrors (but does not
  import) the server's Mongoose schema shapes — update both sides together (see
  `.claude/rules/backend/data-model.md`).
- `apiFetch` special-cases `204 No Content` (returns `undefined` instead of calling `res.json()`)
  — `Response.ok` is `true` for 204, and parsing an empty body as JSON throws, so any endpoint
  that can reply 204 (e.g. `GET /interview/active` when there's no active session, see
  `.claude/rules/backend/interview-flow.md`) must type its client-side return as `T | undefined`
  and narrow it explicitly (see `getActiveSession` in `interview.ts`).
- **`client/src/hooks/`** — TanStack Query wrappers per concern (`useAuth.ts`,
  `useStartSession.ts`, `useSubmitAnswer.ts`); prefer adding a hook here over calling `api/`
  functions directly from components.
