# Sequence coverage audit — project level — single-flow (AC-04) — 2026-09-07

## Context

Follow-up to `_audit/sequences-2026-09-07.md` (same day): US-01–06 were already 6/6 accounted
for, but that report flagged one known gap: PRD AC-04 ("session already complete → block
submit") had no sequence anywhere in §6. Run in single-flow mode (`--flow`) to close it.

## Added

- **Ad-hoc: submit answer to a completed session (AC-04)** — sync flow, happy path (submit into
  an `in_progress` session) + `alt` branch for AC-04 (submit into a `completed` session → 409,
  blocked). `mmdc` render validated. Appended to `docs/sad.md` §6 under
  `### Ad-hoc: submit answer to a completed session (AC-04)`.

## Real gap found — spec vs. implementation (not just a missing diagram)

While drawing this flow, read the actual `submitAnswer` handler
(`src/controllers/interview.controller.ts`) to get the sequence right, and found AC-04 was
**not implemented**: the handler looked up the session by `{_id, userId}` only, with no
`status` check, then unconditionally called the AI review service and appended to `questions[]`
— a job-seeker could resubmit into an already-completed session, triggering an extra billed AI
call and corrupting `averageScore`/`questions[]` length past `QUESTIONS_PER_SESSION`.

**Fixed** (user confirmed): added a `session.status === 'completed'` check in
`submitAnswer`, returning `409 { error: 'Session is already complete - start a new one' }`
before the AI call — matching the `409` convention already used elsewhere in the codebase
(`auth.controller.ts`'s "email already registered"). Verified with `tsc --noEmit` and
`npm run lint` — both clean. No test suite exists in `src/` to run (`src/**/*.test.ts` — none
found), so this was not covered by an automated regression test; flagging that as a follow-up
if the project adds server-side tests later.

## Skipped (trivial)

None this pass — single-flow mode, no coverage inventory.

## New actors flagged

None — reuses existing §5 Container-view actors (`Client SPA`, `API Server`, `MongoDB`).

## ADR potential

None — this is a bug fix matching an already-decided domain invariant (PRD AC-04), not a new
architectural decision.

## Self-check against DoD

- New Mermaid block passed `mmdc` render validation. ✅
- Diagram now matches implementation (previously diagram would have been aspirational/wrong
  without the code fix). ✅
