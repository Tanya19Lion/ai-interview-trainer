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
  `GoogleOAuthProvider` from `@react-oauth/google` and, now, `I18nextProvider` — see
  `.claude/rules/frontend/overview.md` for the i18n setup). Public routes: `/welcome`
  (`pages/LandingPage.tsx`, the marketing page — no `RequireAuth`, has its own nav/footer/CTA
  links to `/login`), `/login` (`pages/LoginPage.tsx`), `/showcase` (old kitchen-sink `App.tsx`, a
  living style guide — not the app's home route). Protected routes (`/`, `/interview/new`,
  `/interview/:sessionId`, `/history`, `/progress`) are nested under a single layout route whose
  `element` is `ProtectedLayout` — add new authenticated pages as children of that same layout
  route rather than wrapping each one in `RequireAuth` individually. `/` renders
  `pages/HomePage.tsx` (profile card, stats badges, resume-session card, recent sessions, links to
  History/Progress) — note `/` (the authenticated Kabinet) and `/welcome` (the public marketing
  page) are two different screens; don't confuse them.
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
  `pages/HomePage.tsx`, `pages/HistoryPage.tsx`, and `pages/ProgressPage.tsx` are the real
  Kabinet/history/stats screens — see `.claude/rules/frontend/api-and-hooks.md` for the hooks
  they read from and `.claude/rules/frontend/components.md` for `HistoryTable`/`ReviewModal`/
  `Heatmap`.
- `pages/InterviewSessionPage.tsx` normally boots from `location.state` (set by
  `NewSessionPage`/`HomePage`'s resume CTA), but that's lost on a hard reload or direct link — it
  has a reload fallback that re-derives everything from the server via `hooks/useSessionDetail.ts`
  (`GET /api/history/:id`) once `location.state` is null: a `completed` session renders
  `SessionSummary` straight from the persisted `questions[]`, an `in_progress` one additionally
  fetches `hooks/useActiveSession.ts` (`GET /api/interview/active`, now gated by an `enabled` arg
  so it's only called during this fallback, not on every normal page load — that endpoint
  re-generates a question via the AI service, so firing it unconditionally would be wasteful) to
  get the live question text back, and only falls through to "сесія недоступна" if neither
  resolves anything usable (e.g. the id doesn't belong to the current user).
- `pages/LandingPage.tsx` (`/welcome`) is the bilingual public marketing screen — see
  `.claude/rules/frontend/components.md` for `Reveal`/`LangOverlay`, the two components built
  specifically for it.