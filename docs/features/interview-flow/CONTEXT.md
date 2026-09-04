# CONTEXT — Interview flow

**Phase:** Docs+Deploy
**Purpose:** feature-level "how to pick this back up," the same role
`PROGRESS.md` plays for the whole repo, scoped to just this feature.

## Where things stand

The full session lifecycle (start → up to 5 AI-scored answers → completion)
is implemented end-to-end on both server and client, and matches everything
recorded in `PRD.md` and `SAD.md` in this folder. The one historical bug on
this feature (`correctAnswer` silently dropped before persistence) is fixed
and guarded by a `required: true` schema field — see `adr/0001-...`.

## What's not yet verified

Per `.claude/rules/frontend/overview.md`, nothing behind auth — including
this entire feature — has been exercised against a live Mongo + `.env`
backend since the auth/AppShell work landed. Only `tsc`/lint/build and
`RequireAuth`'s redirect behavior have been confirmed. Before trusting this
feature in a demo or handing it to QA, someone needs to actually run a full
session against real Mongo + a real `ANTHROPIC_API_KEY` and watch:

- the 5-question loop actually terminates and computes `averageScore`
  correctly,
- a hard reload mid-session correctly resumes via `GET /active` (note: the
  resumed question will *not* be byte-identical to whatever was on screen,
  since it's freshly generated — that's expected, not a bug),
- `ReviewModal` renders `correctAnswer` for a session answered end-to-end
  through the real API, not just from mocked data.

## Where to look next

- If a review/score looks wrong: the prompt/response-shape contract lives
  entirely in `ai.service.ts` — start there, per
  `.claude/rules/backend/interview-flow.md`.
- If client and server disagree about a field: re-run
  `api-sync-report.md` in this folder before assuming it's a new bug —
  it documents the exact set of fields that must stay aligned by hand.
- If adding a new `topic` or `level` value: update `TOPICS`/`LEVELS` in both
  `src/models/InterviewSession.ts` and `client/src/types/interview.ts` (there
  is a git hook, `plugins/sync-domain-enums-guard/`, that blocks a commit
  if these drift — see repo-root `MEMORY.md`/`.husky/pre-commit`).