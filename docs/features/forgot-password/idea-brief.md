---
status: Confirmed
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-09"
feature_size: S
stage: "01"
ticket: "TBD"
value_score:
  rice: 1.25
  state: confirmed
  confirmed_at: "2026-09-09"
feasibility_state: confirmed
---

<!-- Stage 01 → see .claude/skills/interview/SKILL.md -->
<!-- Why: capture the idea before it's forgotten or retold incorrectly -->

# Idea Brief — Forgot / Reset / Change Password

## 1. Raw idea
The first option is good enough, but of course we should pay attention to the second option as well, because as mentioned, some users log in via Google OAuth and for them "resetting the password" makes no sense at all.

(Context recorded during Phase 1: the LoginPage currently shows a "Forgot password" link that is plain text with no functionality. The base expectation is a standard email flow — user enters email → receives a reset link → follows it → sets a new password — but with explicit attention to the fact that some users authenticate via Google OAuth and have no password to reset.)

## 2. Problem
There is no confirmed incident yet — no job-seeker has reported being locked out or contacted support about a forgotten password. This is a preemptive gap: the "Forgot password" link already exists visually on LoginPage and currently does nothing, which is itself a broken-looking affordance for any email+password user who clicks it. The problem is an anticipated gap in a standard auth flow, not a measured pain point.

## 3. Users
Single user role: job-seeker (no admin/reviewer segment exists in this product). Two authentication sub-segments matter here:
- Email+password job-seekers — the only segment that can meaningfully "forget" or "change" a password.
- Google OAuth job-seekers — have no password stored at all; clicking "Forgot password" is a dead end that must be handled explicitly, not silently.

## 4. Why now
No concrete trigger. Confirmed explicitly: this is "nice to have," with no deadline, no upcoming release, and no stakeholder request driving it. It closes a visible gap in the existing auth UI (a non-functional link) rather than responding to a dated event.

## 5. Out of scope
- Building password-reset/change for Google OAuth accounts (they have no password by definition — the account model doesn't support one).
- Linking/adding an email+password credential to an existing Google-only account (raised by one sub-agent as a possible differentiator; explicitly parked, not part of this brief's scope — see §14).
- Any secondary recovery factor beyond a single email-based channel (e.g. SMS, security questions).
- Multi-role / admin-initiated password resets (product has only one user role).

**In scope** (confirmed in Phase 2): both forgot/reset password (for a logged-out email+password user) and change password (for an already-logged-in email+password user) are covered by this brief.

## 6. Competitive analysis
| # | Product · URL | Features | Value per feature (1-5) | Gap |
|---|---|---|---|---|
| 1 | Auth0 · auth0.com | Managed email-based password reset, MFA, enterprise SSO | 5 | Enterprise-scale, disproportionate for a single-role app — reference only, not adopted. |
| 2 | Clerk · clerk.com | Prebuilt reset UI/flow, native Google OAuth handling | 4 | Same auth shape (OAuth + email/password); handles "OAuth user has no password" out of the box, confirming this is a known edge case, not invented. |
| 3 | SuperTokens / Authgear reset-flow guides · supertokens.com, authgear.com | Documented baseline: long random tokens, hashed-at-rest, ≤1h expiry, one-time use, rate-limiting, uniform response | 5 | Sets the security bar our approach must meet. Approach A doesn't meet it — no independent-channel proof of ownership. |

Footnotes: search performed 2026-09-09, queries "password reset flow best practices UX email token JWT session 2026" and "Auth0 vs Supabase Auth vs Clerk password reset feature comparison".

## 7. Strategic approaches

### Approach A — One-time link without email
- **Thesis**: A user who forgot their password proves ownership and sets a new one instantly, with no external delivery channel; a logged-in user just changes their password from their profile.
- **For whom**: Email+password job-seekers only. Google users get a plain explanatory message instead of a real flow.
- **Outcome metric**: Self-recovery rate without support contact: 0% (doesn't exist) → 100% of started attempts.
- **Key trade-off**: No independent channel to confirm intent — weaker proof of ownership than a standard reset.
- **Effort signal**: S
- **Recommended?**: ◯

### Approach B — Smart routing by account type
- **Thesis**: The product recognizes how the person actually signs in and routes them accordingly, so nobody hits a dead end.
- **For whom**: Both segments — email+password users get a normal reset flow; Google users get a friendly explanation plus a one-click path to Google sign-in (optionally offering to add an email+password credential — flagged as scope expansion vs. §5).
- **Outcome metric**: Share of "Forgot password" clicks resolved into successful access (via reset or Google) without support: unknown/nonexistent → "flow exists, no dead ends."
- **Key trade-off**: Friendlier Google handling costs more UX design/screen states without reducing underlying technical complexity.
- **Effort signal**: M
- **Recommended?**: ◯

### Approach C — Self-service password recovery with email confirmation
- **Thesis**: An email+password user recovers access and changes their password independently; a Google user who lands here by mistake gets a clear explanation, not a dead end.
- **For whom**: Primary — email+password job-seekers (full forgot/reset + change-password support). Secondary — Google users get only a soft edge-case message, no dedicated flow.
- **Outcome metric**: Forgot/reset completion rate without support contact: 0% (doesn't exist) → ~80% of started attempts.
- **Key trade-off**: Complete, familiar experience for both scenarios, but deliberately doesn't invest beyond baseline (no reset history, no suspicious-attempt alerts, no secondary recovery factor).
- **Effort signal**: M
- **Recommended?**: ●

## 8. Multi-perspective feedback

### Engineer
- A: no independent verification channel — a real account-takeover surface, plus non-trivial token state management despite the "S" label.
- B: account-type branching creates an enumeration risk and bakes in scope creep via account-linking, multiplying edge cases combinatorially.
- C: largest new integration surface (email delivery from zero, token lifecycle, race conditions on concurrent resets) — but complexity inherent to doing this correctly, not speculative.

### Executive
- A: fast, low-cost win for an unconfirmed hypothesis, but the security shortcut is a consciously accepted technical debt.
- B: highest opportunity cost — effort goes into branching/linking that doesn't produce measurable value for a single-role product with no confirmed incidents.
- C: matches industry-standard expectations and lays reusable infrastructure (email channel) other future features would also need — best long-term value per effort.

### UX-researcher
- A: no independent ownership proof undermines trust; leaves Google users at a dead end without a direct call-to-action.
- B: automatic routing reduces Google-user friction but can feel like unexplained "magic," and the linking sub-flow raises onboarding complexity well beyond a simple "forgot password" click.
- C: the classic email flow is the most recognizable pattern (low onboarding curve) despite typical email friction (delay, spam); the Google message needs a direct "Sign in with Google" action to avoid A's dead-end problem.

### Synthesis matrix
|         | Engineer | Executive | UX |
|---------|:--------:|:---------:|:--:|
| App. A  | -        | +         | -  |
| App. B  | -        | -         | 0  |
| App. C  | 0        | +         | +  |

- A/Engineer: "no independent ownership-verification channel exists"
- A/Executive: "fast MVP win, acceptable technical debt"
- A/UX: "dead end for Google users, weak trust"
- B/Engineer: "branching logic, enumeration risk, scope creep"
- B/Executive: "over-engineering for single-role, unconfirmed problem"
- B/UX: "routing feels like magic, linking adds complexity"
- C/Engineer: "large integration surface, but necessary complexity"
- C/Executive: "industry standard, reusable infrastructure investment"
- C/UX: "familiar pattern, low onboarding curve"

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|
| A | No new infrastructure, fastest to ship (S effort), no email-delivery dependency/latency | Weak security (no independent verification channel), dead-end UX for Google users unless improved, deliberate technical debt |
| B | Friendliest handling of the Google edge case, reduces support confusion around account type | Highest complexity/scope-creep risk (account linking), enumeration risk, effort not justified by an unconfirmed problem |
| C | Industry-standard pattern, strongest security (independent channel), infrastructure reusable for future features, familiar to users | Requires entirely new email infrastructure, operational cost (deliverability, spam, retries), largest hidden cost relative to its nominal "M" effort |

### Edge cases
(Sourced from a clean-context devil's-advocate pass over the real `User` model — `googleId` sparse, `passwordHash` optional — confirming Google users genuinely have no password stored.)
- Google-OAuth user gets a "change password" form demanding a nonexistent "current password," producing a confusing 400/500 instead of a meaningful message.
- No rate limit on forgot-password requests allows email-bombing a victim's inbox with repeated reset emails.
- First-ever outbound email from this project risks poor deliverability (no warmed domain/SPF/DKIM/DMARC) — silently spam-filtered or dropped while the app reports "email sent."
- An unvalidated redirect/next parameter on the reset URL opens an open-redirect/phishing vector from an otherwise-legitimate email.
- Race condition on concurrent reset-token consumption (no atomic "consume" step) could let two simultaneous requests both succeed with different passwords.
- Plaintext (unhashed) reset tokens in the database would let a database/backup leak enable takeover without ever sending an email.
- A reset link without short TTL or single-use invalidation stays exploitable via forwarded emails or link-prefetching proxies/antivirus scanners.

## 10. Risks
- **Top risk (devil's advocate)**: Changing a password does not invalidate other active sessions/JWTs — if an attacker already stole a session token, changing the password (the very action meant to lock them out after a compromise) leaves their access intact until natural token expiry. This defeats the core security purpose of the feature in the exact scenario it exists to address.
- User enumeration through differing responses (or response timing) on the forgot-password endpoint lets an attacker discover which emails are registered.
- Building the first-ever email integration in this codebase from zero is a real, non-trivial technical investment, not a UI-only addition — confirmed by repo scan (no email package present anywhere in `package.json`).

## 11. RICE — Claude proposed
- **Reach (R)**: 10 — conservative, low-confidence estimate; §3 Users has a single role (job-seeker) but no measured user volume or incident count exists yet for this young/small project.
- **Impact (I)**: 0.5 — Executive perspective (§8) frames this as closing a hypothetical risk with no confirmed incident; medium/low impact, not high.
- **Confidence (C)**: 0.5 — several unresolved TBDs (no measured reach, no real incidents, Feasibility Tech partially unresolved).
- **Effort (E)**: 4 person-weeks — matches the M effort signal for Approach C (§7), including building new email infrastructure from scratch, which the Engineer review (§8) called the single largest jump in complexity.
- **RICE = 10 × 0.5 × 0.5 / 4 = 1.25**
- **State**: confirmed

## 12. Feasibility — Claude proposed

- [☐] **Tech**: Partially covered — token generation/hashing reuses existing patterns already present in `src/controllers/auth.controller.ts` and `src/middleware/auth.ts` (bcrypt + JWT), but outbound email delivery is a genuinely new integration: no email-sending package exists anywhere in `package.json`.
- [☐] **Skills**: TBD — the team already has the token/hashing skillset this reuses, but no one has yet integrated email delivery in this project; unverified until an email provider is selected in write-prd/architecture-design.
- [☑] **Time**: Confirmed — no deadline or competing release constrains this ("nice to have"), so time is available, though there is no directly comparable shipped-feature timing to benchmark against.
- **State**: confirmed

## 13. Recommendation
**Selected: Approach C** — Self-service password recovery with email confirmation. Both Executive and UX perspectives (§8) favored it — Executive citing best long-term value ("reusable infrastructure investment"), UX citing its familiar, low-onboarding-curve pattern — while the Engineer's concern about it being the largest integration surface (§8) reflects necessary complexity, not over-engineering. Competitive research (§6) confirms the industry security baseline requires proof of ownership through an independent channel (email); Approach A does not meet this baseline at all. Despite a low RICE score (1.25, §11) reflecting the feature's honest nice-to-have/hypothesis status, and an unresolved Tech/Skills gap around email infrastructure (§12), Approach C is the only option that both closes the gap correctly and doesn't over-invest in speculative differentiation (Approach B).

**Locked-in pointer**: write-prd will scope a classic email-based forgot/reset flow plus an authenticated change-password flow, both for email+password accounts only, with a non-functional (message-only) path for Google OAuth accounts at the entry point — no account-linking, no secondary recovery factor.

## 14. Parked & rejected approaches
| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|
| A | One-time link without email | parked | Fails the industry security baseline (no independent ownership verification); acceptable only as a stopgap, not chosen | Revisit only if speed-to-ship becomes urgent and the weaker security posture is explicitly accepted by the team |
| B | Smart routing by account type | parked | Over-engineered relative to a single-role product with no confirmed incidents; its account-linking angle is a separate feature, not a reset-flow requirement | Revisit if the product adds multiple sign-in-method management as its own initiative, or if support tickets show real Google-user confusion |
| - | Account-linking (add email+password to a Google-only account) | rejected (as part of this brief) | Explicitly flagged by its own proposing sub-agent as scope expansion vs. §5; changes account identity model, not just password recovery | Only if a future brief specifically targets multi-method sign-in |

## 15. Open questions
- [ ] Which email provider/sending mechanism to use, and how it affects Effort (§11) and Tech feasibility (§12) — owner: Tanya, due: at write-prd time.
- [ ] Real Reach (§11 R=10) is an unmeasured guess — no usage analytics exist yet; revisit once real login/user counts are available.
- [ ] Session/JWT invalidation on password change (§10 top risk) needs an explicit decision before architecture-design — currently unresolved.

## Related
- docs/CONTEXT.md — added glossary term "Password reset token" (2026-09-09) as part of this ideation.
- LoginPage (client) — the non-functional "Forgot password" link that triggered this brief.
- `src/controllers/auth.controller.ts`, `src/middleware/auth.ts` — existing auth code this feature extends.

## DoD self-check
- [x] 15 sections present
- [x] No anti-pattern terms (Postgres/Redis/etc.)
- [x] Length ≤ 5 pages (~2200 words)
- [x] Frontmatter status: Confirmed
- [x] RICE confirmed (state: confirmed)
- [x] Feasibility confirmed (state: confirmed)
- [x] Recommendation present with rationale citing 4 upstream sections (§6, §8, §11, §12)
