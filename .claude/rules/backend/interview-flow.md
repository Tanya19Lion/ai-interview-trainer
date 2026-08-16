---
paths:
  - "src/routes/interview.routes.ts"
  - "src/controllers/interview.controller.ts"
  - "src/services/ai.service.ts"
---

# Interview flow

- All routes require auth. `POST /api/interview/start` and
  `POST /api/interview/:sessionId/answer` drive the session; `ai.service.ts` calls the real
  Anthropic API (`@anthropic-ai/sdk`, model `claude-sonnet-4-5`) to generate questions and to
  score/review free-text answers, returning strict JSON (`{score, feedback, correctAnswer,
  weakTopics}`) that the model is prompted to produce without markdown fencing — if that parsing
  ever breaks, the prompt/response-shape contract in `ai.service.ts` is the first place to look.
  All four fields of that JSON, including `correctAnswer`, are persisted onto the session's
  `questions[]` sub-document in `submitAnswer` (see `.claude/rules/backend/data-model.md`) — don't
  reintroduce a controller that only saves a subset of them.
- `GET /api/interview/active` (`getActiveSession`) returns the newest `status: 'in_progress'`
  session for the user (204 if none). The in-flight question text is never persisted on the
  session document (only answered `questions[]` entries are), so this handler re-generates a
  question via `generateQuestion(topic, level, askedQuestions)` — a reload/resume will show a
  freshly generated question, not necessarily byte-identical to whatever was on screen before the
  reload. If multiple `in_progress` sessions exist for a user (e.g. they started a new one without
  finishing an old one), older ones are silently ignored, not auto-abandoned. Because it calls the
  AI service, it's not free to call speculatively — both client consumers
  (`HomePage`'s resume card, `InterviewSessionPage`'s reload fallback for an `in_progress` session
  found via `GET /api/history/:id`) only call it when they actually need a live question, via
  `hooks/useActiveSession.ts`'s `enabled` arg (see `.claude/rules/frontend/api-and-hooks.md`).
