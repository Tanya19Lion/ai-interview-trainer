---
status: Confirmed
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "01"
ticket: "TBD"
value_score:
  rice: 12.5
  state: confirmed
  confirmed_at: "2026-09-10"
feasibility_state: confirmed
---

<!-- Stage 01 → see .claude/skills/interview/SKILL.md -->
<!-- Why: capture the idea before it's forgotten or retold incorrectly -->

# Idea Brief — remember-me

## 1. Raw idea
A "remember me" checkbox on the login form that, when checked, extends the session so a
job-seeker stays logged in across browser closes and doesn't need to re-enter email/password
repeatedly; without it, the session behaves as today (ends on browser close).

## 2. Problem
Job-seekers currently must re-enter email and password every time their session ends (e.g.
closing the browser). This isn't a reaction to a specific reported incident — it's a proactive
gap against a standard UX expectation nearly every modern login form already meets.

## 3. Users
All job-seekers (the product's single user role) who log in more than once — any returning user,
not a first-time-only visitor. No segment distinction exists in this product.

## 4. Why now
Proactive UX alignment with industry norms — not triggered by an incident, contract, or deadline.

## 5. Out of scope
- Device/session management (list of active sessions, remote logout from a specific device) —
  separate feature.
- Passwordless/biometric remember mechanisms — different auth mechanism, not part of this ask.
- Showing the exact session-expiry date/time to the user up front — owner-requested exclusion
  (see §13); only a post-expiry notice is shown.

**Amendment (2026-09-10, during write-prd stage 03):** the bullet originally here — "changing the
default (non-remember-me) session lifetime is out of scope, today's default logout-on-browser-close
behavior stays untouched" — was based on a wrong assumption. Reading the actual auth code
(`src/controllers/auth.controller.ts`'s `issueSession()`) during PRD drafting showed every login
already issues a persistent ~7-day cookie today, regardless of any choice — there is no
browser-session-only default to "stay untouched". Owner confirmed inverting the default IS in
scope: unchecked logins must switch to a short-lived, browser-session cookie so the "remember me"
checkbox has an actual effect. See `PRD.md` §1 Decision override and §4 US-05.

## 6. Competitive analysis
| # | Product · URL | Features | Value per feature (1-5) | Gap |
|---|---|---|---|---|
| 1 | GitLab · gitlab.com/gitlab-org/gitlab/-/issues/419602 | Remember-me checkbox extends session via a rolling ~2-week window, refreshed on each visit | 4 | No visible indication to the user of when the extended session actually expires |
| 2 | Google Workspace · knowledge.workspace.google.com/admin/security/set-session-length-for-google-services | Admin-configurable session length, default 14-day web session | 4 | Configurability is admin-side only, not a user-facing login choice |
| 3 | Symfony (security reference component) · symfony.com/doc/current/security/remember_me.html | Secure hashed remember-me cookie, configurable duration, "always remember me" mode | 5 | Framework-level reference, not a live product to benchmark UX against |
| 4 | OpenStreetMap · lists.openstreetmap.org/pipermail/rails-dev/2019-December/017356.html | Remember-me checkbox present, but historically unclear about how long the session would last | 2 | Concrete real-world failure case: users confused/complained about not knowing how long they'd stay signed in |

Footnotes: all rows sourced 2026-09-10 via WebSearch (`"remember me" login feature session token
duration best practice 30 days`; `remember me checkbox JWT refresh token implementation standard
duration OWASP`; `GitHub Google Amazon "remember me" login session stay signed in how long days`).

## 7. Strategic approaches

### Approach A — Remember Me Login Checkbox
- **Thesis**: Add a single checkbox to login that issues a long-lived session token so users stay
  signed in across browser closes.
- **For whom**: All job-seekers logging in via any supported method.
- **Outcome metric**: Qualitative — re-login friction/support questions → matches industry norm.
- **Key trade-off**: Fixed 7-day non-rolling expiry keeps this to one flag + one extended token
  lifetime, at the cost of no duration messaging — reproduces the OpenStreetMap-style confusion
  gap found in §6.
- **Effort signal**: S
- **Recommended?** ◯ (parked, see §14)

### Approach B — Transparent Trust Timeline
- **Thesis**: Remembering the user becomes a visible, trustworthy promise by showing exactly how
  long and why they'll stay signed in, with the window extending on each visit.
- **For whom**: Job-seekers who return often over several days while preparing for an interview.
- **Outcome metric**: Support/confusion tickets about unexpected logout — baseline unmeasured →
  0 reported instances of OpenStreetMap-style confusion post-launch.
- **Key trade-off**: Rolling 7-day window with full expiry messaging matches the GitLab/Google
  standard but costs more design/engineering work than a fixed-expiry token, and adds
  state-tracking complexity beyond what §2's problem requires.
- **Effort signal**: M
- **Recommended?** ◯ (parked, see §14)

### Approach C — Remembered Login, Clearly Timed
- **Thesis**: Let job-seekers opt into staying signed in for a fixed, industry-aligned window,
  closing the "why was I logged out" gap without rolling-session complexity.
- **For whom**: Returning job-seekers who practice across multiple sessions/days.
- **Outcome metric**: Qualitative — pre: every returning user re-enters credentials each session
  → post: majority of returning logins use "remember me," zero confusion complaints about
  unexpected logout.
- **Key trade-off**: Fixed 7-day token (no rolling extension) means an active user is still
  logged out exactly on day 7; per owner decision (§13), the exact expiry date is not shown
  up front — a clear "your session expired" notice appears only once a token has actually
  expired.
- **Effort signal**: S
- **Recommended?** ● (selected, see §13)

## 8. Multi-perspective feedback

### Engineer
- Approach A: simple, fixed exposure window, low complexity — but full 7-day exposure if a
  token is compromised.
- Approach B: rolling-window state tracking adds real complexity — reissue/last-seen
  bookkeeping, clock-skew edge cases, highest testing burden of the three.
- Approach C: keeps A's low complexity (no rolling-window state) while closing the trust gap —
  mainly a UI-layer addition, not new backend logic.

### Executive
- Approach A: fastest to ship, avoids over-investing in a proactive (non-incident) problem — but
  leaves the OSM-style gap open.
- Approach B: value is speculative for a single-role, low-stakes practice tool with no measured
  complaints — 2-3x the effort of A/C for UI messaging alone.
- Approach C: best value-per-effort of the three — same S-effort as A, closes most of B's trust
  benefit — "recommended default."

### UX-researcher
- Approach A: no duration messaging — user has no way to predict logout, directly mirrors the
  OpenStreetMap complaint pattern.
- Approach B: strongest transparency of the three, but a silently-extending rolling window can
  itself become confusing/inconsistent over time.
- Approach C: resolves the OpenStreetMap-style pitfall via a clear notice at expiry (per owner's
  final decision, §13); fixed-window model is easier for users to reason about than a rolling one.

### Synthesis matrix
|         | Engineer | Executive | UX |
|---------|:--------:|:---------:|:--:|
| App. A  | +        | +         | -  |
| App. B  | -        | -         | +  |
| App. C  | +        | +         | +  |

A — simple but full-week exposure (Eng); fast, no wasted effort (Exec); no duration signal,
mirrors OSM gap (UX). B — rolling-state complexity, highest test burden (Eng); speculative value
for low-stakes product (Exec); best transparency but rolling window can confuse (UX). C — A's
simplicity plus closes trust gap (Eng); best value-per-effort, recommended default (Exec);
resolves OSM pitfall via post-expiry notice (UX).

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|
| A | Minimal effort (S), simplest to implement/test, smallest integration surface | Full 7-day exposure window if token stolen; no duration messaging reproduces the exact UX pitfall found in §6 |
| B | Best-in-class transparency, matches GitLab/Google's rolling-window industry norm, strongest differentiation | Highest effort (M) and complexity (rolling-window state, message-drift risk); Executive review found the extra investment unjustified for this product's stakes |
| C | S-effort like A, closes the same trust gap B addresses via a clear post-expiry notice, best value-per-effort per all three perspectives | Session still ends exactly at 7 days even for an actively-returning user, with no rolling extension |

### Edge cases
- Persistent XSS turns into a week-long account takeover: an exposed long-lived token gives an
  attacker up to 7 days instead of a browser-session-only window.
- Logout doesn't actually revoke: if logout only clears the client-side cookie, a stolen token
  keeps working for the rest of the 7 days.
- Shared/public computer persistence: the next person on a public computer inherits 7 days of
  access if "remember me" was checked.
- Missing transport-security flags on the token/cookie could make it replayable cross-site or
  over an insecure connection.
- No device/session visibility: a user who suspects one stolen device has no self-service way to
  end just that session (ties to the §5 out-of-scope decision).
- Clock-skew edge cases: server/client drift could expire a session early (lost in-progress
  answers) or let it outlive the intended 7 days.
- Concurrent-tab race conditions: a future rotating-token model could trigger spurious logouts
  when multiple tabs refresh near-simultaneously.

## 10. Risks
- **Top devil's-advocate vector (Phase 8)**: a password reset does not automatically invalidate
  previously issued long-lived "remember me" tokens — a user who resets their password because
  they suspect compromise can still be undermined by an attacker holding an old remembered-session
  token for up to 7 more days, defeating the point of the reset. This is especially load-bearing
  because the product's forgot-password flow was just built (`docs/features/forgot-password/`)
  and must be designed to invalidate remembered sessions too, not just the primary password.
- Extended 7-day exposure window widens the blast radius of any session-token theft compared to
  today's browser-session-only behavior.
- No device/session list means a user has no self-service way to end one specific remembered
  session if they suspect only one device is compromised.

## 11. RICE — Claude proposed
- **Reach (R)**: 100 — proxy for "100% of returning job-seekers," normalized to a 100-point scale;
  no concrete active-user headcount is available (rationale cites §3 Users and the project's
  pre-launch/no-live-analytics state per `PROGRESS.md`).
- **Impact (I)**: 0.5 (Low) — rationale cites §2 Problem (proactive, not incident-driven) and §8
  Executive perspective ("no measured complaints today, S-effort avoids over-investing").
- **Confidence (C)**: 0.5 — rationale cites §15 Open questions (Reach is an unmeasured proxy, no
  live analytics to confirm).
- **Effort (E)**: 2 person-weeks — rationale cites §7 Approach C Effort signal (S) plus the
  token-invalidation-on-password-reset work flagged in §10 Risks.
- **RICE = 100 × 0.5 × 0.5 / 2 = 12.5**
- **State**: confirmed

## 12. Feasibility — Claude proposed
- [☑] **Tech**: session-token auth already exists (`src/controllers/auth.controller.ts`,
  `src/middleware/auth.ts`); forgot-password (`docs/features/forgot-password/`) already extended
  this same auth layer with token-based logic.
- [☑] **Skills**: the team just shipped forgot-password — a comparable auth-adjacent, token-based
  feature — through this same SDLC pipeline.
- [☑] **Time**: forgot-password (similarly-sized) went through a full SDLC cycle in days;
  remember-me is narrower (one checkbox + duration logic in the existing login flow, no email
  delivery or separate token-issuance flow).
- **State**: confirmed

## 13. Recommendation
**Selected: Approach C — Remembered Login, Clearly Timed (owner-adjusted)**. Approach C achieves
the best balance of the three: it ships at the same S-effort as the minimal Approach A (RICE =
12.5 per §11, Feasibility 3/3 confirmed per §12), while closing the exact competitive gap found in
§6 (OpenStreetMap's undisclosed remember-me duration caused user confusion) — a gap Approach A
would silently reproduce. All three multi-perspective reviews in §8 rate C as "+" (Engineer: low
complexity, closes trust gap; Executive: best value-per-effort, "recommended default"; UX:
resolves the OpenStreetMap-style pitfall), while both A and B carry at least one "-". Approach B's
added transparency and rolling-window parity with GitLab/Google was judged not worth its M-effort
and added complexity for a single-role, low-stakes product with no measured user complaint (§8
Executive).

**Owner adjustment (confirmed 2026-09-10)**: rather than displaying the exact future expiry
date/time at checkbox-check time (as originally drafted for Approach C), the owner chose a
simpler, equally-effective mechanism: no forward-looking duration is shown at login; instead, a
clear "your session expired, please log in again" message is shown only when the user returns
with an already-expired token. This still closes the OpenStreetMap-style confusion gap (§6, §8
UX) without exposing forward-looking session-expiry data the owner judged unnecessary to surface.

**Locked-in pointer**: write-prd (stage 03) should scope the login-form checkbox, backend
session-duration logic (~7-day window, pending §15 confirmation), the post-expiry notification,
and the §10 token-invalidation-on-password-reset requirement as a hard dependency.

## 14. Parked & rejected approaches
| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|
| A | **Remember Me Login Checkbox** — fixed 7-day token, single checkbox, no duration messaging. Thesis: a checkbox issues a long-lived session token so users stay signed in across browser closes. For whom: all job-seekers. Outcome: qualitative re-login-friction reduction. Trade-off: cheapest to ship, but reproduces the OpenStreetMap-style UX gap. Effort: S. | parked | Reproduces the OpenStreetMap-style gap from §6; C closes it at the same effort cost. | Revisit if C's post-expiry notice proves to add meaningful overhead and the team decides messaging isn't worth even that cost. |
| B | **Transparent Trust Timeline** — rolling 7-day window extended on each visit, with full duration messaging (GitLab/Google-style). Thesis: remembering becomes a visible, trustworthy promise. For whom: job-seekers returning frequently over several days. Outcome: zero OpenStreetMap-style confusion tickets post-launch. Trade-off: best-in-class transparency and industry parity, at M-effort and added rolling-window state/security complexity. Effort: M. | parked | Executive review (§8) found the added effort/complexity unjustified for a low-stakes product with no measured complaint; UX flagged a silently-extending window as itself confusing. | Revisit if usage data shows very frequent (e.g. daily) logins where a fixed 7-day window causes unwanted re-logins, or the product later handles higher-stakes data. |

## 15. Open questions
- [ ] Final session duration (~7 days proposed, pending confirmation against the 7-vs-14-day
  competitive benchmark in §6) — owner: Tanya, due: before write-prd (stage 03) locks the
  number.
- [ ] Real active-user reach (§11 RICE Reach is a 100-point proxy, not a measured headcount — no
  live analytics exist yet per `PROGRESS.md`) — owner: Tanya (PM), due: after the live-Mongo
  verification work referenced in `PROGRESS.md` is complete.
- [ ] Whether logout must actively revoke a remembered-session token server-side, or whether
  client-side-only logout is acceptable given the risk noted in §10 — owner: Eng/Tech Lead, due:
  before write-prd (stage 03) locks the auth design.
- [ ] Confirm token-invalidation-on-password-reset (§10 top risk) is an in-scope hard requirement
  for this feature, not a separate future feature — owner: Eng/Tech Lead, due: before write-prd
  (stage 03).

## Related
- `docs/features/forgot-password/` — sibling auth-adjacent feature, same SDLC pipeline, cited in
  §12 Feasibility as the adjacent shipped feature.
- `docs/CONTEXT.md` — project-level domain glossary (no new terms added by this brief; existing
  terms like "Job-seeker" apply directly).

## DoD self-check
- [x] 15 sections present
- [x] No anti-pattern terms (Postgres/Redis/etc.)
- [x] Length ≤ 5 pages (~2200 words)
- [x] Frontmatter status: Confirmed
- [x] RICE confirmed (state: confirmed)
- [x] Feasibility confirmed (state: confirmed)
- [x] Recommendation present with rationale citing 4 upstream sections (§6, §8, §11, §12)
