---
paths:
  - "client/src/api/**/*"
  - "client/src/hooks/**/*"
  - "client/src/types/**/*"
---

# API layer and hooks

- **`client/src/api/`** — thin fetch layer: `client.ts` (`apiFetch`, `credentials: 'include'` so
  the auth cookie is sent, throws `ApiError` on non-2xx), `auth.ts`, `interview.ts` (also holds
  `getHistory`, alongside session start/answer/active/detail — history is interview-domain data,
  it doesn't get its own `api/history.ts`), `stats.ts` (`getStats`, mirrors
  `.claude/rules/backend/history-and-stats.md`'s `GET /api/stats`). Request/response shapes are
  typed in `client/src/types/interview.ts` (+ `types/stats.ts` for the stats response), which
  mirror (but do not import) the server's Mongoose schema shapes — update both sides together
  (see `.claude/rules/backend/data-model.md`).
- `apiFetch` special-cases `204 No Content` (returns `undefined` instead of calling `res.json()`)
  — `Response.ok` is `true` for 204, and parsing an empty body as JSON throws, so any endpoint
  that can reply 204 (e.g. `GET /interview/active` when there's no active session, see
  `.claude/rules/backend/interview-flow.md`) must type its client-side return as `T | undefined`
  and narrow it explicitly (see `getActiveSession` in `interview.ts`).
- **`client/src/hooks/`** — TanStack Query wrappers per concern (`useAuth.ts`,
  `useStartSession.ts`, `useSubmitAnswer.ts`, `useActiveSession.ts` (takes an optional `enabled`
  arg, default `true` — `HomePage` calls it unconditionally, `InterviewSessionPage`'s reload
  fallback passes `false` until it actually needs the live question, since the endpoint behind it
  re-generates a question via the AI service and shouldn't fire on every normal page load),
  `useHistory.ts` (takes an optional `HistoryFilters` and includes it in the query key, so
  `HomePage`'s unfiltered call and `HistoryPage`'s filtered one are cached separately),
  `useSessionDetail.ts` (`enabled: id !== null`; consumed by both `ReviewModal` and
  `InterviewSessionPage`'s reload fallback), `useStats.ts`); prefer adding a hook here over
  calling `api/` functions directly from components.
- **`client/src/lib/topicLabel.ts`** — `TOPIC_LABEL: Record<Topic, string>`, the shared
  display-text map for topics whose enum value doesn't match its display form (`nodejs` →
  `"node.js"`, `nextjs` → `"next.js"`); used anywhere a `Topic` is printed outside `TopicPicker`
  (which has its own richer `TOPIC_META` with tag/description, not reused here).
- `types/stats.ts`'s `TopicAccuracy` is `{topic, accuracy, count}` — `count` is the number of
  answered questions for that topic, added for `ProgressPage`'s recommendation cards; don't strip
  it back down to `{topic, accuracy}`, `ProgressPage` reads it.
- `ProgressPage` doesn't have its own hook beyond `useHistory()`/`useStats()` — the heatmap/trend/
  level-distribution math is computed inline in the page (and inside `components/Heatmap/
  Heatmap.tsx` for the heatmap specifically) from the unfiltered history response, not fetched
  from a dedicated endpoint (none exists — see `.claude/rules/backend/history-and-stats.md`).
