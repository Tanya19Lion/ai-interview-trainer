---
paths:
  - "src/routes/auth.routes.ts"
  - "src/controllers/auth.controller.ts"
  - "src/middleware/auth.ts"
---

# Auth

- Real Google Sign-In: `POST /api/auth/google` verifies a Google `idToken` server-side via
  `google-auth-library`, upserts a `User`, and sets an httpOnly `token` cookie (JWT signed with
  `JWT_SECRET`). `GET /api/auth/me` and `POST /api/auth/logout` are also wired.
  `middleware/auth.ts` (`requireAuth`) reads that cookie and attaches `req.userId` for protected
  routes.
- **Known gap**: `client/src/api/auth.ts` calls `POST /api/auth/dev-login` as a temporary
  bypass for local development (see `.claude/rules/frontend/routing-and-auth.md`), but no
  `/dev-login` route or controller exists in `src/` yet — that auth path is currently broken
  end-to-end. Either add a matching dev-login endpoint or finish wiring the real
  `@react-oauth/google` flow on the client; don't assume the dev-login call works today.
