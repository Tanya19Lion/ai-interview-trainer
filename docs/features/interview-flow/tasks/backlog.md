# Tasks — Interview flow

**Phase:** TL+devs (breakdown of `PRD.md`/`SAD.md` into work devs pick up)

## Done (reflects shipped code as of this writing)

- [x] `interview.routes.ts` — mount `requireAuth`, wire `/active`, `/start`,
      `/:sessionId/answer`.
- [x] `interview.controller.ts` — `startSession`, `getActiveSession`,
      `submitAnswer` with the 5-question session lifecycle.
- [x] `ai.service.ts` — `generateQuestion` / `reviewAnswer` against
      `claude-sonnet-4-5`, including the "don't repeat asked questions" prompt
      and the strict-JSON review parsing contract.
- [x] `InterviewSession` Mongoose model — `questionAttemptSchema` +
      `interviewSessionSchema`, `correctAnswer` required (see `adr/0001-...`).
- [x] Client: `api/interview.ts`, `hooks/useStartSession.ts`,
      `hooks/useSubmitAnswer.ts`, `hooks/useActiveSession.ts`.
- [x] `HomePage` resume card and `InterviewSessionPage` reload fallback wired
      to `useActiveSession`'s `enabled` flag so `/active` isn't polled
      speculatively.

## Open

- [ ] No automated test coverage for `interview.controller.ts` or
      `ai.service.ts` (no `tests/` convention exists yet for this feature —
      `npm run test` runs Vitest but this feature has no spec files).
- [ ] Not manually verified end-to-end against a live Mongo + `.env` session
      (per `.claude/rules/frontend/overview.md` — everything past the
      auth/AppShell work has only been checked via `tsc`/lint/build, not a
      running backend).
- [ ] No handling for a user with multiple stale `in_progress` sessions beyond
      "ignore the older ones" (see `PRD.md`'s explicit out-of-scope note) —
      revisit if this becomes a real support complaint.
- [ ] `openapi.yaml` in this folder is hand-written from the current code, not
      generated from a schema-validation library — if one gets adopted for
      this route group, regenerate this file from it instead of maintaining
      both by hand.