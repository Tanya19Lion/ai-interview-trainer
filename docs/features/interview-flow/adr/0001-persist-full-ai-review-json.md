# ADR 0001 — Always persist the full AI review JSON, including `correctAnswer`

**Phase:** Architect
**Status:** Accepted (retroactively documented)

## Context

`ai.service.ts`'s `reviewAnswer()` prompts the model to return
`{score, feedback, correctAnswer, weakTopics}` as strict JSON. Early in this
feature's history, `submitAnswer` in `interview.controller.ts` pushed only a
subset of those fields onto `session.questions[]` — `correctAnswer` was
computed by the AI on every call but dropped before the save, so it was
visible only transiently in the `SubmitAnswerResponse` during the live
session and unrecoverable afterward. This silently broke `ReviewModal`'s
diff rendering for any session answered before the fix, because history reads
`questions[]` back from the database, not from the original live response.

## Decision

`submitAnswer` persists **all four fields** from `AnswerReview` onto the
`questionAttemptSchema` sub-document on every save — `question`, `answer`,
`score`, `feedback`, `correctAnswer`, `weakTopics`. `correctAnswer` is marked
`required: true` on the schema specifically so a future regression that drops
it fails loudly (a missing required field throws on `session.save()`) instead
of silently succeeding with an incomplete document.

## Alternatives rejected

- **Compute `correctAnswer` on read, not on write.** Rejected — would require
  re-calling the AI service every time history/`ReviewModal` is viewed, which
  is slow, costs an API call per view, and isn't guaranteed to return the same
  answer twice.
- **Leave `correctAnswer` optional on the schema.** Rejected — an optional
  field would let the exact same regression reoccur without the app noticing
  (no failed `save()`, no error in logs) — the bug would only be visible as a
  quietly-blank field in `ReviewModal` weeks later.

## Consequences

- Any future change to `submitAnswer` or to `AnswerReview`'s shape must keep
  writing every field through to the sub-document — see
  `.claude/rules/backend/data-model.md` and `.claude/rules/backend/interview-flow.md`,
  which both call this out explicitly.
- `api-sync-report.md` in this folder is the check that would have caught the
  original regression before merge, had it existed at the time.