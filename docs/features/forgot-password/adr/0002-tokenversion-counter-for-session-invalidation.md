<!-- Format: MADR (Markdown Any Decision Record). -->

---
status: Accepted
owner: "Tanya (architect/eng)"
reviewers: []
updated_at: "2026-09-09"
feature_size: S
stage: "04-05"
ticket: "TBD"
---

# 0002 — Use a tokenVersion counter on User for session invalidation on password change

- **Status:** Accepted
- **Date:** 2026-09-09
- **Deciders:** Tanya (architect/eng)

## Context

PRD AC-06 requires that changing a password ends every other active session for that job-seeker —
this directly closes the top risk identified in idea-brief §10 (a stolen session surviving a
password change, defeating the feature's core security purpose). Sessions today are stateless
JWTs signed with `JWT_SECRET` and verified in `src/middleware/auth.ts` (`requireAuth`) — there is
no server-side session store, so no existing mechanism can revoke one previously issued JWT
without adding new state.

## Decision drivers

- PRD AC-06 (session invalidation on password change) is a hard functional requirement, not
  optional.
- idea-brief §10 names stolen-session persistence as the single most critical risk this feature
  must not reintroduce.
- SAD §2 Constraints: no Redis or other session store exists; adding one is out of proportion for
  an S-size feature.
- Existing `requireAuth` middleware is the single choke point for every protected route — any
  invalidation check must live there to cover all routes uniformly.

## Considered options

1. **`tokenVersion` counter on `User`** — an integer bumped on every password change; each JWT
   embeds the `tokenVersion` value at issuance; `requireAuth` compares it against the current
   value in the database on every request.
2. **Shorter JWT expiry only, no active invalidation** — rely on `JWT_EXPIRES_IN` (currently 7
   days) to naturally end old sessions over time, with no immediate effect on password change.
3. **Server-side revocation list (blocklist)** — store revoked JWT identifiers in a new
   collection, checked on every request, with a cleanup job for expired entries.

## Decision outcome

**Chosen:** Option 1, a `tokenVersion` counter. It satisfies AC-06 immediately (no multi-day
window where a stolen session remains valid, unlike Option 2), and it requires only one new
integer field plus one extra comparison per request — no new collection, no cleanup job, and no
new infrastructure, unlike Option 3's revocation list.

## Consequences

**Positive**
- Directly satisfies AC-06: a password change instantly invalidates every other session, closing
  idea-brief §10's top risk.
- No new infrastructure (no Redis, no revocation-list collection, no cleanup job).
- The check slots into the single existing choke point (`requireAuth`), so every protected route
  is covered uniformly with no per-route wiring.

**Negative**
- Adds one database read to every authenticated request (`requireAuth` now needs the current
  `tokenVersion` from `User`, not just a signature check) — a latency cost the current NFR table
  (PRD §6) cannot yet quantify, since no APM exists.
- All of a job-seeker's sessions are invalidated together — there is no way to end only one
  specific session (e.g. "log out this device only") without a future, separate mechanism.

**Neutral**
- Migrating to a full revocation-list model later, if per-device logout becomes a real
  requirement, is possible without touching this ADR's `tokenVersion` field — the two mechanisms
  can coexist.

## Links

- PRD: [[../PRD.md]] AC-06, §6.1 Security (stolen-session mitigation)
- SAD: [[../sad.md]] §4, §5, §6
- Related ADR: [[0001-store-reset-tokens-in-a-separate-collection]]
