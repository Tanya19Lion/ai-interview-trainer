---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# Tracker — forgot-password

<!-- Stage 08 → see skills/divide-tasks/SKILL.md. Update Status as tasks progress. -->

| ID | Title | Status | Owner | Estimate | Blocked by |
|----|-------|--------|-------|----------|------------|
| T0 | Spike: decide email-delivery provider | Not started | Tanya19Lion | S | — |
| T1 | Add User.tokenVersion field | Not started | Tanya19Lion | XS | — |
| T2 | Create PasswordReset collection | Not started | Tanya19Lion | S | — |
| T3 | passwordReset.service.ts: issue/verify/consume/rate-limit | Not started | Tanya19Lion | S | T2 |
| T4 | requireAuth: tokenVersion check | Not started | Tanya19Lion | S | T1 |
| T5 | sendResetEmail implementation | Not started | Tanya19Lion | S | T0 |
| T6 | POST /api/auth/password-reset/request | Not started | Tanya19Lion | S | T3, T5 |
| T7 | POST /api/auth/password-reset/confirm | Not started | Tanya19Lion | S | T3, T4 |
| T8 | POST /api/auth/change-password | Not started | Tanya19Lion | S | T4 |
| T9 | Client: forgot-password request form | Not started | Tanya19Lion | S | T6 |
| T10 | Client: reset-confirm page | Not started | Tanya19Lion | S | T7 |
| T11 | Client: change-password form (profile) | Not started | Tanya19Lion | S | T8 |
| T12 | Unit tests: token issue/consume/rate-limit (QG-1) | Not started | Tanya19Lion | S | T3 |
| T13 | Integration test: session invalidation (QG-2, AC-06) | Not started | Tanya19Lion | S | T4, T7, T8 |
| T14 | Integration test: Google-account edge case (QG-3, AC-05) | Not started | Tanya19Lion | S | T6, T8 |
| T15 | Integration test: wrong current password (QG-4, AC-04) | Not started | Tanya19Lion | XS | T8 |
| T16 | E2E: happy-path reset flow (AC-01) | Not started | Tanya19Lion | S | T9, T10 |

## Status legend

`Not started` → `In progress` → `In review` → `Merged` → `Verified` (or `Blocked` with a note).
