# Software Architecture Document — Interview flow

**Phase:** Architect
**Consistency check:** should stay aligned with the repo-wide `ARCHITECTURE.md`
layered pattern (`routes → controllers → services → models`) — this document
only adds feature-specific detail on top of that.

## Component map

| Layer | File | Responsibility |
|-------|------|-----------------|
| Route | `src/routes/interview.routes.ts` | Mounts `requireAuth`, wires 3 endpoints to controller functions |
| Controller | `src/controllers/interview.controller.ts` | Request validation, session lifecycle (start/resume/complete), orchestrates service + model calls |
| Service | `src/services/ai.service.ts` | Wraps `@anthropic-ai/sdk` (`claude-sonnet-4-5`); `generateQuestion` and `reviewAnswer`, both parse the model's text response (`generateQuestion` as plain text, `reviewAnswer` as strict JSON) |
| Model | `src/models/InterviewSession.ts` | Mongoose schema: session + embedded `questions[]` sub-documents |

Client side (consumer, not owner of this contract):

| Layer | File |
|-------|------|
| API | `client/src/api/interview.ts` |
| Hooks | `client/src/hooks/useStartSession.ts`, `useSubmitAnswer.ts`, `useActiveSession.ts` |
| Types | `client/src/types/interview.ts` |

## Key architectural decisions

- **No shared types package.** Client and server each define `TOPICS`/`LEVELS`
  and the request/response shapes independently (`client/src/types/interview.ts`
  vs. `src/models/InterviewSession.ts` + inline controller types). This is a
  deliberate, documented tradeoff (see `docs/adr/0001-initial-setup.md`), not an
  oversight — but it's exactly the boundary `api-sync-report.md` in this folder
  exists to keep honest.
- **AI response shape is a contract, not just a type.** `reviewAnswer()` prompts
  the model to return JSON matching `AnswerReview` and parses it with
  `JSON.parse` — there's no schema validation library in the loop. If the model
  ever wraps its response in markdown fencing or omits a field, this throws or
  silently produces `undefined` fields. See `docs/adr/` in this folder for the
  decision to always persist all 4 fields once parsed.
- **Sessions are stateful, questions are not.** The in-flight (unanswered)
  question is never persisted — only answered `questions[]` entries are. This
  keeps the schema simple but means `GET /api/interview/active` must call the
  AI service again on every resume, rather than replaying stored state.

## Out of scope for this document

History/stats endpoints (`GET /api/history`, `GET /api/stats`) consume
`InterviewSession` documents but are architected and owned separately — see
`.claude/rules/backend/history-and-stats.md`.