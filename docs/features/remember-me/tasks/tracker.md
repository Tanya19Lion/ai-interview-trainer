# Task tracker — remember-me

<!-- Status values: Todo / In progress / Blocked / In review / Done -->

| ID | Title | Status | Deps | Estimate | Owner | PR |
|----|-------|--------|------|----------|-------|-----|
| T1 | tokenVersion check in requireAuth | Todo | — | S | Tanya19Lion | — |
| T2 | issueSession: access+refresh tokens, rememberMe param | Todo | — | M | Tanya19Lion | — |
| T3 | POST /api/auth/refresh handler | Todo | T1, T2 | M | Tanya19Lion | — |
| T4 | logout bumps tokenVersion | Todo | T2 | S | Tanya19Lion | — |
| T5 | Login rate-limit middleware (LoginAttempt) | Todo | — | M | Tanya19Lion | — |
| T6 | Backend revocation tests (QG-1) | Todo | T1, T2, T4 | M | Tanya19Lion | — |
| T7 | k6 latency smoke test (QG-2) | Todo | T2, T3 | S | Tanya19Lion | — |
| T8 | client api/auth.ts: rememberMe + refresh | Todo | — | S | Tanya19Lion | — |
| T9 | useAuth.ts silent access-token renewal | Todo | T8 | M | Tanya19Lion | — |
| T10 | LoginPage: "remember me" checkbox | Todo | T8 | S | Tanya19Lion | — |
| T11 | PROGRESS.md update + manual verification against live Mongo | Todo | T1, T3, T4, T5, T6, T7, T9, T10 | S | Tanya19Lion | — |

**Total estimate:** 3×S(login-side) + ... see per-task Estimate column — S=≤1d, M=1-2d (borderline,
already split as far as practical here). Roughly 8-10 working days for a single backend-leaning
engineer (matches SAD §2 Organisational: "the M-size surface ... is larger than a single
engineer's typical S-size scope").

**Parallel branches:** T1/T2/T5/T8 can all start immediately (no unmet deps). T8-T10 (client) can
proceed against the `openapi.yaml` Prism mock without waiting on T1-T7 (backend).
