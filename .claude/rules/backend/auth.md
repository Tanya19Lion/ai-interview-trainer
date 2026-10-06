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
- **Input types**: `register`/`login`/`googleLogin` reject non-string `email`/`password`/`name`/
  `idToken` with a 400 before any Mongoose filter — a JSON object such as `{"$ne": ""}` would
  otherwise be read as a query operator. Keep a `typeof … === 'string'` guard on any new body field
  that reaches a query, and in `loginRateLimit` (which runs before the controller).
- **Rate limits**: `POST /login` takes an attempt from two counters (`loginRateLimit` →
  `reserveLoginAttempt(email, ip)`): 5 per 15 min per email+IP (`IpAttempt`, key
  `login:<email>|<ip>`, so someone else's failed logins don't lock the owner out) and a ceiling of
  30 per email (`LoginAttempt`); a successful login gives both attempts back (ADR-0004); `POST /register`, `POST /google` and `POST /password-reset/request` are limited per IP
  (`ipRateLimit`, 10 per 15 min each, `IpAttempt` collection); the reset request also has a
  per-email counter (3 per hour, `ResetRequestAttempt`) that runs before the user lookup. Behind a reverse proxy `req.ip` is
  the proxy's address until Express's `trust proxy` is set, which would put every user in one bucket.
- `changePassword` bumps `tokenVersion` (revoking every session) and then re-signs this request's
  cookies via `setSessionCookies`, so the user stays signed in; a `refreshToken` cookie on the
  request means the session was remembered, so the new cookies are persistent.
- `User.googleId` is optional + `sparse`-indexed (not every user signs in with Google) and
  `passwordHash` is optional (not every user sets a password) — a user document may have either,
  both, or (Google-only) neither.
- The old `POST /api/auth/dev-login` client-side stub is gone — `client/src/api/auth.ts` calls
  the three real endpoints above. Don't reintroduce a dev-login bypass.
