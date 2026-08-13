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
