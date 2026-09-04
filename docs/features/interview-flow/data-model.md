# Data model — Interview flow

**Phase:** Architect
**Source of truth:** `src/models/InterviewSession.ts` (this document must be
re-checked against that file — it does not replace it).

## Enums

```ts
TOPICS = ['react', 'javascript', 'nodejs', 'typescript', 'nextjs', 'css', 'html', 'sql', 'restapi']
LEVELS = ['junior', 'middle', 'senior']
```

Duplicated by hand (not imported) in `client/src/types/interview.ts` — see
`api-sync-report.md` in this folder for current sync status.

## `questionAttemptSchema` (embedded, `_id: false`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `question` | `String` | yes | |
| `answer` | `String` | yes | |
| `score` | `Number` | yes | `min: 0, max: 10` |
| `feedback` | `String` | yes | |
| `correctAnswer` | `String` | yes | See `adr/0001-persist-full-ai-review-json.md` — required specifically so a future regression fails loudly |
| `weakTopics` | `[String]` | no | `default: []` |

## `interviewSessionSchema`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | `ObjectId` (ref `User`) | yes | |
| `topic` | `String` (enum `TOPICS`) | yes | |
| `level` | `String` (enum `LEVELS`) | yes | |
| `questions` | `[questionAttemptSchema]` | no | `default: []`; grows to exactly 5 entries over a completed session |
| `averageScore` | `Number` | no | Set once, when the session completes: mean of `questions[].score` |
| `status` | `String` (enum `'in_progress' \| 'completed'`) | no | `default: 'in_progress'` |
| `completedAt` | `Date` | no | Set alongside `status: 'completed'` |
| `createdAt` / `updatedAt` | `Date` | — | `timestamps: true` |

## What is deliberately *not* modeled

- The in-flight (unanswered) question text — never persisted; see SAD.md.
- Per-question timestamps — only session-level `createdAt`/`updatedAt`/`completedAt` exist.