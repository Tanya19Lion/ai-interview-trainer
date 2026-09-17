---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-17"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T17 — Rate-limit POST /api/auth/password-reset/confirm

## Links

- Follow-up from code-review on T7 (`route-confirm-reset.md`): `/api/auth/password-reset/confirm`
  is unauthenticated and, unlike `/api/auth/login` (`loginRateLimit`), has no rate-limiting
  middleware — every request costs a sha256 hash plus a MongoDB `findOneAndDelete`
  (`src/services/passwordReset.service.ts`) before any input validation runs.

## Scope

`src/routes/auth.routes.ts`: add a rate-limit middleware (reuse or generalize the existing
`src/middleware/rateLimit.ts` pattern used by `loginRateLimit`) in front of
`confirmPasswordReset`.

Note: the reset token itself is a 64-hex-char (256-bit) random value, so this is a
resource-exhaustion/DoS concern, not a brute-force/auth-bypass risk the way `/login`'s
rate limit is — scope the limit accordingly (e.g. per-IP, generous enough not to block a
legitimate user retrying a mistyped password).

## Deps

T7 (merged).

## DoD

- [ ] PR merged.
- [ ] Repeated requests from the same source past the threshold get `429`, not the endpoint's
      normal 200/400 responses.
- [ ] A legitimate user re-submitting after a typo (e.g. password too short) is not blocked
      under normal use.
