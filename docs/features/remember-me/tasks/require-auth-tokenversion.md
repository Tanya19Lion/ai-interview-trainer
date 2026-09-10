---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T1 — requireAuth: tokenVersion check

## Links

- PRD: [../PRD.md](../PRD.md) AC-04, AC-07
- ADR-0001: [../adr/0001-extend-tokenversion-counter-to-cover-logout.md](../adr/0001-extend-tokenversion-counter-to-cover-logout.md)
- SAD: [../sad.md](../sad.md) §6 US-02/US-03/US-06 sequences, §8 Crosscutting (Authentication row)
- Rule: `.claude/rules/backend/auth.md` — existing `issueSession`/`requireAuth` pattern this must extend, not replace

## Scope

`src/middleware/auth.ts` — `requireAuth` currently only checks JWT signature/expiry (no DB
lookup). Extend it to also compare the token's embedded `tokenVersion` against
`UserModel.findById(payload.userId).tokenVersion` and reject on mismatch (ADR-0001).

Extract the comparison as a small reusable function in this file, not inlined — T3
(`refreshSession`) needs the same check and should import it rather than duplicate it.
`User.tokenVersion` may be `undefined` for pre-existing users until the Phase 2 backfill (see
[../data-model.md](../data-model.md) Schema-change log) runs — treat `undefined` the same as `0`,
don't throw.

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] `requireAuth` rejects a request whose token's `tokenVersion` doesn't match the current
      `User.tokenVersion` with 401 + the `{code, message}` shape agreed for new/changed auth
      surface (see [../contracts/api-sync-report.md](../contracts/api-sync-report.md) Deviations).
- [ ] Existing `/me` behavior unaffected for a token issued after the current `tokenVersion`.
- [ ] Unit tests ([unit-tests-token-and-rate-limit.md](./unit-tests-token-and-rate-limit.md)) pass.

## Out of scope

- Embedding `tokenVersion` into issued tokens (T2) — this task only checks it.
- Bumping `tokenVersion` on logout (T4) or password reset (`forgot-password` feature).
