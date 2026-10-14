---
type: tracker
feature: remember-me
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-10-14"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# Tracker — remember-me

<!-- Stage 08 → see skills/divide-tasks/SKILL.md. Update Status as tasks progress. -->

| ID | Title | Status | Owner | Estimate | Blocked by |
|----|-------|--------|-------|----------|------------|
| T1 | requireAuth: tokenVersion check | Merged | Tanya19Lion | S | — |
| T2 | issueSession: access+refresh tokens, rememberMe param | Merged | Tanya19Lion | M | — |
| T3 | POST /api/auth/refresh handler | Merged | Tanya19Lion | M | T1, T2 |
| T4 | logout bumps tokenVersion | Merged | Tanya19Lion | S | T2 |
| T5 | Login rate-limit middleware (LoginAttempt) | Merged | Tanya19Lion | M | — |
| T6 | Integration test: session revocation (QG-1) | Merged | Tanya19Lion | M | T1, T2, T4 |
| T7 | k6 latency smoke test (QG-2) | Not started | Tanya19Lion | S | T2, T3 |
| T8 | client api/auth.ts: rememberMe + refresh | Merged | Tanya19Lion | S | — |
| T9 | useAuth.ts silent access-token renewal | Merged | Tanya19Lion | M | T8 |
| T10 | LoginPage: "remember me" checkbox | In review | Tanya19Lion | S | T8 |
| T11 | Manual QA: live-Mongo verification + PROGRESS.md update | Not started | Tanya19Lion | S | T1, T3, T4, T5, T6, T7, T9, T10, T12, T13 |
| T12 | Unit tests: tokenVersion check, session issuance, refresh expiry (QG-3), rate limit | Verified | Tanya19Lion | S | T1, T2, T3, T5 |
| T13 | E2E: remember-me persistence (AC-01, AC-02) | In review | Tanya19Lion | S | T9, T10 |

## Notes (2026-10-14 team run, `feat/remember-me-finish`)

- T1–T6, T8, T9 confirmed already implemented and merged into `main` (verified in code, not just
  re-trusted from this tracker, which had gone stale since 2026-09-16).
- T10, T13 implemented and committed on `feat/remember-me-finish` (not yet merged — a draft PR is
  open; flip to `Merged` once the PR lands on `main`).
- T12: audited existing coverage against all 4 required scenario groups (`src/middleware/
  auth.test.ts`, `src/controllers/auth.controller.test.ts`, `src/services/
  loginAttempt.service.test.ts`, `src/middleware/rateLimit.test.ts`) — already fully covered by
  code already on `main`, including QG-3's "no client-supplied time value" assertion. No new
  commit needed, so there's nothing for this PR to carry for T12.
- **Known gap, not yet a task**: `useGoogleLogin` (`client/src/hooks/useAuth.ts`) doesn't accept
  or forward `rememberMe` to `POST /api/auth/google`, even though `client/src/api/auth.ts`'s
  `googleLogin()` already supports it. A user who checks "remember me" and signs in with Google
  silently does not get persistent login. Needs a product decision (thread it through, or document
  that Google sign-in intentionally has fixed session behavior) before it's worth a new task ID.

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).
