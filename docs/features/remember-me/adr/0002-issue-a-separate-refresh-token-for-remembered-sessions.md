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

# 0002 — Issue a separate refresh token for remembered sessions instead of a single-cookie toggle

- **Status:** Accepted
- **Date:** 2026-09-10
- **Deciders:** Tanya (architect/eng)

## Context

`issueSession()` in `auth.controller.ts` currently issues one JWT, signed with a 7-day
`expiresIn` and set as one httpOnly cookie with a hardcoded 7-day `maxAge`, for all three login
paths. PRD AC-01/AC-02/AC-05 require two different lifetimes depending on whether the Job-seeker
checked "remember me": a fixed ~7-day remembered session, or a session that ends when the browser
closes. This decision fixes the token/cookie architecture that delivers that difference.

**Explicit note on scope:** idea-brief §14 parked "Approach B — Transparent Trust Timeline" (a
rolling/refresh-token model) specifically because the Executive review judged its M-effort
unjustified for an S-size, low-stakes product. During this SAD's §4 Socratic walk, the owner
deliberately overrode that prior call — see PRD §1 ¶4 "Decision override (architecture-design,
2026-09-10)" — accepting the added complexity and bumping `feature_size` to M. This ADR documents
the resulting token architecture, not a re-litigation of whether to take on the extra scope.

## Decision drivers

- PRD AC-01/AC-02/AC-05 — two distinct session lifetimes gated by the "remember me" choice, with
  no rolling/extending window (AC-05 still holds: refresh tokens here are fixed-lifetime, not
  auto-extended).
- PRD AC-07 / SAD ADR-0001 — logout and password reset must both revoke a remembered session via
  the shared `tokenVersion` counter.
- SAD §2 Constraints — `issueSession()` is the existing chokepoint for all 3 login paths; any
  change must not fork that convention into parallel cookie-issuing code.
- Owner's explicit 2026-09-10 override accepting M-size effort for this architecture (PRD §1 ¶4).

## Considered options

1. **Toggle cookie/JWT lifetime inside `issueSession()`** — a `rememberMe: boolean` parameter
   sets `maxAge`/`expiresIn` to either 7 days or "no maxAge" (browser-session cookie) on the same
   single JWT. No new token type.
2. **Separate refresh token for remembered sessions** — `issueSession()` always issues a
   short-lived access JWT; when "remember me" is checked, it additionally issues a longer-lived
   refresh token (httpOnly cookie) that the client silently exchanges for a new access JWT before
   expiry. When unchecked, only the short-lived access JWT is issued (ends at browser close).

## Decision outcome

**Chosen:** Option 2, a separate refresh token. The owner's override (PRD §1 ¶4) accepts this
option's added complexity in exchange for keeping the access-JWT exposure window short
(minutes, not up to 7 days) even for a remembered session — a stolen access token now has a much
smaller blast radius than a stolen 7-day JWT under Option 1, which directly strengthens QG-1
(§1 quality goal — session-revocation security) beyond what Option 1 could offer, since Option 1's
whole 7-day token is equally exposed regardless of `tokenVersion` revocation.

## Consequences

**Positive**
- Access-JWT exposure window shrinks from up to 7 days (Option 1 / today's behavior) to the
  access-token lifetime only — a stolen access token self-expires quickly even before any
  `tokenVersion` revocation check runs.
- The remembered-session guarantee (AC-05: no rolling extension) is easy to keep honest — the
  refresh token itself carries a fixed, non-extending 7-day expiry; only the short-lived access
  token is silently renewed from it.

**Negative**
- New endpoint required (token refresh) and new client-side logic (silent renewal before access-
  token expiry) on top of `client/src/api/auth.ts` / `useAuth.ts` — effort this feature did not
  originally budget for (idea-brief §11 assumed a single-token toggle).
- Two cookies to reason about per remembered session (access + refresh) instead of one, doubling
  the httpOnly-cookie surface `requireAuth` and the frontend must handle correctly.
- Refresh-token issuance/rotation is new attack surface (e.g. refresh-token replay) that the
  existing single-JWT model never had to consider — §6.1 Security review scope grows accordingly.

**Neutral**
- The `tokenVersion` counter from ADR-0001 still applies uniformly — both the access JWT and the
  refresh token embed and are checked against the same `tokenVersion`, so logout/password-reset
  revocation logic does not need to branch on token type.

## Links

- PRD: [[../PRD.md]] §1 ¶4 Decision override, AC-01, AC-02, AC-05, AC-07
- SAD: [[../sad.md]] §4
- Related ADR: [[0001-extend-tokenversion-counter-to-cover-logout.md]]
