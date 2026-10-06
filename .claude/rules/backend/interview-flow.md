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
  `parseAnswerReview` also checks the parsed shape (`score` a number in 0-10, string `feedback`, a
  non-empty string `correctAnswer`, string-array `weakTopics`) and throws before anything is saved,
  mirroring `questionAttemptSchema` — keep the two in step.
  All four fields of that JSON, including `correctAnswer`, are persisted onto the session's
  `questions[]` sub-document in `submitAnswer` (see `.claude/rules/backend/data-model.md`) — don't
  reintroduce a controller that only saves a subset of them.
- **Session language**: `POST /api/interview/start` accepts `lang` (`'uk' | 'en'`; omitted → `uk`,
  anything else → 400 `lang must be one of: uk, en`) and stores it in `InterviewSession.lang`.
  `submitAnswer` and `getActiveSession` read `session.lang ?? 'uk'` (never the request, so a UI
  language switch mid-interview doesn't change the session; sessions created before the field
  existed stay Ukrainian). All three AI functions (`generateQuestion`, `answerQuestion`,
  `reviewAnswer`) take `lang` as a required last parameter — the only `'uk'` default lives in the
  controller (`DEFAULT_LANG`). Keep `reviewAnswer`'s JSON keys English; only the values follow `lang`.
- **Skip ("Не знаю")**: the client sends `answer: ''`. `submitAnswer` treats a blank (trimmed) answer
  as skipped: it calls `answerQuestion()` (plain-text model answer, no JSON review) instead of
  `reviewAnswer()`, stores the entry with `answer: ''`, `feedback: ''`, `score: 0`, and computes
  `averageScore` (and `GET /api/stats`) only over entries with `answer !== ''`. Keep those two
  filters in sync — a skipped `score: 0` would otherwise drag both numbers down.
- `GET /api/interview/active` (`getActiveSession`) returns the newest `status: 'in_progress'`
  session for the user (204 if none) together with the question it is waiting for. That question
  is stored on the session as `currentQuestion` (set by `startSession` and `submitAnswer`, cleared
  on completion), so a reload shows the same question and costs no AI call. Only a session created
  before the field existed has none: the handler generates one question, saves it, and later calls
  return the saved one. If multiple `in_progress` sessions exist for a user (e.g. they started a
  new one without finishing an old one), older ones are silently ignored, not auto-abandoned. Both
  client consumers (`HomePage`'s resume card, `InterviewSessionPage`'s reload fallback for an
  `in_progress` session found via `GET /api/history/:id`) still only call it when they actually
  need the question, via `hooks/useActiveSession.ts`'s `enabled` arg (see
  `.claude/rules/frontend/api-and-hooks.md`).
- **Limits**: `POST /start` and `POST /:sessionId/answer` share one per-user counter
  (`userRateLimit('ai', 40)` in `interview.routes.ts`, 40 per 15 min, stored in `IpAttempt` under
  `ai:<userId>`) and answer 429 `ai.rate_limited` beyond it; `GET /active` is not counted because it
  makes no AI call for a session that has a `currentQuestion`. `startSession` also deletes the user's
  older `in_progress` sessions once the new one is created, so there is at most one active session.
- **Input validation**: `submitAnswer` requires string `question` (non-empty, ≤ 1000 chars) and
  string `answer` (may be empty = skip, ≤ 4000 chars) — anything else is a 400 before the database
  or the model is touched. When the session has a `currentQuestion`, a different `question` is a
  400, so the endpoint can't be used to grade or answer arbitrary text; a legacy session without
  it accepts the request's `question`. In `ai.service.ts` the question and answer are wrapped in
  `<question>`/`<answer>` tags and the system prompt says their content is data, not instructions
  — keep both when changing a prompt.
