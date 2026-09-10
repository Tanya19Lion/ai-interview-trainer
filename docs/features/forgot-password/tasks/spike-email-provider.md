---
status: Draft
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
