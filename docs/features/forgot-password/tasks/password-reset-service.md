---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T3 — passwordReset.service.ts: issue/verify/consume/rate-limit

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, AC-02, AC-03, §6 NFR (≤15min TTL, ≤3/hour/email, single-use)
- SAD: [../sad.md](../sad.md) §4 strategic choice 1, §5 (`services/passwordReset.service.ts`), §6 US-01/US-02/US-05 sequence diagrams
- Data model: [../data-model.md](../data-model.md) "Single-use enforcement" note, "Access patterns", the flagged rate-limit-for-unregistered-emails gap (comment above Schema-change log)

## Scope

`src/services/passwordReset.service.ts`:

- **Issue:** generate a raw token (`crypto.randomBytes(32).toString('hex')`, per SAD §6 US-01 and openapi.yaml's 64-hex-char field), SHA-256 hash it, store `{ userId, tokenHash, expiresAt: now+15m }`.
- **Verify + consume:** atomic `findOneAndDelete({ tokenHash: sha256(rawToken) })` — document found = valid single use (AC-01); not found = expired/already-used/invalid (AC-03).
- **Rate limit, registered emails:** count recent `PasswordReset` docs for `userId` via the `userId_1` index; reject at `attemptsRemaining <= 0` within the rolling hour (PRD §6 NFR).
- **Rate limit, unregistered emails (AC-02 gap flagged in data-model.md):** AC-02 means no `PasswordReset` document is created for an unknown email, so the `userId_1`-based counter above cannot rate-limit this path. Implement a separate short-lived counter (in-memory or IP-based, per data-model.md's own suggestion) — do not skip this silently just because it wasn't in the schema.

## Deps

T2.

## DoD

- [ ] PR merged.
- [ ] Unit tests (T12) pass.
- [ ] Rate-limiting covers BOTH registered and unregistered-email paths (see the gap above) — reviewer should explicitly check this, not just the happy path.

## Out of scope

- Sending the email itself — this service calls into T5's `sendResetEmail`, doesn't implement it.
- Route/controller wiring — see T6, T7.
