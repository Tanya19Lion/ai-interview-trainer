---
paths:
  - "src/routes/auth.routes.ts"
  - "src/controllers/auth.controller.ts"
  - "src/middleware/auth.ts"
---

# Auth

- Three real, wired login paths, all funnelling through the same `issueSession(res, user)`
  helper in `auth.controller.ts` (signs the JWT, sets the httpOnly `token` cookie, returns
  `{user}`) — added there specifically so the cookie/JWT logic exists in exactly one place:
  - `POST /api/auth/google` — verifies a Google `idToken` via `google-auth-library`. Looks up by
    `googleId` first, then falls back to matching by `email` (so a Google sign-in links onto an
    existing email/password account instead of colliding with the unique-email index).
  - `POST /api/auth/register` — `{email, password, name}`, hashes the password with `bcryptjs`
    (`passwordHash` on `User`), rejects duplicate emails (409) and passwords under 8 chars (400).
  - `POST /api/auth/login` — `{email, password}`, compares against `passwordHash`.
  - `GET /api/auth/me` and `POST /api/auth/logout` are also wired. `middleware/auth.ts`
    (`requireAuth`) reads the `token` cookie and attaches `req.userId` for protected routes.
- `User.googleId` is optional + `sparse`-indexed (not every user signs in with Google) and
  `passwordHash` is optional (not every user sets a password) — a user document may have either,
  both, or (Google-only) neither.
- The old `POST /api/auth/dev-login` client-side stub is gone — `client/src/api/auth.ts` calls
  the three real endpoints above. Don't reintroduce a dev-login bypass.
