# STATUS — Interview flow

**Purpose:** feature-level "how to pick this back up," the same role `PROGRESS.md` plays for the
whole repo, scoped to just this feature. (Domain vocabulary for this feature lives separately in
`CONTEXT.md`'s `## Glossary`.)

## Where things stand

The full session lifecycle (start → up to 5 AI-scored answers → completion) is implemented
end-to-end on both server and client, and matches everything recorded in `PRD.md` and `SAD.md` in
this folder. The historical bug on this feature (`correctAnswer` silently dropped before
persistence) is fixed and guarded by a `required: true` schema field — see `adr/0001-...`.

**Fixed via code review (2026-09-16), uncommitted at time of writing:**
- `submitAnswer` (`interview.controller.ts`) rejected an empty-string `answer` with 400, but the
  client's "skip" affordance (`AnswerForm`'s "Не знаю" button) submits `answer: ''` by convention
  — skip was completely non-functional end-to-end. Fixed by only requiring `answer !== undefined`.
- No route handler caught errors and `src/index.ts` had no error-handling middleware, so an AI
  failure or bad JSON from the model left the client request hanging. Added
  `src/middleware/errorHandler.ts`, mounted last in `src/index.ts`. This is also why `express` was
  bumped `^4.21.2` → `^5.2.1` in the same session (`@types/express` was already on `^5.0.0`,
  no breaking route patterns found in this repo) — Express 5 forwards a rejected promise from an
  `async` handler to that middleware automatically, which Express 4 did not do.
- `reviewAnswer` and the next `generateQuestion` call in `submitAnswer` were awaited sequentially
  despite being independent; now run via `Promise.all`, roughly halving the wait for the next
  question.
- `QuestionCard`/`FeedbackCard`/`SessionSummary` printed the raw `Topic` enum value instead of
  going through `client/src/lib/topicLabel.ts`'s `TOPIC_LABEL` map (already used by
  `HistoryTable`/`HomePage`/`ReviewModal`/`ProgressPage`) — now consistent everywhere.

## What's not yet verified

Per `.claude/rules/frontend/overview.md`, nothing behind auth — including this entire feature —
has been exercised against a live Mongo + `.env` backend since the auth/AppShell work landed. Only
`tsc`/lint/build and `RequireAuth`'s redirect behavior have been confirmed. Before trusting this
feature in a demo or handing it to QA, someone needs to actually run a full session against real
Mongo + a real `ANTHROPIC_API_KEY` and watch:

- the 5-question loop actually terminates and computes `averageScore` correctly,
- a hard reload mid-session correctly resumes via `GET /active` (note: the resumed question will
  *not* be byte-identical to whatever was on screen, since it's freshly generated — that's
  expected, not a bug),
- `ReviewModal` renders `correctAnswer` for a session answered end-to-end through the real API,
  not just from mocked data.

## Where to look next

- If a review/score looks wrong: the prompt/response-shape contract lives entirely in
  `ai.service.ts` — start there, per `.claude/rules/backend/interview-flow.md`.
- If client and server disagree about a field: re-run `api-sync-report.md` in this folder before
  assuming it's a new bug — it documents the exact set of fields that must stay aligned by hand.
- If adding a new `topic` or `level` value: update `TOPICS`/`LEVELS` in both
  `src/models/InterviewSession.ts` and `client/src/types/interview.ts` (there is a git hook,
  `plugins/sync-domain-enums-guard/`, that blocks a commit if these drift — see repo-root
  `MEMORY.md`/`.husky/pre-commit`).
