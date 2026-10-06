---
type: tracker
feature: forgot-password
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-17"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# Tracker — forgot-password

<!-- Stage 08 → see skills/divide-tasks/SKILL.md. Update Status as tasks progress. -->

| ID | Title | Status | Owner | Estimate | Blocked by |
|----|-------|--------|-------|----------|------------|
| T0 | Spike: decide email-delivery provider | Merged | Tanya19Lion | S | — |
| T1 | Add User.tokenVersion field | Merged | Tanya19Lion | XS | — |
| T2 | Create PasswordReset collection | Merged | Tanya19Lion | S | — |
| T3 | passwordReset.service.ts: issue/verify/consume/rate-limit | Merged | Tanya19Lion | S | T2 |
| T4 | requireAuth: tokenVersion check | Merged | Tanya19Lion | S | T1 |
| T5 | sendResetEmail implementation | Verified | Tanya19Lion | S | T0 (done); live send needs Resend domain verified |
| T6 | POST /api/auth/password-reset/request | Verified | Tanya19Lion | S | T3, T5 |
| T7 | POST /api/auth/password-reset/confirm | Merged | Tanya19Lion | S | T3, T4 |
| T8 | POST /api/auth/change-password | Merged | Tanya19Lion | S | T4 |
| T9 | Client: forgot-password request form | Verified | Tanya19Lion | S | T6 |
| T10 | Client: reset-confirm page | Verified | Tanya19Lion | S | T7 |
| T11 | Client: change-password form (profile) | Dropped | Tanya19Lion | S | T8 |
| T12 | Unit tests: token issue/consume/rate-limit (QG-1) | In review | Tanya19Lion | S | T3 |
| T13 | Integration test: session invalidation (QG-2, AC-06) | In review | Tanya19Lion | S | T4, T7, T8 |
| T14 | Integration test: Google-account edge case (QG-3, AC-05) | In review | Tanya19Lion | S | T6, T8 |
| T15 | Integration test: wrong current password (QG-4, AC-04) | In review | Tanya19Lion | XS | T8 |
| T16 | E2E: happy-path reset flow (AC-01) | Dropped | Tanya19Lion | S | T9, T10 |
| T17 | Rate-limit POST /api/auth/password-reset/confirm | In review | Tanya19Lion | XS | T7 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` / `Dropped` with a note).

**T11 dropped (2026-10-06):** the owner decided the reset flow (request link → set a new password) is enough for v1, so no change-password screen in the profile. The backend `POST /api/auth/change-password` (T8) stays; T13/T14/T15 test it through the API and do not depend on T11. Reopen T11 if a profile screen is wanted later.

**T16 dropped (2026-10-06):** the owner decided an automated e2e test is not needed; the full path (request → email → new password → reuse of the link) was walked by hand on `ai-interview-trainer.com`, and the pieces are covered by integration tests (T13–T15, T17).

**T12 note:** the "unregistered-email counter" scenario is covered by `reserveResetRequest` tests, which replaced the in-memory `Map` in T6.
