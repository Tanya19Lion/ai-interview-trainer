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
- **`client/src/hooks/`** — TanStack Query wrappers per concern (`useAuth.ts`,
  `useStartSession.ts`, `useSubmitAnswer.ts`); prefer adding a hook here over calling `api/`
  functions directly from components.
