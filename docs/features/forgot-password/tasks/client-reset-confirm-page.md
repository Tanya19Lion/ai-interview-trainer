---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T10 — Client: reset-confirm page

## Links

- PRD: [../PRD.md](../PRD.md) US-02, AC-01, AC-03, US-05
- SAD: [../sad.md](../sad.md) §6 "US-05: Reset link expires or becomes invalid" sequence diagram
- API contract: [../contracts/openapi.yaml](../contracts/openapi.yaml) `/api/auth/password-reset/confirm`

## Scope

A page reachable from the emailed reset link (token in URL), with a new-password form submitting to T7's endpoint:

- Success → confirms the password changed, prompts login (matches `sad.md` §6 flow's closing step).
- 400 `password_reset.invalid_or_expired_token` (AC-03) → "This reset link is invalid or has expired. Request a new one." (exact message intent from SAD §6 US-05), with a way back to T9's request form — not a dead end.

## Deps

T7.

## DoD

- [ ] PR merged.
- [ ] Manual check: an expired or already-used link shows the AC-03 message, not a generic error or silent failure.
- [ ] Manual check: successful reset clearly directs the job-seeker to log in.
