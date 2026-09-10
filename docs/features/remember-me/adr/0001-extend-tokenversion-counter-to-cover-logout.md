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

# 0001 — Extend the User.tokenVersion counter to also cover logout

- **Status:** Accepted
- **Date:** 2026-09-10
- **Deciders:** Tanya (architect/eng)

## Context

PRD AC-07 requires that logging out ends a Job-seeker's remembered session server-side, so a
captured session cookie can't be replayed after logout — the same guarantee AC-04 already
requires for a password reset. The sibling `forgot-password` feature already decided (ADR
[[../../forgot-password/adr/0002-tokenversion-counter-for-session-invalidation.md]], Accepted
2026-09-09) to add a `tokenVersion` integer counter on `User`, bumped on password change and
checked in `requireAuth` on every request — but that field does not exist in `src/models/User.ts`
or `src/middleware/auth.ts` yet (confirmed via repo scan, 2026-09-10). remember-me is the first
feature that will actually implement it, and needs to decide whether logout reuses that same
counter or gets its own mechanism.

## Decision drivers

- PRD AC-07 (logout ends the remembered session server-side) — a hard functional requirement.
- PRD AC-04 / idea-brief §10 top risk — the password-reset invalidation guarantee must not
  regress while remember-me implements the field for the first time.
- SAD §2 Constraints: no Redis or session store exists; `requireAuth` is the single chokepoint for
  every protected route.
- SAD §2 Constraints: remember-me was originally feature_size S (~2 person-weeks, idea-brief §11)
  when this decision was made — a second parallel revocation mechanism was disproportionate effort
  for that size. The later §4 Decision 2 override (ADR-0002) raised the feature to size M for
  unrelated reasons (the two-token refresh model); it does not reopen this decision — reusing the
  single `tokenVersion` counter is still the lower-effort, single-code-path option regardless of
  feature size, so the outcome below holds independent of the size bump.

## Considered options

1. **Reuse the single `tokenVersion` counter for both logout and password reset** — logout bumps
   the same integer field forgot-password's ADR 0002 already defined; `requireAuth`'s existing
   comparison logic (once implemented) covers both cases with no new code path.
2. **Add a separate per-login session-id, stored in a new `Sessions` collection** — each login
   gets its own record; logout deletes just that record, leaving other devices' sessions intact.

## Decision outcome

**Chosen:** Option 1, reuse the single `tokenVersion` counter. It satisfies AC-07 with the same
mechanism forgot-password already committed to for AC-04, adding only one increment call at
logout — no new collection, no new query shape, no second revocation code path for
`requireAuth` to check. Option 2's per-device precision is real (GitLab-style single-device
logout) but is explicitly out of scope: PRD §3 Non-goals rules out device/session management for
this feature, and idea-brief §5 parks it as a separate feature.

## Consequences

**Positive**
- Satisfies AC-07 with a one-line addition (`user.tokenVersion += 1` in the `logout` controller)
  once the `tokenVersion` field exists — no new infrastructure beyond what forgot-password already
  committed to.
- `requireAuth`'s revocation check (to be implemented per forgot-password ADR 0002) covers
  password-reset AND logout uniformly — one code path, one thing to test.
- remember-me becomes the feature that actually ships the `tokenVersion` field + `requireAuth`
  check forgot-password's ADR decided but never implemented — closing that gap for both features
  at once.

**Negative**
- Logging out on one device invalidates **every** device's session for that Job-seeker, not just
  the current one — a user with two browser tabs open who logs out in one gets signed out of both.
  This is a real, user-visible behavior the Job-seeker may not expect from a single "log out"
  click.
- Still no way to end one specific remembered session without ending all of them (same limitation
  forgot-password's ADR 0002 already accepted).

**Neutral**
- Migrating to a per-device `Sessions` collection later, if single-device logout becomes a real
  requirement, remains possible without reworking this decision — `tokenVersion` and a future
  session-id list are not mutually exclusive.

## Links

- PRD: [[../PRD.md]] AC-07, §6.1 Security (logout revocation)
- SAD: [[../sad.md]] §4
- Related ADR: [[../../forgot-password/adr/0002-tokenversion-counter-for-session-invalidation.md]]
