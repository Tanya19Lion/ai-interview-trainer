---
paths:
  - "src/models/**/*"
---

# Data model

- `models/User.ts`, `models/InterviewSession.ts` — `InterviewSession` embeds a `questions`
  array of `{question, answer, score, feedback, correctAnswer, weakTopics}` sub-documents plus
  `topic`/`level`/`status`/`averageScore`; `TOPICS`/`LEVELS` enums are duplicated (not imported)
  in `client/src/types/interview.ts` (see `.claude/rules/frontend/api-and-hooks.md`) — keep both
  lists in sync by hand when adding a topic/level.
- `correctAnswer` on `questionAttemptSchema` is required and was added alongside the History
  ReviewModal work: `reviewAnswer()` in `ai.service.ts` always computed it, but
  `submitAnswer` originally dropped it before the `session.questions.push(...)` write, so it was
  unrecoverable once a session was saved (only visible transiently in the `SubmitAnswerResponse`
  during the live interview). If you touch `submitAnswer`, keep persisting this field — dropping
  it silently breaks `ReviewModal`'s diff card, not anything that fails loudly.
