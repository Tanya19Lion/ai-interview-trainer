---
paths:
  - "src/routes/history.routes.ts"
  - "src/controllers/history.controller.ts"
  - "src/routes/stats.routes.ts"
  - "src/controllers/stats.controller.ts"
---

# History and stats

- `GET /api/history` lists only `status: 'completed'` sessions (optionally filtered by `topic`/
  `level` query params), without `questions[]` — a lightweight list for tables/cards. No
  pagination yet (accepted as YAGNI while session counts are small). Consumed on the client by
  `HomePage` (unfiltered, last 5) and `HistoryPage` (filtered by the topic/level chip state,
  full list) via `hooks/useHistory.ts` → `getHistory` in `client/src/api/interview.ts`.
- `GET /api/history/:id` (`getSessionDetail`) is the one detail endpoint for **both** "resume an
  in-progress session" and "review a completed one" — unlike the list endpoint, it does not
  filter by `status` and always returns the full `questions[]`. Callers (`InterviewSessionPage`'s
  reload fallback; `ReviewModal`, both via `hooks/useSessionDetail.ts`) branch on the `status`
  field in the response rather than hitting different endpoints. Returns 404 (not 403) for
  another user's session id, to avoid confirming the id exists — `InterviewSessionPage`'s reload
  fallback relies on that 404 to fall through to its "session unavailable" state instead of
  leaking whether a stale/foreign id exists.
- `GET /api/stats` computes `streakDays` from the UTC calendar dates of `completedAt` across all
  completed sessions: the longest run of consecutive UTC days that includes today or yesterday
  (otherwise `0`). It intentionally ignores the client's timezone — if that ever needs to be
  timezone-aware, the fix belongs in `computeStreakDays`/`toUtcDayNumber` in
  `stats.controller.ts`, not in the client. Consumed on the client by `HomePage`'s and
  `ProgressPage`'s badge rows (`hooks/useStats.ts` → `getStats` in `client/src/api/stats.ts`).
  `byTopic` entries are `{topic, accuracy, count}` — `count` (answered-question count for that
  topic) was added specifically for `ProgressPage`'s recommendation cards ("N спроб"); don't drop
  it if you touch the `byTopic` mapping, it's a real consumer, not speculative.
- `GET /api/history` and `GET /api/stats` have no server-side aggregates for a contribution
  heatmap, a score trend over time, or a level-distribution breakdown — `ProgressPage` computes
  all three client-side from the unfiltered `GET /api/history` response (`completedAt` per
  session for the heatmap/trend, `level` per session for the distribution). If a future screen
  needs the same aggregates, prefer adding them here over duplicating the client-side math a
  second time.