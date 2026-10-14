---
status: Verified
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-10-14"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T12 — Unit tests: tokenVersion check, session issuance, refresh expiry (QG-3), rate limit

## Links

- SAD: [../sad.md](../sad.md) §10 QG-3 ("How verify: unit test asserting the expiry comparison
  uses server clock + token timestamp only — no client-supplied time value accepted anywhere in
  the refresh/verify path")
- PRD: [../PRD.md](../PRD.md) AC-01, AC-02, AC-05, AC-06, §6 NFR (rate limit)

## Scope

Unit tests in isolation (no HTTP layer), one file per module or grouped as this repo's existing
`src/services/ai.service.test.ts` convention prefers:

- **requireAuth tokenVersion comparison (T1):** stale `tokenVersion` → rejected; matching
  `tokenVersion` → passes; `User.tokenVersion === undefined` treated the same as `0`.
- **issueSession branches (T2):** `rememberMe: true` → both tokens signed, both embed the current
  `tokenVersion`; `rememberMe: false`/omitted → only the access token signed, no `Max-Age` on its
  cookie.
- **Refresh expiry, QG-3 (T3):** the expiry check reads only the server clock and the refresh
  token's own embedded timestamp — assert no code path in the verify function accepts or trusts
  any client-supplied time value (e.g. a header, a body field). This is the one PRD/SAD explicitly
  names as a **unit test**, not integration — don't fold it into T6's integration suite.
- **Rate-limit counter (T5):** first attempt for an email creates `count: 1`; repeated attempts
  within the window increment; the 6th crosses the threshold — tested against the counter logic
  directly, not through the full `/login` HTTP route (that HTTP-level check is T5's own DoD).

## Deps

T1, T2, T3, T5.

## DoD

- [x] No PR needed — audited 2026-10-14 and all four scenario groups were already covered by
      code already merged to `main` (`src/middleware/auth.test.ts`,
      `src/controllers/auth.controller.test.ts`, `src/services/loginAttempt.service.test.ts`,
      `src/middleware/rateLimit.test.ts`), including QG-3's assertion that `jwt.verify` is never
      called with a client-suppliable clock option.
- [x] All four scenario groups above have a passing test.
- [x] `npm run test` (Vitest) green — 194/194.
