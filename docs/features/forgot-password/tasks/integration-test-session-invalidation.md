---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T13 — Integration test: session invalidation (QG-2, AC-06)

## Links

- PRD: [../PRD.md](../PRD.md) AC-06
- SAD: [../sad.md](../sad.md) §10 QG-2 ("issue N (≥2) sessions for one account, change the password via one of them, and assert that all remaining sessions' JWTs are rejected")

## Scope

Integration test, exactly per SAD §10 QG-2's stated verification method:

1. Issue ≥2 sessions (JWTs) for one test account.
2. Change the password via one session — through either T7 (reset-confirm) or T8 (change-password); cover both entry points if feasible within one test file.
3. Assert every *other* session's JWT is rejected by `requireAuth` on its next request — not just one, matching AC-06's "every other active session."

## Deps

T4, T7, T8.

## DoD

- [ ] PR merged.
- [ ] Test asserts ALL other sessions (not just one) are invalidated after either reset-confirm or change-password.
- [ ] Test green.
