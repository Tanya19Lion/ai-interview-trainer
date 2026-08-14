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
  pagination yet (accepted as YAGNI while session counts are small).
- `GET /api/history/:id` (`getSessionDetail`) is the one detail endpoint for **both** "resume an
  in-progress session" and "review a completed one" — unlike the list endpoint, it does not
  filter by `status` and always returns the full `questions[]`. Callers (`InterviewSessionPage`
  reload fallback, `ReviewModal`) branch on the `status` field in the response rather than
  hitting different endpoints. Returns 404 (not 403) for another user's session id, to avoid
  confirming the id exists.
- `GET /api/stats` computes `streakDays` from the UTC calendar dates of `completedAt` across all
  completed sessions: the longest run of consecutive UTC days that includes today or yesterday
  (otherwise `0`). It intentionally ignores the client's timezone — if that ever needs to be
  timezone-aware, the fix belongs in `computeStreakDays`/`toUtcDayNumber` in
  `stats.controller.ts`, not in the client.