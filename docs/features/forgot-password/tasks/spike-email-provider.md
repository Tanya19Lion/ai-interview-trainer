---
status: Done
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T0 — Spike: decide email-delivery provider

## Links

- PRD: [../PRD.md](../PRD.md) §8 open question ("Which email-sending provider/mechanism to use?")
- SAD: [../sad.md](../sad.md) §2 Constraints, §7 Deployment view, §11 Risks ("Open architectural decision")

## Scope

Timeboxed spike, not a full implementation task. Decide:

- Provider or dev-only stub (nodemailer + console/log or Ethereal transport) for v1, given this is "nice to have" with no hard deadline (PRD §1) and effort budget ~4 person-weeks (idea-brief §11).
- The required new environment variable name(s) (SAD §7 — alongside `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CLIENT_URL`).
- Whether the decision is significant enough to warrant a new ADR (blast-radius gate) — if yes, write one; if it's a reversible, low-blast-radius pick (e.g., swappable nodemailer transport behind the existing service boundary), a short note in this task's outcome is enough.

## Deps

None — runs independently of T1–T4, T6–T16 (all written against `passwordReset.service.ts`'s pluggable interface, SAD §4 strategic choice 3).

## DoD

- [ ] Decision documented (either a new ADR, or an outcome note appended to this file).
- [ ] Env var name(s) fixed — unblocks T5's implementation and its `.env.example` update.
- [ ] SAD §11's "Open architectural decision" risk row marked resolved (separate edit to `sad.md`, out of scope for `divide-tasks` itself — flag as a follow-up, don't silently leave it stale).

## Out of scope

- Actually writing `sendResetEmail` — see T5.

## Outcome (2026-10-06)

**Decision: Resend, sent over its HTTP API (a single `fetch`, no SMTP connection to open per serverless call), behind `sendResetEmail(email, rawToken)` in `passwordReset.service.ts`. It is not enabled yet, because a verified sending domain is required and the project has none.**

- **Why Resend:** the free plan covers this feature's volume (100 emails per day, 3,000 per month, one verified domain — see [Resend's limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)), and the HTTP API suits the Vercel function (ADR-0002) better than SMTP.
- **Why it waits:** a mail provider has to be allowed to send from the sender's domain (SPF/DKIM records in DNS). The app lives on `*.vercel.app`, whose DNS is not ours, and the project has no domain of its own. Without one, mail either goes only to the account owner (provider test mode) or lands in spam; this was not checked against Resend's docs and is the first thing to confirm when T5 starts.
- **Env var names (fixed for T5):** `RESEND_API_KEY` (secret, Vercel Environment Variables, never `VITE_`-prefixed) and `MAIL_FROM` (e.g. `Interview Trainer <noreply@<your-domain>>`). Add both to `.env.example` when T5 lands.
- **No ADR:** the provider sits behind one function, so swapping it (SMTP via nodemailer, Brevo, another API) touches one file and two env vars — low blast radius, a note is enough.
- **Do not use a log-only stub in production:** a stub that prints the reset link would put live reset tokens into Vercel's function logs, readable by everyone with project access. A stub is acceptable only when `NODE_ENV !== 'production'`.
- **Unblocked by getting a domain:** T5 (send), T6 (`POST /password-reset/request`, together with moving the unknown-email counter from the in-memory `Map` to Mongo — PROGRESS.md item 4), then T9 and T10 (client), T14, T16.
- **SAD §11:** the "Open architectural decision" row is resolved by this note (provider chosen, enabling blocked on a domain); `sad.md` was updated accordingly.
