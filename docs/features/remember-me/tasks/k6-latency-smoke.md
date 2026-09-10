---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T7 — k6 latency smoke test (QG-2)

## Links

- SAD: [../sad.md](../sad.md) §10 QG-2
- PRD: [../PRD.md](../PRD.md) §6 NFR (login p95 ≤ 300 ms, session-check p95 ≤ 150 ms, ≥30 req/s on
  1 instance)

## Scope

No k6 setup or CI-check convention exists anywhere in this repo yet (`Makefile` has `help, dev,
dev-client, migrate, verify*, test, build, rebuild, clean*` — no k6/perf target; `package.json`
has no k6 script). This task introduces the first one — flag the chosen location/wiring to the
user for review rather than assuming a convention that isn't there.

k6 smoke script (suggested: `tests/k6/auth-latency.js`) hitting:

- `POST /api/auth/login` — assert p95 ≤ 300 ms.
- `GET /api/auth/me` — assert p95 ≤ 150 ms.
- Both at ≥30 req/s sustained on a single local instance.

Run against a local instance with a seeded test user (`example.test` email, per this repo's PII
guard convention) — not against the Prism mock, since mock latency is meaningless for a real NFR
measurement.

## Deps

T2, T3.

## DoD

- [ ] PR merged.
- [ ] k6 script runs locally; whether/how it gets wired into CI is a decision this task surfaces
      to the user, not one it makes silently.
- [ ] Both p95 targets met on a representative local run; if either target is missed, documented
      with numbers and flagged to the user, not silently lowered.

## Out of scope

- `/refresh` latency — no explicit NFR target exists for it in PRD §6.
- Load beyond the stated 30 req/s / 1-instance target.
