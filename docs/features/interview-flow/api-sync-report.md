# API sync report — Interview flow

**Phase:** Review (the gate a PR reviewer should re-check before approving any
change to either side of this contract)
**Method:** manual field-by-field diff — there is no shared types package and
no runtime schema validator between `src/models/InterviewSession.ts` /
`src/controllers/interview.controller.ts` and `client/src/types/interview.ts`
(see `docs/adr/0001-initial-setup.md`), so this report has to be regenerated
by hand whenever either side changes. Treat a stale report the same as a
missing one — see `.claude/skills/sdlc-audit/SKILL.md`'s staleness criteria.

**Last checked:** re-derive by reading both files side by side; do not trust
this date once either file's git history moves past it.

## Enums

| Enum | Server (`src/models/InterviewSession.ts`) | Client (`client/src/types/interview.ts`) | In sync? |
|------|---------------------------------------------|--------------------------------------------|----------|
| `TOPICS` | `react, javascript, nodejs, typescript, nextjs, css, html, sql, restapi` | same 9 values, same order | ✅ |
| `LEVELS` | `junior, middle, senior` | same 3 values, same order | ✅ |

## Request/response shapes

| Wire shape | Server (controller literal) | Client type | In sync? |
|------------|------------------------------|--------------|----------|
| `POST /start` request | `{ topic, level }` (`interview.controller.ts:9`) | `StartSessionRequest` | ✅ |
| `POST /start` response | `{ sessionId, questionIndex, totalQuestions, question }` (`:28-33`) | `StartSessionResponse` | ✅ |
| `GET /active` response | `{ sessionId, topic, level, questionIndex, totalQuestions, question }` (`:50-57`) | `ActiveSessionResponse` | ✅ |
| `POST /:id/answer` request | `{ question, answer }` (`:62`) | `SubmitAnswerRequest` | ✅ |
| `POST /:id/answer` response (`done: true`) | `{ review, done, averageScore }` (`:93-97`) | `SubmitAnswerResponse` (`averageScore` optional) | ✅ |
| `POST /:id/answer` response (`done: false`) | `{ review, done, questionIndex, totalQuestions, question }` (`:110-116`) | `SubmitAnswerResponse` (those 3 optional) | ✅ |
| AI review object | `AnswerReview` in `ai.service.ts` (`score, feedback, correctAnswer, weakTopics`) | `AnswerReview` in `types/interview.ts` | ✅ |
| Persisted question attempt | `questionAttemptSchema` (`question, answer, score, feedback, correctAnswer, weakTopics`) | `QuestionAttempt` | ✅ |

## Finding

All fields currently line up. This is the state that was **not** true for one
release: `correctAnswer` was computed server-side and typed on the client, but
silently dropped before persistence — see
`adr/0001-persist-full-ai-review-json.md`. A report like this one, run at PR
time, would have caught that drop immediately (client expects `correctAnswer`
on every stored `QuestionAttempt`; the server was writing sessions without it).

## How to re-run this check

1. Open `src/models/InterviewSession.ts` + the response literals in
   `src/controllers/interview.controller.ts` side by side with
   `client/src/types/interview.ts`.
2. Diff field names, optionality, and enum membership — not just types, since
   `string` on one side can hide an enum mismatch on the other.
3. Update the tables above and the "Last checked" note.