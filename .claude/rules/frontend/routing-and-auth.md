---
paths:
  - "client/src/AppRoutes.tsx"
  - "client/src/main.tsx"
  - "client/src/RequireAuth.tsx"
  - "client/src/pages/**/*"
---

# Routing and auth gate

- **Routing** (`client/src/AppRoutes.tsx`, `main.tsx`) — `react-router-dom` v7 with
  `TanStack Query` for server state (`QueryClient` set up once in `main.tsx`). Real routes:
  `/interview/new` (`pages/NewSessionPage.tsx`) and `/interview/:sessionId`
  (`pages/InterviewSessionPage.tsx`), both wrapped in `RequireAuth`. `/` redirects to
  `/interview/new`; `/showcase` still serves the old kitchen-sink `App.tsx` as a living style
  guide — it is **not** the app's home route anymore.
- **`client/src/RequireAuth.tsx`** — auth gate using `hooks/useAuth.ts` (`useMe`,
  `useDevLogin`). While `useMe` errors (no session), it currently renders a **temporary**
  dev-login email form instead of a real Google Sign-In button — explicitly marked `TEMPORARY`
  in the code and meant to be swapped once `@react-oauth/google` is wired up (see the
  `/dev-login` gap in `.claude/rules/backend/auth.md`).
- `pages/NewSessionPage.tsx` and `pages/InterviewSessionPage.tsx` are the real screens, composed
  from the interview-flow-specific components (see `.claude/rules/frontend/components.md`).
