# Simplify pass — results

Full-tree review of `src/` (backend) and `client/` (frontend), since git was clean and there was
no diff to review. Four parallel review agents (reuse, simplification, efficiency, altitude)
scanned the whole codebase; findings were deduped and the safe, behavior-preserving ones were
applied below. Lint, unit tests, and the build/typecheck pass on both sides after the changes
(details at the bottom).

## Changes applied

### Client (`client/`)

1. **`client/src/lib/levelLabel.ts` (new file)**
   Before: `const LEVEL_LABEL: Record<Level, string> = { junior: 'Junior', middle: 'Middle', senior: 'Senior' }` was copy-pasted verbatim in `HistoryTable.tsx`, `HistoryPage.tsx`, `HomePage.tsx`, and `LandingPage.tsx`, and restated a fourth time (with a color) inside `ProgressPage.tsx`'s `LEVEL_META`.
   After: one shared `LEVEL_LABEL` export, mirroring the existing `client/src/lib/topicLabel.ts` (`TOPIC_LABEL`) pattern; all four pages/components import it, and `ProgressPage`'s `LEVEL_META` now reads `label: LEVEL_LABEL.junior` etc. instead of restating the strings.
   Why simpler: one source of truth for the level display text — a new level or a label tweak now needs one edit, not five.

2. **`client/src/lib/formatCompletedAt.ts` (new file)**
   Before: `session.completedAt ? new Date(session.completedAt).toLocaleDateString('uk-UA') : '—'` was duplicated identically in `HistoryTable.tsx` and `HomePage.tsx`.
   After: a single `formatCompletedAt(completedAt)` helper used by both.
   Why simpler: removes copy-pasted date-formatting/fallback logic; any future locale or fallback change happens in one place.

3. **`client/src/hooks/useFakeSubmit.ts` (new file)**
   Before: `ResetPasswordPage.tsx`'s `RequestEmailView` and `NewPasswordView` each hand-rolled the same `useState(pending)` + `setTimeout(FAKE_DELAY_MS)` "fake submit" flow.
   After: a shared `useFakeSubmit()` hook returning `{pending, run(onDone)}`, used by both views.
   Why simpler: removes a duplicated state-machine shape; each view now only holds the state specific to it (email vs. password fields), not the shared pending/timeout bookkeeping. (This page remains a UI-only mock per existing project notes — only the duplication was addressed, not the mock itself.)

4. **`client/src/api/client.ts`**
   Before: `apiFetch`'s error path only read `body.error ?? res.statusText`, silently discarding the server's newer `{code, message}` error shape (most auth/password-reset error responses) and falling back to a generic string like "Unauthorized" instead of the real message.
   After: `body.message ?? body.error ?? res.statusText` — understands both response shapes in the one place that owns HTTP error parsing.
   Why simpler/more correct-by-construction: avoids a future per-call-site special case ("read `.code` here, `.error` there") by generalizing the one shared parser instead.

### Server (`src/`)

5. **`src/controllers/auth.controller.ts`**
   Before: cookie options (`httpOnly`/`sameSite`/`secure`/`maxAge`) and the `JWT_EXPIRES_IN` env-parsing were hand-copied at three call sites (`issueSession`'s `token` cookie, its `refreshToken` cookie, and `refreshSession`'s `token` cookie), each needing its own inline comment to explain persistence rules. The `{id, email, name, avatarUrl}` user JSON shape was also duplicated between `issueSession` and `me`.
   After: extracted `authCookieOptions(persistent)`, `accessTokenExpiresIn()`, and `toAuthUserPayload(user)` helpers; all three cookie-setting call sites and both JSON-response call sites now go through them.
   Why simpler: the cookie contract and the auth-user shape each live in exactly one place, so they can't drift out of sync by hand — matches the project's own `auth.md` rule that `issueSession` exists specifically so "the cookie/JWT logic exists in exactly one place."

6. **`src/controllers/interview.controller.ts`** (`startSession`)
   Before: `await InterviewSessionModel.create(...)` then `await generateQuestion(...)` ran sequentially even though neither depends on the other's result.
   After: `const [session, { question }] = await Promise.all([InterviewSessionModel.create(...), generateQuestion(...)])`.
   Why more efficient: the slow AI call and the DB write now overlap instead of serializing a fast write behind (or in front of) a slow network call.

7. **`src/controllers/history.controller.ts`** (`getHistory`)
   Before: `InterviewSessionModel.find(filter)` fetched full documents, including every embedded `questions[]` entry (answer/feedback/correctAnswer text), just to return 5 scalar fields per session.
   After: `.select('topic level averageScore completedAt')` added to the query.
   Why more efficient: avoids transferring and discarding every question's AI-generated text for every session in the list.

8. **`src/controllers/stats.controller.ts`** (`getStats`)
   Before: same over-fetch pattern — full session documents pulled just to read `topic`, `questions[].score`, and `completedAt`.
   After: `.select('topic completedAt questions.score')` added to the query.
   Why more efficient: same reasoning as #7, scoped to only the fields the aggregation loop actually reads.

## Findings reviewed but skipped (with reason)

- **`src/services/passwordReset.service.ts`'s `unregisteredEmailAttempts` Map** — flagged by both the efficiency and altitude agents (unbounded per-email growth over long uptime; also reimplements the rate-limiting the app already does elsewhere via a Mongo-persisted counter). A real fix means either a periodic sweep across all keys or moving this onto a persisted rate-limit model — both are behavior/architecture changes beyond a safe "simplify" edit, and the persisted-model route would need a `docs/data-model.md` schema-change log entry per this repo's migration rules. Skipped as out of scope; left a paper trail here instead of a silent skip.
- **`client/src/components/HistoryTable/HistoryTable.tsx`'s hardcoded `passed = averageScore >= 7`** — altitude agent suggested deriving this from the shared `scoreTone()` (good ≥8, mid ≥5) instead of a second, competing threshold. Skipped: `scoreTone`'s mid/good boundary (≥5) differs from the current pass/fail cutoff (≥7), so applying it would visibly change which sessions show "схвалено" vs. "повторити" — a behavior change, not a pure refactor.
- **`client/src/pages/InterviewSessionPage.tsx`'s reload-bootstrap state machine** — altitude agent suggested extracting it into a `useSessionBootstrap` hook. Skipped: real behavior-preserving extraction of this state machine (refs, conditional query enabling, eslint-disabled deps) is a large enough change to risk regressing the reload-fallback flow, which per project notes hasn't been manually verified against a live backend yet.
- **`AnswerReview`/`CurrentReview`/`SessionResult` type triplication** (`src/services/ai.service.ts`, `InterviewSessionPage.tsx`, `SessionSummary.tsx`) — flagged by the simplification agent, which itself noted no single change fixes it without crossing the client/server type boundary this project deliberately keeps separate (`CLAUDE.md`: "no shared package"). Skipped as a false positive under this project's own convention.
- **`LandingPage.tsx`'s local `Heatmap`/`HistoryTable`-shaped markup duplication** — already tracked in `.claude/rules/frontend/components.md` as a known, deliberate duplication pending i18n support on the shared components; not a new finding, no action taken.
- **Auth controllers' inline "two required non-empty strings" checks** (`register`, `login`, `changePassword`) — reuse agent flagged as a minor/optional candidate for a shared `requireStrings()` helper, but called out low value itself given only 2-3 call sites. Skipped as not worth the added indirection.

## Verification

- Backend: `npm run lint` (repo root) — 0 errors, 1 pre-existing unrelated warning (`passwordReset.service.test.ts`, unused `email` var — not touched by this pass).
- Backend: `npm run test` (repo root) — 7 test files, **63 passed**.
- Backend: `npm run build` (`tsc`) — passes with no errors.
- Client: `npm run lint` (`client/`, oxlint) — passes with no errors.
- Client: `npm run test` (`client/`, vitest) — 4 test files, **15 passed**.
- Client: `npm run build` (`client/`, `tsc -b && vite build`) — passes with no errors.

All changes are left uncommitted in the working tree.
