---
status: Approved
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: M
stage: "03"
ticket: "TBD"
---

# PRD — remember-me

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** `src/controllers/auth.controller.ts`, `src/middleware/auth.ts`, `src/routes/auth.routes.ts`, `client/src/api/auth.ts`, `client/src/hooks/useAuth.ts`, `client/src/pages/LoginPage.tsx` — code patterns used (shared `issueSession()` choke point, cookie-based session issuance, three login paths).
> **External context channels used:** None — only CONTEXT + idea-brief + reference module.

## 1. Context

Job-seekers (the product's single user role) currently have no way to control how long a login session persists — the login form offers no choice. Idea-brief §2 originally framed the pain as needing to re-enter email/password too often. Investigating the existing auth flow during this PRD's drafting showed that in fact every login already receives the same ~7-day persistent cookie regardless of any user choice — there is no shorter, browser-session-only option today, and no job-seeker currently controls or even sees this behavior.

Why now: idea-brief §4 frames this as proactive UX alignment with industry norms, not incident-driven. Implementing an explicit control now also closes a silent gap where every job-seeker session already persists ~7 days without the job-seeker choosing that or being told about it.

Accepted vector: idea-brief §13 Recommendation — Approach C (owner-adjusted). A fixed ~7-day "remembered session" opt-in via checkbox, with no forward-looking expiry date shown up front, and a clear "your session expired" notice shown only once an expired remembered session is used again.

Reference-module pattern: `issueSession()` in `auth.controller.ts` is the single choke point already used by all three login paths (Google OAuth, register, email/password login) — new remember-me logic slots into this same helper, so the cross-context requirement (§5 AC-06) is a natural consequence of the existing code shape, not new plumbing.

**Decision override:** idea-brief's original problem framing ("sessions end on browser close today") does not match the shipped code — every login already gets a 7-day persistent cookie. Owner confirmed (2026-09-10) to invert the feature's default so that unchecked logins get a short-lived, browser-session cookie and only a checked "remember me" keeps today's 7-day persistence — rationale: a genuine opt-in control requires an actual difference between the two states, which does not exist today. Owner re-confirmed (2026-09-10) after PRD drafting that this inversion is settled, not open — idea-brief §5 has been amended accordingly, and this PRD's §4 now includes the default-short-session behavior as US-05 (previously deferred to Open Questions).

**Decision override (architecture-design, 2026-09-10):** during SAD §4 Solution strategy, the owner deliberately overrode idea-brief §14's rejection of Approach B (rolling/refresh-token model, parked for unjustified M-effort on an S-size feature) and PRD §3's implicit assumption of a single-token model. The remembered-session lifetime is now implemented via a short-lived access JWT + a separate longer-lived refresh token (see `sad.md` §4, `adr/0002-issue-a-separate-refresh-token-for-remembered-sessions.md`), not a toggle on the existing single-cookie `issueSession()`. This does not reopen §3's "no rolling/extending window" non-goal — the refresh token itself still has a fixed, non-extending 7-day lifetime — but it does raise this feature's effort/complexity beyond the original S estimate, hence `feature_size` is bumped to M in this document's frontmatter. The remembered-session duration (7 days, §8) and the fixed-window behavior (AC-05) are unchanged.

## 2. Goals

- Job-seekers explicitly choose whether their login persists across browser closes, closing today's silent always-persistent default.
- The remembered-session duration is communicated to the job-seeker only when it matters (at the moment their remembered session actually expires), not shown as a forward-looking date.
- Session-security posture stays intact when a job-seeker resets their password — no long-lived remembered session survives a password they no longer trust.

## 3. Non-goals

- Device/session management (active-sessions list, remote logout of a specific device) — separate feature, idea-brief §5.
- Passwordless/biometric remember mechanisms — different auth mechanism, not part of this ask, idea-brief §5.
- A rolling/extending remembered-session window — idea-brief §7 Approach C explicitly rejected Approach B's rolling window as unjustified effort for this product; the window is fixed.
- Showing the exact session-expiry date/time up front — explicit owner decision in idea-brief §13; only a post-expiry notice is shown.

## 4. User stories

### US-01: Choose to stay signed in

**As a** Job-seeker
**I want** to opt into staying signed in when I log in
**So that** I don't have to re-enter my email and password every time I return, if I choose to

### US-02: Understand why I was signed out

**As a** Job-seeker
**I want** to see a clear explanation when my remembered session has expired
**So that** I'm not confused about why I suddenly need to log in again

### US-03: Trust that resetting my password protects my account

**As a** Job-seeker
**I want** a password reset to end any remembered session created with my old password
**So that** someone who stole my "remember me" session can't keep using it after I secure my account

### US-04: Get the same choice regardless of how I log in

**As a** Job-seeker
**I want** the remember-me choice to apply whether I sign in with Google or with email and password
**So that** my session behavior is consistent no matter which method I use

### US-05: Default to a short session

**As a** Job-seeker
**I want** my session to end when I close my browser if I didn't check "remember me"
**So that** a shared or public computer doesn't stay signed in as me by default

*(Previously deferred to Open Questions; owner confirmed 2026-09-10 that inverting today's
always-persistent default is in scope — see §1 Decision override and idea-brief §5 Amendment.)*

### US-06: Trust that logging out ends my remembered session

**As a** Job-seeker
**I want** logging out to end my remembered session for good
**So that** a captured or leaked session cookie can't still be used after I've logged out

*(Added 2026-09-10 resolving §8 Open Question on logout revocation — owner confirmed logout must
actively revoke server-side, not just clear the client cookie.)*

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** a Job-seeker is on the login form with the "remember me" option available
**When** the Job-seeker checks "remember me" and successfully signs in (by any supported method)
**Then** the system keeps the Job-seeker signed in even after the Job-seeker closes and reopens the browser, for the remembered-session period

### AC-02 (US-05) — happy path

**Given** a Job-seeker is on the login form
**When** the Job-seeker signs in without checking "remember me"
**Then** the system signs the Job-seeker out once the browser is closed

### AC-03 (US-02) — error

**Given** a Job-seeker previously chose "remember me" and their remembered session has since expired
**When** the Job-seeker returns to the app and the app attempts to use the expired session
**Then** the system shows the Job-seeker a clear message that their session expired and that they need to sign in again, without a silent redirect

### AC-04 (US-03) — authorization

**Given** a Job-seeker had a remembered session, then reset their password
**When** anyone attempts to use that old remembered-session token, issued before the password change
**Then** the system does not grant access with that token

### AC-05 (US-01) — domain invariant

**Given** a Job-seeker is actively using the app within a remembered session
**When** the fixed ~7-day remembered-session window ends
**Then** the system does not extend the window automatically (no rolling extension, unlike GitLab/Google)

### AC-06 (US-04) — cross-context

**Given** a Job-seeker signs in with "remember me" checked, via either supported login method (Google or email/password)
**When** the sign-in succeeds through that method
**Then** the system applies the same remembered-session rule, regardless of method

### AC-07 (US-06) — domain invariant

**Given** a Job-seeker has an active remembered session
**When** the Job-seeker logs out
**Then** the system ends that session server-side, so the same session cookie can no longer be
used to authenticate, even if it is replayed

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Latency p95 login (write) | ≤ 300 ms | login endpoint metric |
| Latency p95 session check (/me, read) | ≤ 150 ms | session-check endpoint metric |
| Throughput | ≥ 30 req/s on 1 instance | k6 smoke in CI |
| Concurrency / accuracy | remembered-session expiry check consistent across server instances within ±1 minute (clock-skew tolerance) | server-side expiry check on token verification, not client-clock trust |
| Login attempt rate limit | ≤ 5 attempts / 15 min per email | Enforced server-side on the login endpoint to block brute-force/credential-stuffing (idea-brief §6.1 gap; no rate limit exists in the reference auth module today) |

## 6.1 Security / privacy

- **Data classification:** confidential — the remembered-session preference itself is not sensitive, but the resulting session token governs access to a job-seeker's stored interview history and answers.
- **Personal data touched:** no new personal-data fields; a new preference selects between two token-lifetime code paths at login time.
- **AuthZ/AuthN impact:** touches the shared session-issuing choke point (`issueSession()`) already used by all 3 login paths, and the `requireAuth` verification middleware; adds a hard dependency on password-reset session invalidation (idea-brief §10 top risk) and, per AC-07, on server-side session invalidation at logout too. `docs/features/forgot-password/adr/0002-tokenversion-counter-for-session-invalidation.md` already added a server-side invalidation mechanism to this same choke point for the password-reset case — architecture-design should evaluate reusing it for logout rather than introducing a second mechanism.
- **Abuse cases:**
  - Shared/public-device persistence: a remembered session left active on a shared device grants up to 7 days of account access to the next user (idea-brief §9 edge case) — mitigated by the default-off, short-session behavior in US-05/AC-02.
  - Stale-token-after-password-reset: an old remembered-session token issued before a password reset must not keep authorizing access (idea-brief §10 top risk) — mitigated by invalidating remembered sessions on password change, not just the password hash.
  - Stale-token-after-logout: a remembered-session cookie captured before logout must not keep authorizing access after the Job-seeker logs out (AC-07) — mitigated by ending the session server-side on logout, not just clearing the client-side cookie.
  - Spam/credential-stuffing on login: mitigated — a per-email rate limit on the login endpoint (§6).
- **Security review:** Required — introduces a new long-lived-credential exposure window and touches the shared auth choke point plus the recently-shipped forgot-password flow's invalidation guarantee.

## 7. Metrics / KPIs

- **Remember-me adoption** — baseline: 0 (new feature), target: majority of returning logins use "remember me" within 30 days of release.
- **Post-expiry confusion** — baseline: unmeasured (no live analytics, idea-brief §11 Confidence caveat), target: 0 support/confusion reports about unexpected logout within 60 days.
- **Stale-session-after-reset incidents** — baseline: 0 (feature doesn't exist yet), target: 0 reported cases of an old remembered session surviving a password reset within 90 days.

## 8. Open questions

- [x] ~~Should the default (unchecked "remember me") session actually shorten to end at browser close?~~ Resolved 2026-09-10 — owner confirmed yes, inverting the default is in scope. See §1 Decision override, §4 US-05, idea-brief §5 Amendment.
- [x] ~~What availability SLO applies to the login/session endpoints?~~ Resolved 2026-09-10 — owner confirmed no formal SLO is set for this feature; no existing SLO document exists in the project and no live monitoring/APM exists to measure against one yet. §6 latency/throughput rows already cover the measurable part.
- [x] ~~Final remembered-session duration?~~ Resolved 2026-09-10 — confirmed 7 days, matching the existing hardcoded value in `issueSession()` (`src/controllers/auth.controller.ts`) and the forgot-password `tokenVersion` precedent. No backend constant change needed.
- [x] ~~Must logout actively revoke a remembered-session token server-side, or is client-side-only clearing acceptable?~~ Resolved 2026-09-10 — owner confirmed logout must revoke server-side. Added as US-06/AC-07; architecture-design should evaluate reusing the `tokenVersion` mechanism from `forgot-password` ADR 0002 (see §6.1 AuthZ/AuthN impact).
- [x] ~~Is a login-attempt rate limit already enforced elsewhere, or does this feature need to add one?~~ Resolved 2026-09-10 — confirmed via code search: no rate limit exists anywhere in `src/`. Owner confirmed adding one is in scope for this feature, not deferred. See §6 NFR (≤ 5 attempts / 15 min per email) and §6.1 abuse cases.
