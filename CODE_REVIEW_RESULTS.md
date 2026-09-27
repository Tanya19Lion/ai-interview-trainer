# Code Review Results — Full Repository (src/ + client/)

**Date:** 2026-09-27
**Scope:** Full working tree (backend `src/`, frontend `client/src/`), read-only review — no fixes or PR comments applied.
**Method:** 8 finder angles (3x correctness, reuse, simplification, efficiency, altitude, conventions) run at high effort, with every high-value candidate manually re-verified against source before inclusion. Several initial subagent claims were checked and refuted (see "Refuted findings" below) rather than included.

## Summary

Eight findings survived verification, ranging from a real session-invalidation bug and a routing/auth contract violation, down to documentation and duplication issues. The most severe issue is in `changePassword` (backend): it bumps `tokenVersion` but never reissues the session cookie, so a user who successfully changes their password is immediately and silently logged out on their next request. The second issue is a frontend routing bug where unauthenticated users are redirected to the landing page instead of `/login`, contradicting the repo's own documented `RequireAuth` behavior and losing the post-login deep-link redirect. The remainder are lower-severity: a missing-validation gap before persisting AI-generated review data, inconsistent rate-limiting coverage across auth routes, a schema-layer business-rule default that violates this repo's own migration rules and is also dead code, missing `docs/data-model.md` log entries for three shipped schema changes, and one case of duplicated UTC-day-bucketing logic between server and client that risks silent drift.

No source files were modified as part of this review.

---

## Findings

### 1. [High] Password change invalidates the user's own session without reissuing a cookie
- **File:** `src/controllers/auth.controller.ts:283` (see also the `$inc: tokenVersion` at line 220, and `requireAuth`'s check in `src/middleware/auth.ts:41-44`)
- **Issue:** `changePassword` increments `tokenVersion` via `applyPasswordReset()` but responds with only `{message: 'Password updated.'}` — it never calls `issueSession()` or otherwise sets a new token cookie.
- **Impact:** The user's very next authenticated request (e.g. `GET /api/auth/me`) is rejected with 401 `auth.session_revoked` by `requireAuth`'s `hasValidTokenVersion` check. The user is logged out immediately after a successful password change, with no messaging explaining why.

### 2. [High] `RequireAuth` redirects to `/` instead of `/login`, contradicting documented behavior and losing the deep link
- **File:** `client/src/RequireAuth.tsx:16`
- **Issue:** On no-session, the component does `<Navigate to="/" replace state={{ from: location }} />`. The repo's own `.claude/rules/frontend/routing-and-auth.md` documents that on error/no-session it should `<Navigate to="/login" state={{from: location}}>` so `LoginPage` can redirect back to the originally-requested route.
- **Impact:** A logged-out user opening a direct link (e.g. to `/history`) lands on the public marketing `LandingPage`, which never reads `location.state.from`. The deep link and the post-login redirect are silently lost.

### 3. [Medium] AI-generated answer review is JSON-parsed but never schema-validated before persistence
- **File:** `src/services/ai.service.ts:73`
- **Issue:** `parseAnswerReview` does `JSON.parse(cleaned) as AnswerReview` with no check that `score` is a Number in [0, 10] or that `feedback`/`correctAnswer` are present, even though `questionAttemptSchema` (`src/models/InterviewSession.ts:10`) requires exactly that shape.
- **Impact:** If the model ever returns an out-of-range score or a missing field, `submitAnswer`'s subsequent `session.save()` throws a Mongoose validation error, causing a 500 and discarding the already-scored answer (and the already-billed AI call) instead of degrading gracefully.

### 4. [Medium] `/register` and `/google` have no rate limiting while `/login` does
- **File:** `src/routes/auth.routes.ts:9` (and surrounding lines 8-9)
- **Issue:** `loginRateLimit` is mounted only on `POST /login`; `POST /register` and `POST /google` run with no throttling middleware at all.
- **Impact:** Nothing throttles repeated registration attempts or email-existence probing per address/IP, inconsistent with the rate-limiting invariant already applied to `/login`.

### 5. [Low-Medium] Login rate limiter relies solely on Mongo TTL sweep timing, unlike the password-reset service
- **File:** `src/middleware/rateLimit.ts:19` (compare `src/services/passwordReset.service.ts:45-47`)
- **Issue:** `passwordReset.service.ts` explicitly re-checks `expiresAt` in code because "the TTL index only deletes expired documents on MongoDB's periodic background sweep." `loginRateLimit`'s `LoginAttemptModel` has no equivalent freshness check, relying purely on the `windowStart` TTL index (`LoginAttempt.ts:9`, `expireAfterSeconds: 900`).
- **Impact:** If the TTL sweep lags, a user who hit the 5-attempt cap keeps incrementing the same stale document and stays rate-limited past the intended 15-minute window.

### 6. [Low] Business-rule default baked into the `PasswordReset` schema, and the field is dead code
- **File:** `src/models/PasswordReset.ts:8`
- **Issue:** `attemptsRemaining: { type: Number, required: true, default: 3 }` violates `.claude/rules/migrations.md` ("No schema `default:` value that is a business decision — only a genuine identity default belongs in the schema"). The value `3` duplicates `RATE_LIMIT_MAX = 3` already hardcoded in `passwordReset.service.ts:7`, and `verifyAndConsumePasswordResetToken` (`passwordReset.service.ts:41-52`) never reads or decrements it — it's unconditional `findOneAndDelete`.
- **Impact:** Dead schema field that misleads maintainers into thinking multi-attempt tracking exists; a future change to the rate-limit constant would only update the service, leaving the schema default silently out of sync.

### 7. [Low] Missing `docs/data-model.md` Schema-change log entries for three shipped changes
- **File:** `docs/data-model.md:1` (repo-wide check)
- **Issue:** No entries exist for the `LoginAttempt` collection, the `PasswordReset` collection, or `User.tokenVersion`, despite `.claude/rules/migrations.md` requiring "a dated entry in `docs/data-model.md`'s Schema-change log with a stated rollback procedure in prose — no exceptions."
- **Impact:** Two collections and one field shipped with no record of intended backfill/rollback, leaving future maintainers without the required documentation trail.

### 8. [Low] UTC-day-bucketing logic duplicated verbatim between server and client
- **File:** `src/controllers/stats.controller.ts:5,7-8` and `client/src/components/Heatmap/Heatmap.tsx:4,22-23`
- **Issue:** `MS_PER_DAY` and `toUtcDayNumber` are copy-pasted identically in both places. `.claude/rules/backend/history-and-stats.md` states that any timezone-aware fix to this bucketing "belongs in `computeStreakDays`/`toUtcDayNumber` in `stats.controller.ts`, not in the client."
- **Impact:** If the server-side bucketing is fixed per that rule, `Heatmap.tsx`'s independent copy keeps the old logic, so the heatmap's day boundaries can silently drift out of sync with the streak badge shown on the same `ProgressPage`.

---

## Refuted candidate findings (checked and dropped)

These were raised by initial finder passes but disproven on direct source inspection, and are not included above:
- **"Auth error message swallowed in `apiFetch`"** — refuted; `apiFetch` already reads `body.message` before `body.error`.
- **"Cookie options duplicated 3x across auth controller"** — refuted; already centralized in a shared `authCookieOptions()` helper.
- **"`stats.controller.ts`/`history.controller.ts` fetch full documents without projection"** — refuted; both already use `.select()` projections.
