<!-- Format: MADR (Markdown Any Decision Record). -->

---
status: Accepted
owner: "Tanya (architect/eng)"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "04-05"
ticket: "TBD"
---

# 0003 — Use a Mongo-backed counter with TTL index for login rate limiting

- **Status:** Accepted
- **Date:** 2026-09-10
- **Deciders:** Tanya (architect/eng)

## Context

PRD §6 requires a login-attempt rate limit of ≤ 5 attempts / 15 min per email, closing a gap
confirmed by repo scan — no rate-limiting package or mechanism exists anywhere in `src/` today.
This decision fixes where the attempt counters live and how they expire.

## Decision drivers

- PRD §6 NFR row: "Login attempt rate limit — ≤ 5 attempts / 15 min per email."
- PRD §6.1 abuse case: "Spam/credential-stuffing on login" — mitigated by this limit.
- SAD §2 Constraints: no Redis in the stack; app currently runs as 1 instance (PRD §6 Throughput
  "≥ 30 req/s on 1 instance").

## Considered options

1. **In-memory counter (`express-rate-limit` MemoryStore)** — counters live in the Node process's
   memory, reset on restart, no cross-instance coordination.
2. **Mongo-backed counter with a TTL index** — a new `LoginAttempt` collection
   (`email`, `windowStart`, `count`), with a MongoDB TTL index auto-expiring documents after the
   15-minute window, checked/incremented on every login attempt.

## Decision outcome

**Chosen:** Option 2, a Mongo-backed counter. It survives process restarts (an in-memory counter
resets on every deploy, silently re-opening the brute-force window PRD §6.1 asks to close) and
needs no rework if the app is later deployed across multiple instances — the app already depends
on MongoDB for everything else, so this adds no new infrastructure, only one new collection.

## Consequences

**Positive**
- Rate-limit state survives process restarts/redeploys — Option 1 would silently reset the
  attacker's counter on every deploy.
- No new infrastructure dependency (reuses the existing MongoDB connection) — unlike introducing
  Redis, which nothing else in the stack currently needs.
- Correct out of the box if the app is later scaled to multiple instances — no follow-up ADR
  needed purely to fix cross-instance rate-limit drift.

**Negative**
- Every login attempt now does an extra MongoDB round-trip (read + upsert on `LoginAttempt`)
  before/around the existing `UserModel.findOne` lookup — a small latency cost against PRD §6's
  login p95 ≤ 300 ms target that Option 1 would not have.
- One new collection + TTL index to create and maintain, versus zero new schema surface for
  Option 1.

**Neutral**
- The TTL index means expired `LoginAttempt` documents are cleaned up automatically by MongoDB's
  background TTL monitor (typically within 60s of expiry) — no manual cleanup job needed, but also
  not instantaneous at the exact 15-minute mark.

## Amendment — 2026-09-29

The counter as first implemented had two defects (security review, Vuln 1): every attempt counted,
including successful logins, and the window was only ever reset by the TTL sweep. Both are fixed
without changing the decision above (still a Mongo-backed counter with a TTL index):

- Only **failed** logins end up counted. The middleware takes one attempt with a single atomic
  upsert-increment *before* the password check (`reserveLoginAttempt`) and answers 429 once the
  window's five are used; a successful login gives it back (`releaseLoginAttempt`). The increment
  has to come before the check: counting a failure only after `bcrypt.compare` lets a burst of
  concurrent requests all read "under the limit" first, so each would get a password guess.
  The "checked/incremented on every login attempt" wording under Considered options therefore
  still holds; what changed is that successes are refunded.
- App code expires the window itself; the TTL index remains as cleanup.
- A first-attempt insert that loses the unique-index race (`E11000`) is retried once.

Known limit, unchanged: the limit is per email, so anyone can still trigger a lockout for a
victim's email by sending failed logins for it. Closing that needs a different key (e.g. per IP or
per email+IP) and would be a new ADR. *(Done 2026-10-06 in [ADR-0004](../../../adr/0004-login-rate-limit-email-and-ip.md):
the strict limit is now per email+IP and the per-email limit is a ceiling of 30.)*

## Links

- PRD: [[../PRD.md]] §6 NFR (login attempt rate limit), §6.1 Security (credential-stuffing abuse case)
- SAD: [[../sad.md]] §4
