---
status: Living
updated_at: "2026-09-10"
---

# Domain Context

<!-- Feature-internal terminology for remember-me, not project-wide domain vocabulary — see
     root docs/CONTEXT.md for the shared glossary. -->

## Glossary

| Term | Meaning |
|---|---|
| Remembered session | The fixed ~7-day session a job-seeker gets after checking "remember me" at login (idea-brief.md §7 Approach C), with no extension on subsequent visits. NOT the regular (browser-only) session — the one that ends when the browser closes, which stays the default when "remember me" is unchecked. |
| Access token | The short-lived JWT issued on every login, verified on every protected request via `requireAuth`; its lifetime is minutes, not days (sad.md ADR-0002). NOT the refresh token. |
| Refresh token | The longer-lived (fixed 7-day, non-rolling) token issued only when "remember me" is checked; exchanged for a new access token without re-prompting for credentials (sad.md ADR-0002, Critical flow 2). NOT the access token. |
| `tokenVersion` | An integer counter on `User`, bumped on logout (sad.md ADR-0001) or password reset (`forgot-password` ADR 0002); embedded in both access and refresh tokens at issuance and compared against the current `User.tokenVersion` in `requireAuth` — a mismatch means the token was issued before a revocation event and is rejected. |
