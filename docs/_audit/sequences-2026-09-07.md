# Sequence coverage audit — project level (docs/PRD.md vs docs/sad.md) — 2026-09-07

## Coverage table (PRD §4 vs SAD §6)

| US-N | Title | Status | Notes |
|---|---|---|---|
| US-01 | Pick a topic and a level | Covered | "Critical flow 1" (existing, not `### US-N` heading) — session start step |
| US-02 | Get an AI-generated question | Covered | "Critical flow 1" — question-generation step |
| US-03 | Submit an answer and get feedback | Covered | "Critical flow 1" — answer submit + feedback step |
| US-04 | Authenticate | **Added** | Existing "Critical flow 2" covered Google OAuth only; new `### US-04:` block adds the email/password path (AC-02 error branch) |
| US-05 | Review interview history | **Added** | New `### US-05:` sequence (list + detail), AC-03 authz + AC-05 ownership-filter branches |
| US-06 | See stats | **Added** | New `### US-06:` sequence, AC-03 authz + AC-05 ownership-filter branches |

## Added

- **US-04** — Authenticate via email/password: `POST /api/auth/login` happy path (JWT cookie issued) + AC-02 error branch (wrong password / unknown email, single generic message so existence of the email isn't leaked). `mmdc` parse validated.
- **US-05** — Review interview history: `GET /api/history` (list) + `GET /api/history/:id` (detail), both filtered by `userId` at the data-access layer (AC-05); `alt` branch for missing/expired JWT (AC-03). `mmdc` parse validated.
- **US-06** — See stats: `GET /api/stats` aggregated by topic/level, same `userId`-ownership filter (AC-05) and JWT-guard `alt` branch (AC-03) as US-05, reflecting the shared `requireAuth` middleware crosscutting concept (§8). `mmdc` parse validated.

## Skipped (trivial)

- None — all 6 PRD user stories needed either existing coverage confirmation or a new diagram; no single-hop trivial UC identified at this granularity.

## New actors flagged

- None. All three new diagrams reuse existing §5 C4 Container actors (`Client SPA` / `web`, `API Server` / `api`, `MongoDB` / `db`) — no new container introduced.

## Heading-convention note

Existing §6 blocks ("Critical flow 1", "Critical flow 2") predate this skill's `### US-N: <title>` heading convention and were left untouched (skill rule: don't touch existing sequences). Coverage above was determined by content (AC↔US mapping), not heading grep. New blocks use the `### US-N:` convention going forward.

## Known gap, not addressed this pass

- Existing "Critical flow 1" (US-01/US-02/US-03) shows only the happy path — PRD's AC-04 (session-already-completed invariant) has no error branch anywhere in §6. Per the skill's "additive only" rule, this existing sequence was not modified. Flagging for a future `--flow` pass if the user wants AC-04 drawn.

## ADR potential

- None. All three added flows are direct consequences of the existing `requireAuth` middleware pattern and `userId`-filtered Mongoose queries (§8 Crosscutting concepts) — no new irreversible/multi-module decision was introduced.

## Self-check against DoD

- Every PRD US (US-01…US-06) is Covered or has a fresh §6 sequence. ✅
- All 3 new Mermaid blocks passed `mmdc` render validation. ✅
