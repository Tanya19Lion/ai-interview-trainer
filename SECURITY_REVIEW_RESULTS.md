# Security Review — AI Interview Trainer (full codebase)

**Scope:** `src/` (Express + TypeScript + MongoDB backend) and `client/` (Vite + React 19 +
TypeScript frontend). Full-tree review (working tree was clean; no PR diff existed), not a
diff-only review. Read-only — no source files were modified.

**Summary:** The auth system (cookie-based JWT with `tokenVersion` revocation, bcrypt password
hashing, Google OAuth `idToken` audience verification, ObjectId-scoped queries preventing IDOR
on interview/history endpoints) is generally sound. Two concrete issues stand out: (1) the
per-email login rate limiter counts every attempt — including successful ones — without ever
checking `windowStart`'s age in application code, so an attacker can keep a victim's email
locked out of `/api/auth/login` indefinitely by re-triggering it before each ~15-minute TTL
sweep, and legitimate users can self-lock; (2) `login`/`register`/`googleLogin` pass the
client-supplied `email` field straight into a Mongoose `findOne`/`findOneAndUpdate` filter with
only a truthy check (no `typeof === 'string'` guard), which is a NoSQL-operator-injection
pattern — unlike `confirmPasswordReset`/`changePassword`, which do validate their string
inputs. No stored/reflected XSS was found (React auto-escapes; no `dangerouslySetInnerHTML`
anywhere in `client/src`), no secrets are committed, and the error handler doesn't leak stack
traces. Remaining findings are lower-severity hardening gaps (missing security headers, no rate
limiting on register/other endpoints).

---

# Vuln 1: Login rate limiter never expires the attempt window in application code — indefinite lockout of a victim's email

* **File:** `src/middleware/rateLimit.ts:6-28`
* **Severity:** Medium (impact is account-lockout/DoS-style, not data exposure or auth bypass, but persists indefinitely if the attacker automates it)
* **Category:** broken access control / abuse-of-functionality (rate-limit logic bug)
* **Description:** `loginRateLimit` does `findOneAndUpdate({ email }, { $inc: { count: 1 }, $setOnInsert: { windowStart: new Date() } }, { upsert: true })` and blocks once `count > 5`. The `count` field is incremented unconditionally on **every** call to `/api/auth/login` for that email — successful logins included — and the handler never reads/compares `windowStart` to decide whether the window should reset; the only place the window actually resets is MongoDB's TTL background sweep on the `windowStart` index (`expireAfterSeconds: 900` in `src/models/LoginAttempt.ts:9`), which runs on its own ~60s cadence, not something the request path controls or checks.
* **Exploit Scenario:** An attacker sends 6 POST requests to `/api/auth/login` with the victim's email (any password) — no auth or ownership check on the email field is required. The `LoginAttempt` document's `count` exceeds 5, and every subsequent login for that email — including the legitimate owner's correct-password login — gets a 429 until the TTL sweep deletes the doc roughly 15 minutes later. If the attacker repeats this every ~14 minutes, the victim is locked out indefinitely. Separately, a legitimate user who mistypes their password (or retries after a slow network) 6 times in 15 minutes locks themselves out the same way, since successful attempts also increment `count` and there's no distinction between success/failure.
* **Recommendation:** Check `windowStart`'s age in the handler itself (reset `count` to 1 and `windowStart` to now when the existing document is older than the window, rather than relying solely on the TTL sweep), and only increment `count` on failed login attempts (move the increment into `login()` after the credential check fails, not before every attempt).
* **Status:** Fixed in PR #25, released in v0.1.2. The window is now expired in application code and successful logins no longer count. One deviation from the recommendation: the increment stays *before* the password check (an atomic reserve in the middleware, given back by `login()` on success), because counting a failure only after `bcrypt.compare` lets a burst of concurrent requests all read "under the limit" first. Residual, accepted: the limit is still per email, so ~5 failed logins per 15 minutes can still lock a victim's email out (see the Amendment in ADR-0003).

---

# Vuln 2: Unvalidated `email` field passed directly into Mongoose query filters (NoSQL injection)

* **File:** `src/controllers/auth.controller.ts:120` (`register`), `:139` (`login`), `src/models/User.ts:7`
* **Severity:** Medium
* **Category:** nosql_injection
* **Description:** `register` and `login` destructure `email` from `req.body` with only a TypeScript type assertion (`as { email?: string; ... }`, no runtime validation) and a truthy check (`if (!email || !password) ...`). The value is then passed straight into `UserModel.findOne({ email })`. Because `email` is never checked to be a string, a caller can send a JSON object instead (e.g. `{"email": {"$gt": ""}, "password": "x"}`), and Mongoose will treat `$gt`/`$ne`/`$regex`/etc. as valid query operators against the schema's `String` field, matching whichever user document satisfies the operator rather than an exact email lookup. Contrast this with `confirmPasswordReset` (`auth.controller.ts:211-216`) and `changePassword` (`:256`), which do `typeof token !== 'string'` / `typeof currentPassword !== 'string'` checks before use — the same guard is simply missing from `login`/`register`/`googleLogin`'s email handling.
* **Exploit Scenario:** In `login`, sending `{"email": {"$gt": ""}, "password": "<guess>"}` causes `findOne` to return an arbitrary user (e.g., whichever email sorts greatest, or via `$regex` a specific pattern match) instead of failing with "no such user" — the attacker can then run `bcrypt.compare` against a chosen matched account's hash by iterating operators (`$regex: "^admin"` etc.) to fingerprint which accounts exist and target them, and in `register` the same operator can make the "is this email already taken" `findOne` check (`:120`) return a false match/no-match, bypassing the duplicate-email guard's intended semantics. This does not bypass the bcrypt password check directly (password is still compared with `bcrypt.compare`, not queried), so it is not a full authentication bypass, but it is a real query-injection primitive that lets an attacker manipulate *which* user record a request operates against.
* **Recommendation:** Validate `typeof email === 'string'` (and ideally a basic email-shape check) before using it in any Mongoose filter, in `register`, `login`, and `googleLogin`'s email-based lookups — matching the pattern already used for `token`/`currentPassword`/`newPassword` elsewhere in the same file.

---

# Vuln 3: No application-level rate limiting on `/api/auth/register` or `/api/auth/password-reset/confirm`

* **File:** `src/routes/auth.routes.ts:9,13`
* **Severity:** Low
* **Category:** missing rate limiting (defense-in-depth)
* **Description:** Only `/api/auth/login` has `loginRateLimit` attached (`auth.routes.ts:10`). `register`, `googleLogin`, `confirmPasswordReset`, and `changePassword` have no per-IP/per-account throttling of their own. `confirmPasswordReset`'s token is a 32-byte random value (256 bits of entropy, `passwordReset.service.ts:32`), so brute-forcing it is infeasible regardless of rate limiting, which limits the practical impact here to account-enumeration/registration-spam scenarios.
* **Exploit Scenario:** An attacker can script unlimited account-creation attempts against `/api/auth/register`, or unlimited confirm-token guesses against `/api/auth/password-reset/confirm` (impractical to actually succeed given the token entropy, but the endpoint itself has no throttle).
* **Recommendation:** Reuse the same rate-limiting approach as `login` on `register` at minimum; this is a lower-priority hardening item given the confirm-token's entropy already makes that endpoint's exposure mostly theoretical.

---

# Non-findings / verified-safe areas worth noting

* **IDOR:** `getSessionDetail`, `getHistory`, `startSession`, `submitAnswer`, `getActiveSession` (all in `src/controllers/interview.controller.ts` and `src/controllers/history.controller.ts`) all scope their Mongoose queries with `userId: req.userId` derived from the verified JWT, and `getSessionDetail` deliberately returns 404 (not 403) for another user's session id to avoid confirming existence. No IDOR found.
* **XSS:** No `dangerouslySetInnerHTML`, no `innerHTML`, no unsanitized HTML injection anywhere under `client/src`. AI-generated `feedback`/`correctAnswer`/`weakTopics` content is rendered through normal JSX text interpolation (auto-escaped by React), not through an unsafe sink.
* **Secrets:** `client/.env` (containing only the public Google OAuth client ID and a local API URL — neither sensitive) is git-ignored and not committed; only `.env.example` is tracked. `ANTHROPIC_API_KEY`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` (server-side) are all read from `process.env`, never hardcoded.
* **Error handling:** `src/middleware/errorHandler.ts` returns a generic 500 with no stack trace or internal error detail to the client.
* **CORS/cookies:** `cors({ origin: process.env.CLIENT_URL, credentials: true })` is a single explicit origin (not a reflected/wildcard origin), and auth cookies are `httpOnly`, `sameSite: 'lax'`, and `secure` in production — reasonable CSRF/XSS-exfiltration posture for a cookie-based session.
* **Password reset flow:** `verifyAndConsumePasswordResetToken` explicitly re-checks `expiresAt` even though a TTL index also exists, because the TTL sweep isn't exact — this guards against a token being usable in the gap between real expiry and the sweep actually deleting it. Confirmed correct.
* **Missing security headers (e.g. no `helmet`)** was noted but not filed as a standalone finding — it's a hardening gap rather than a concrete exploitable vulnerability given the app's current attack surface (JSON API + cookie auth, no server-rendered HTML that would benefit from CSP).
