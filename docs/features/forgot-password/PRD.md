---
status: Draft
owner: "Tanya (product/eng)"
reviewers: []
updated_at: "2026-09-09"
feature_size: S
stage: "03"
ticket: "TBD"
---

# PRD — Forgot / Reset / Change Password

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** `src/controllers/auth.controller.ts`, `src/middleware/auth.ts` — the
> shared `issueSession` helper (signs JWT, sets httpOnly cookie), bcrypt password hashing, an
> 8-character minimum password, and a generic "invalid email or password" login error that never
> reveals whether an email is registered.
> **External context channels used:** Project docs — `docs/PRD.md` (root, project-level).

## 1. Context

A job-seeker with a **Local account** (registered via email+password) who forgets their password
currently has no way to recover access — the LoginPage's "Forgot password" link is plain text
with no functionality behind it (idea-brief §2). This is a preemptive gap, not a measured
incident: no job-seeker has reported being locked out (idea-brief §2, §4).

There is no dated trigger for this work — it's explicitly "nice to have," closing a visibly
broken UI affordance rather than responding to an incident or deadline (idea-brief §4).

The accepted vector (idea-brief §13, Approach C): a classic email-based forgot/reset flow plus an
authenticated change-password flow, both scoped to Local accounts. A job-seeker with a **Google
OAuth account** (no password stored at all) who lands in this flow gets a clear explanatory
message, not a broken form or silent failure.

The existing auth code already establishes patterns this feature must follow: every login path
funnels through one `issueSession` helper so JWT/cookie logic exists in exactly one place
(`.claude/rules/backend/auth.md`); `register` hashes with bcrypt and enforces an 8-character
minimum; `login` returns a generic invalid-credentials message without revealing whether the
email exists. This reset feature must not introduce a second way to leak account existence.
`User.passwordHash` is already optional and `googleId` already sparse — the account model already
expects "may have either, both, or neither."

## 2. Goals

- A job-seeker with a Local account who forgot their password recovers access on their own,
  without contacting support.
- A job-seeker with a Local account can change their password at any time while logged in.
- A job-seeker with a Google OAuth account who clicks "Forgot password" immediately understands
  why no reset applies to their account, instead of hitting a dead end or a confusing error.

## 3. Non-goals

- Password reset/change for Google OAuth accounts — impossible by construction, the account has
  no password to reset (idea-brief §5).
- Linking an email+password credential onto an existing Google-only account — parked as a
  separate, later feature (idea-brief §14), not part of this PRD.
- Any secondary recovery factor beyond a single email-based channel (e.g., SMS, security
  questions) — explicitly out of scope (idea-brief §5).
- Multi-role or admin-initiated password resets — the product has a single role, job-seeker
  (root PRD §3).

## 4. User stories

### US-01: Request a password reset

**As a** job-seeker with a Local account who forgot their password
**I want** to request a password reset using my account's email
**So that** I can start recovering access without contacting support

### US-02: Set a new password via reset link

**As a** job-seeker with a Local account
**I want** to set a new password after confirming my identity via the reset link
**So that** I can log back in with a password only I know

### US-03: Change password while logged in

**As a** job-seeker with a Local account
**I want** to change my password from my profile while logged in
**So that** I can update my credentials without going through the forgot-password flow

### US-04: Understand why reset doesn't apply to a Google account

**As a** job-seeker with a Google OAuth account
**I want** to see a clear explanation when I click "Forgot password"
**So that** I'm not confused about why no reset email arrives, and know how to sign in instead

### US-05: Reset link expires or becomes invalid

**As a** job-seeker with a Local account
**I want** an expired or already-used reset link to be clearly rejected
**So that** I'm not left wondering why setting a new password silently failed

## 5. Acceptance criteria

### AC-01 (US-01, US-02) — happy path

**Given** a job-seeker with a Local account has forgotten their password
**When** they request a password reset with their account's email and then follow the reset link
to set a new password
**Then** the system accepts the new password and confirms that the job-seeker can now log in with
it

### AC-02 (US-01) — authorization / hide existence

**Given** a job-seeker requests a password reset for an email address
**When** that email does not correspond to any Local account
**Then** the system shows the same confirmation it would show for a known email, without
revealing whether an account exists for that address

### AC-03 (US-02, US-05) — domain invariant

**Given** a job-seeker follows a password-reset link
**When** the link has expired or was already used to set a password
**Then** the system blocks setting a new password and tells the job-seeker to request a new reset
link

### AC-04 (US-03) — error

**Given** a logged-in job-seeker with a Local account attempts to change their password
**When** they provide an incorrect current password
**Then** the system blocks the change, tells the job-seeker their current password is incorrect,
and leaves the existing password unchanged

### AC-05 (US-04) — cross-context

**Given** a job-seeker's account has no Local password (a Google OAuth account)
**When** they attempt to request a password reset or open the change-password screen
**Then** the system tells them the account signs in with Google and offers to continue that way,
without generating a reset attempt for a password that doesn't exist

### AC-06 (US-03) — domain invariant

**Given** a logged-in job-seeker changes their password successfully
**When** the change completes
**Then** the system ends every other active session for that job-seeker, so a previously issued
session can no longer be used

## 6. Non-functional requirements

<!-- Latency/throughput follow the root PRD's honest TBD (no APM exists yet, §8 tracks the
     measurement plan). TTL and rate-limit are concrete, decided numbers — not measured, but
     deliberately fixed upfront because they are security controls, not performance targets. -->

| Aspect | Target | Measurement |
|---|---|---|
| Password-reset request latency p95 | TBD | No APM exists yet (root PRD §6) — measurement plan in §8 |
| Password-reset token validity window | ≤ 15 min | Enforced at issuance; token invalid past expiry regardless of use |
| Password-reset request rate limit | ≤ 3 requests / hour per email | Enforced server-side to block enumeration/spam abuse (idea-brief §9 edge cases) |
| Throughput | TBD | No load tests exist (root PRD §6) |
| Availability | 99.X% (inherits API SLO) | Root PRD §6 Availability row — no separate SLO for this feature |
| Reset-token single-use guarantee | 100% (no token usable twice) | Atomic consume-on-use at the data layer, preventing race-condition reuse (idea-brief §9) |

## 6.1 Security / privacy

- **Data classification:** Internal — job-seeker personal data (email), consistent with root PRD
  §6.1; no regulated category.
- **Personal data touched:** no new personal-data fields — reuses the existing `email` and
  `passwordHash` fields already on `User` (root PRD §6.1); adds a short-lived reset-token record
  tied to the existing account, not a new personal-data field.
- **AuthZ/AuthN impact:** the reset-request and reset-confirm actions are necessarily
  unauthenticated (the job-seeker isn't logged in yet); the change-password action reuses the
  existing `requireAuth` middleware. Reset tokens are single-use, short-lived, and always
  validated server-side — never trusted from client input beyond a lookup.
- **Abuse cases:**
  - **Email enumeration** via differing responses: mitigated — same confirmation message
    regardless of whether the email is registered (AC-02).
  - **Reset-token replay/reuse:** mitigated — token invalidated atomically on first use
    (single-use guarantee, §6).
  - **Reset-request spam / email-bombing:** mitigated — rate limit of 3 requests/hour per email
    (§6).
  - **Stolen-session persistence after a password change:** mitigated — all other active sessions
    are ended when the password changes (AC-06), directly addressing the top risk identified in
    idea-brief §10.
  - **Google-account confusion / dead end:** mitigated by explicit account-type messaging (AC-05).
- **Security review:** Required — introduces new unauthenticated endpoints and a new token-based
  trust boundary, on top of the existing auth routes root PRD §6.1 already flags as needing review
  before public release.

## 7. Metrics / KPIs

- **Self-service recovery rate** — baseline: 0% (feature doesn't exist); target: ~80% of started
  reset attempts completed without a support contact, measured over the first 30 days post-release
  (idea-brief §7 Approach C outcome metric, §11 RICE Impact driver).
- **Reset abandonment rate** — baseline: TBD (no tracking exists yet); target: measure for the
  first 30 days post-release before setting a target — reset-attempt records already created at
  the data layer can be aggregated with no new tracking code, mirroring the root PRD §7 pattern.
- **Google-account dead-end rate** — baseline: TBD; target: zero unhandled dead ends (every
  Google-account job-seeker who clicks "Forgot password" sees the explanatory message, never an
  error) — validated via AC-05 test coverage, not analytics.

## 8. Open questions

- [ ] Which email-sending provider/mechanism to use? Default now: none selected — this blocks the
  request-latency NFR row above. — owner: Tanya, due: before architecture-design.
- [ ] Real self-service recovery rate baseline (§7) needs real usage data — no analytics exist yet
  and idea-brief §11's Reach (R=10) is an unmeasured guess. — owner: Tanya, due: TBD.

## Related

- [CONTEXT](./CONTEXT.md), [idea-brief](./idea-brief.md)
- Root [docs/PRD.md](../../PRD.md) §6.1 — existing auth security posture this feature extends.
- `.claude/rules/backend/auth.md` — existing auth wiring (`issueSession`, `requireAuth`) this
  feature must follow, not duplicate.
