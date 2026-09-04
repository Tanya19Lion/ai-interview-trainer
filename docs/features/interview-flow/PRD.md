# PRD — Interview flow

**Phase:** BA/PO
**Status:** matches shipped behavior in `src/routes/interview.routes.ts`,
`src/controllers/interview.controller.ts` as of this writing.

## Users

Authenticated app users only — every route in this feature requires
`requireAuth` (see `.claude/rules/backend/auth.md`).

## Functional requirements

1. **Start a session.** User picks a `topic` (one of `TOPICS`) and a `level`
   (one of `LEVELS`). `POST /api/interview/start` creates a session and returns
   the first AI-generated question. Invalid topic/level → `400` naming the
   allowed values.
2. **Answer a question.** `POST /api/interview/:sessionId/answer` accepts the
   question text and the free-text answer, and returns an AI review
   (`score`, `feedback`, `correctAnswer`, `weakTopics`).
3. **Fixed-length session.** A session is exactly `QUESTIONS_PER_SESSION = 5`
   questions. On the 5th answer, the response includes `done: true` and the
   session's `averageScore`; the session is marked `completed` with a
   `completedAt` timestamp. Before that, the response includes the next
   AI-generated question and `done: false`.
4. **Resume an in-progress session.** `GET /api/interview/active` returns the
   caller's newest `in_progress` session with a freshly generated question
   (204 if none exists). This is what powers `HomePage`'s resume card and
   `InterviewSessionPage`'s reload fallback.
5. **No duplicate questions within a session.** The AI is prompted with the
   list of already-asked questions for that session and told not to repeat them
   (best-effort — not schema-enforced).

## Non-functional requirements

- Every answer's full AI review must be durably persisted, not just returned
  in the HTTP response — history/progress features and `ReviewModal` depend on
  reading it back later from the session document, not from the live response.
- Because `GET /api/interview/active` calls the AI service, clients must not
  poll it speculatively (see `useActiveSession`'s `enabled` flag).

## Explicitly out of scope

- Abandoning/cleaning up stale `in_progress` sessions when a user starts a new
  one without finishing an old one (currently: older ones are silently
  ignored, not auto-completed or deleted).
- Configurable session length (hardcoded to 5).