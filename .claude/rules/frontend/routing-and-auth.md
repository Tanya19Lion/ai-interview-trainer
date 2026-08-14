---
paths:
  - "client/src/AppRoutes.tsx"
  - "client/src/main.tsx"
  - "client/src/RequireAuth.tsx"
  - "client/src/ProtectedLayout.tsx"
  - "client/src/pages/**/*"
---

# Routing and auth gate

- **Routing** (`client/src/AppRoutes.tsx`, `main.tsx`) — `react-router-dom` v7 with
  `TanStack Query` for server state (`QueryClient` set up once in `main.tsx`, alongside
  `GoogleOAuthProvider` from `@react-oauth/google`). Public routes: `/login`
  (`pages/LoginPage.tsx`), `/showcase` (old kitchen-sink `App.tsx`, a living style guide — not
  the app's home route). Protected routes (`/interview/new`, `/interview/:sessionId`) are nested
  under a single layout route whose `element` is `ProtectedLayout` — add new authenticated pages
  as children of that same layout route rather than wrapping each one in `RequireAuth`
  individually. `/` currently redirects to `/interview/new` (placeholder until a real Home page
  lands — see `PROGRESS.md` at repo root, task 6).
- **`client/src/ProtectedLayout.tsx`** — composes `RequireAuth` + `AppShell` +
  `InterviewFocusContext.Provider` for every protected route. Owns the `focus` state
  (`lib/interviewFocus.ts`) that lets a nested page (currently `InterviewSessionPage`) tell the
  shared `AppShell` to swap its normal nav for a sticky interview focus-bar — the state has to
  live in this common ancestor because context can only flow down, not up from the routed page
  to the layout that renders it.
- **`client/src/RequireAuth.tsx`** — a pure auth gate now: while `useMe()` is loading it shows a
  `Spinner`; on error (no session) it `<Navigate to="/login" state={{from: location}}>` so
  `LoginPage` can send the user back where they were headed after a successful login. No inline
  form lives here anymore — see `pages/LoginPage.tsx` and `.claude/rules/backend/auth.md` for the
  real Google/email-password flows.
- **`client/src/components/AppShell/AppShell.tsx`** — the persistent app chrome for protected
  routes: top nav (Home/New session/History/Progress tabs, avatar menu with logout) or, when
  `focus` is set, a sticky focus-bar (branch, `ProgressSegments`, exit button) instead.
- `pages/NewSessionPage.tsx` and `pages/InterviewSessionPage.tsx` are the real screens, composed
  from the interview-flow-specific components (see `.claude/rules/frontend/components.md`).
  `pages/LoginPage.tsx` is the real auth screen (Google button + email/password tabs).