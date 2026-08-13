---
paths:
  - "src/models/**/*"
---

# Data model

- `models/User.ts`, `models/InterviewSession.ts` — `InterviewSession` embeds a `questions`
  array of `{question, answer, score, feedback, weakTopics}` sub-documents plus
  `topic`/`level`/`status`/`averageScore`; `TOPICS`/`LEVELS` enums are duplicated (not imported)
  in `client/src/types/interview.ts` (see `.claude/rules/frontend/api-and-hooks.md`) — keep both
  lists in sync by hand when adding a topic/level.
