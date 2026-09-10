---
id: T1
title: "tokenVersion check in requireAuth"
status: Todo
deps: []
estimate: S
owner: "Tanya19Lion"
---

# T1 — tokenVersion check in requireAuth

**Links:** [[../adr/0001-extend-tokenversion-counter-to-cover-logout.md]] ·
[[../sad.md]] §6 US-02, US-03, US-06 sequences · [[../PRD.md]] AC-04, AC-07

## Scope

`src/middleware/auth.ts` — `requireAuth` currently only checks JWT signature/expiry. Extend it to
also compare the token's embedded `tokenVersion` against `UserModel.findById(payload.userId)
.tokenVersion` and reject (401) on mismatch, per ADR-0001.

Extract the comparison as a small reusable function in this file (not inlined) — T3
(`refreshSession`) needs the same check and should import it rather than duplicate it.

`requireAuth` currently has no DB lookup at all (signature/expiry check only) — this task adds
the first one. Note the added latency against PRD §6's session-check (`/me`) p95 ≤ 150 ms target;
T7 (k6 smoke) covers this NFR at the endpoint level, not this task.

## Out of scope

- Issuing tokens with `tokenVersion` embedded (T2) — this task only *checks* it, assumes it's
  already been embedded elsewhere. `User.tokenVersion` may be `undefined` for pre-existing users
  until the Phase 2 backfill (see [[../data-model.md]] Schema-change log) runs — treat `undefined`
  the same as `0` when comparing, don't throw.
- Bumping `tokenVersion` on logout (T4) or password reset (`forgot-password` feature, separate).

## DoD

- `requireAuth` rejects a request whose token's `tokenVersion` doesn't match the current
  `User.tokenVersion` with `401` + the `{code, message}` shape agreed for new/changed auth
  surface (see [[../contracts/api-sync-report.md]] Deviations).
- Existing `/me` behavior unaffected for a token issued after the current `tokenVersion`.
- Unit test: token with stale `tokenVersion` → 401. Token with matching `tokenVersion` → passes
  through to `next()`.
- PR ≤ 500 LOC (expected: well under, single middleware file + test).
