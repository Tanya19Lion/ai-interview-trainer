---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "08"
ticket: "<TBD>"
---

# Tracker — remember-me

<!-- Stage 08 → see skills/divide-tasks/SKILL.md. Update Status as tasks progress. -->

| ID | Title | Status | Owner | Estimate | Blocked by |
|----|-------|--------|-------|----------|------------|
| T1 | requireAuth: tokenVersion check | Not started | Tanya19Lion | S | — |
| T2 | issueSession: access+refresh tokens, rememberMe param | Not started | Tanya19Lion | M | — |
| T3 | POST /api/auth/refresh handler | Not started | Tanya19Lion | M | T1, T2 |
| T4 | logout bumps tokenVersion | Not started | Tanya19Lion | S | T2 |
| T5 | Login rate-limit middleware (LoginAttempt) | Not started | Tanya19Lion | M | — |
| T6 | Integration test: session revocation (QG-1) | Not started | Tanya19Lion | M | T1, T2, T4 |
| T7 | k6 latency smoke test (QG-2) | Not started | Tanya19Lion | S | T2, T3 |
| T8 | client api/auth.ts: rememberMe + refresh | Not started | Tanya19Lion | S | — |
| T9 | useAuth.ts silent access-token renewal | Not started | Tanya19Lion | M | T8 |
| T10 | LoginPage: "remember me" checkbox | Not started | Tanya19Lion | S | T8 |
| T11 | Manual QA: live-Mongo verification + PROGRESS.md update | Not started | Tanya19Lion | S | T1, T3, T4, T5, T6, T7, T9, T10, T12, T13 |
| T12 | Unit tests: tokenVersion check, session issuance, refresh expiry (QG-3), rate limit | Not started | Tanya19Lion | S | T1, T2, T3, T5 |
| T13 | E2E: remember-me persistence (AC-01, AC-02) | Not started | Tanya19Lion | S | T9, T10 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).
