---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T16 — E2E: happy-path reset flow (AC-01)

## Links

- PRD: [../PRD.md](../PRD.md) AC-01
- SAD: [../sad.md](../sad.md) §6 "Critical flow 1: Forgot/reset happy path"

## Scope

End-to-end test covering the full flow SAD §6's Critical flow 1 diagrams: request a reset with a known email → (capture the token from wherever T5's dev-stub or real provider makes it observable in test) → follow the link → submit a new password → log in with the new password successfully.

## Deps

T9, T10.

## DoD

- [ ] E2E test green, exercises the full request → confirm → login chain, not just individual endpoints in isolation.
- [ ] Test does not depend on a real third-party email provider being reachable in CI — uses whatever observable mechanism T0/T5 set up for test environments.
