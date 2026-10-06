# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-10-06

### Added

- Deployment to Vercel: the Express app is split into `src/app.ts` (no `listen`) and `src/index.ts` (local run), runs as a Vercel function through `api/index.js` and `vercel.json`, and serves the client from the same domain; `trust proxy` is on only when Vercel sets `VERCEL`. See `docs/deploy-vercel.md` and ADR-0002
- A checklist for hardening MongoDB Atlas while its network access is open to `0.0.0.0/0` (`docs/deploy-vercel.md`)
- A per-IP limit on `POST /api/auth/register` and `POST /api/auth/google` (10 per 15 minutes each, `IpAttempt` collection); beyond it the answer is 429 `auth.rate_limited`
- A per-user limit on `POST /api/interview/start` and `POST /api/interview/:sessionId/answer` (40 per 15 minutes, one shared counter, stored in `IpAttempt` under `ai:<userId>`); beyond it the answer is 429 `ai.rate_limited`
- `InterviewSession.currentQuestion`: the question the server issued and waits for an answer to (optional, so older sessions need no backfill)
- `GET /api/stats` returns `activityByDay` and `today`, so the progress heatmap no longer buckets days on the client

### Changed

- The login limit is now counted per email and address: 5 failed logins per 15 minutes for each email+IP pair, plus a ceiling of 30 per email, so someone else's failed logins from another address no longer lock the owner out (ADR-0004). A successful login still gives its attempts back
- `POST /api/interview/:sessionId/answer` accepts only string `question` and `answer` (the question up to 1000 characters, the answer up to 4000; an empty answer is still a skip) and rejects a `question` that is not the one the server issued, with 400 instead of 500 or a graded arbitrary text
- `GET /api/interview/active` returns the stored question instead of generating a new one on every call; a session created before this release gets one generated and saved on its first call
- `POST /api/interview/start` generates the question before creating the session, so a failed AI call leaves no empty session, and deletes the user's older unfinished sessions (they were already unreachable from the app)
- The question and the answer are wrapped in `<question>` / `<answer>` tags in the AI prompts, and the system prompt says their content is data, not instructions
- The client has a single `Lang` / `LANGS` and `LOCALE`; `check_enums.py` also guards `LANGS` against drift between server and client

### Fixed

- Changing the password logged the user out on the next request (the bumped `tokenVersion` revoked the session that made the change); the response now reissues the session cookies
- `register`, `login`, `googleLogin` and the login limiter let a JSON object such as `{"$ne": ""}` reach a Mongoose filter as an email; non-string values now get a 400 first
- An AI review with a missing field or a score outside 0–10 was only caught when saving the session (a 500 after a paid call); `parseAnswerReview` now checks the shape first
- A logged-out visit to a protected page landed on the public landing page and lost the deep link; `RequireAuth` now redirects to `/login` and `LoginPage` returns the user to the page they wanted

### Removed

- The unused `PasswordReset.attemptsRemaining` field (a business-rule default that nothing read), removed in two steps: it stopped being written, then left the schema

### Documentation

- ADR-0004 (login limit per email+IP), the Schema-change log in `docs/data-model.md` (`tokenVersion`, `LoginAttempt`, `PasswordReset`, `IpAttempt`, `currentQuestion`, the changed keys and limits), the interview-flow and auth rules, and the open follow-ups in `PROGRESS.md`
- Removed the one-off `CODE_REVIEW_RESULTS.md`, `SECURITY_REVIEW_RESULTS.md` and `SIMPLIFY_RESULTS.md`; every finding in them is fixed or tracked in `PROGRESS.md`
- The unknown-email limit in `passwordReset.service.ts` stays an in-memory `Map` until T6 (`POST /password-reset/request`) calls it; the move to Mongo is now part of T6's definition of done

## [0.3.0] - 2026-10-05

### Added

- Full UK/EN interface: every page and component reads its text from the locale files, including login, reset password, dashboard, new session, the interview, history (and its review modal) and progress; counts use proper plural forms («1 день / 2 дні / 5 днів»)
- A persistent UK/EN language toggle in the app navigation, on the landing page and on the auth screens; the choice is remembered, and on a first visit the language follows the browser
- The theme toggle on the auth screens
- AI questions, feedback and model answers follow the language chosen when a session starts (`InterviewSession.lang`; `POST /api/interview/start` accepts `lang`, an invalid value gets a 400). A session keeps its language even if the interface language changes afterwards, and sessions created before this release stay Ukrainian
- Dates and the heatmap's month labels follow the active language
- Tests that keep `uk.json` and `en.json` in sync (keys and interpolation variables), pin the Ukrainian plural forms, and fail when Cyrillic text is hardcoded in client source

### Changed

- The English label for the model's answer reads "A possible answer", matching the Ukrainian «Можлива відповідь» (it was "The better answer is")
- The Google sign-in button renders in the active interface language
- Ukrainian month labels in the heatmap now come from `Intl` (e.g. «січ.», with a trailing dot)

### Fixed

- A long review (typical for Middle-level answers written in Ukrainian) could fail with "AI review response is not valid JSON": the reply was cut off at the 1024-token limit. The limit is now 2048 for reviews and model answers, and a reply that is still cut off reports the `max_tokens` limit instead of a JSON syntax error

### Documentation

- Added the i18n design spec and implementation plan under `docs/superpowers/`
- Recorded the optional `lang` field in the `docs/data-model.md` schema-change log (no backfill needed; a missing value reads as `uk`) and in the interview-flow OpenAPI contract
- Added "Session language" to the `docs/CONTEXT.md` glossary and refreshed the frontend and backend rules, `docs/sad.md` and `docs/PRD.md` (the language toggle is done; the mobile nav-toggle on the landing page remains open)

## [0.2.1] - 2026-10-04

### Added

- Server tests for skipped ("Не знаю") questions: `submitAnswer` stores a zero-score entry and leaves it out of `averageScore`, `GET /api/stats` ignores it, and `answerQuestion` returns the model's plain-text answer
- Client tests for `ConfirmDialog` (confirm, cancel, Escape, overlay click, initial focus), the `FeedbackCard` answer labels and skipped variant, and the skip-specific loading text in `AnswerForm`

### Documentation

- Closed the "no tests for the skip flow" open item in `PROGRESS.md` and added the 0.2.1 release notes

## [0.2.0] - 2026-10-04

### Added

- Confirmation dialog for "Завершити сесію" (a modal instead of the browser `confirm` alert): "Продовжити" / "Завершити", closes on Escape or a click outside
- Review cards now label the answers: the user's answer is shown as "Ось твоя відповідь" and the model's as "Краща відповідь" (also on the landing-page demos, in both languages, and in the history review modal)

### Changed

- The user's answer is no longer struck through in the review card, so a partly right answer no longer looks entirely wrong
- "Не знаю" now shows the model's answer to the question with a note that the question does not affect the session result; the loading text for it reads "AI reviewer готує відповідь на питання…" and the check button no longer spins
- A skipped question is left out of the session's average score and of `GET /api/stats`; the history review modal shows it without a score line

### Fixed

- "Не знаю" failed with "Не вдалося перевірити відповідь": the schema's `required: true` rejected the empty `answer` / `feedback` of a skipped question, so saving the session threw a validation error. A skipped question is now saved with `answer: ''`, `feedback: ''` and `score: 0`

### Documentation

- Recorded the `answer` / `feedback` schema change in the `docs/data-model.md` Schema-change log (with rollback), and brought the interview-flow feature docs, the `.claude/rules` notes and `PROGRESS.md` in line with the skip behaviour and the new components; added the 0.2.0 release notes

## [0.1.2] - 2026-09-29

### Fixed

- Login rate limit: a successful sign-in no longer counts toward the per-email limit, so signing in several times in a row no longer locks the account out for 15 minutes
- Login rate limit: the 15-minute window now expires in application code instead of waiting for MongoDB's periodic cleanup, so a lock ends on time
- CI: the docs-drift check no longer fails a pull request for an OpenAPI operation that is documented but not implemented yet (planned work); it still fails for a route missing from the docs

### Security

- The login limit reserves an attempt with a single atomic write before the password is checked, so parallel requests for one email cannot exceed five password checks per 15 minutes
- A first-attempt race on the login limit counter is retried instead of returning a server error

### Documentation

- Updated the remember-me data model, sequence diagram, OpenAPI description and ADR-0003 (new amendment), and the root PRD's rate-limit notes, to match the shipped limiter
- Recorded the fix in `SECURITY_REVIEW_RESULTS.md` and `PROGRESS.md`, and added the 0.1.2 release notes

## [0.1.1] - 2026-09-28

### Fixed

- Docs-drift detector: no longer treats an OpenAPI `servers` URL's scheme and host as part of the route path, which had made every documented auth route look undocumented
- Added the missing `system-design` value to the interview-flow OpenAPI `Topic` enum

### Documentation

- Documented `GET /api/auth/me`, `GET /api/history`, `GET /api/history/{id}` and `GET /api/stats` in OpenAPI

### Removed

- The unused `.github/release.yml` GitHub-native release-notes config (the `release` workflow builds release notes from this changelog instead)

## [0.1.0] - 2026-09-28

### Added

- AI interview trainer: pick a topic and a level, answer questions one at a time and get a score, feedback, a model answer and weak topics for each answer
- Ten topics (React, JavaScript, Node.js, TypeScript, Next.js, CSS, HTML, SQL, REST API, system design) at junior, middle and senior levels
- Sign-in with Google or with email and password, with a Google account linked to an existing email account
- Silent access-token renewal, so a signed-in user stays signed in while using the app
- Resume an in-progress interview and reopen a finished one from history, also after a page reload or from a direct link
- Home page with profile, stats badges, day streak, recent sessions and a resume card
- History page with topic filters and a review dialog for finished sessions
- Progress page with an activity heatmap, a score trend and a level distribution
- Public landing page in Ukrainian and English with a language switch
- Light and dark theme toggle that applies before the first paint, with no flash
- Password change endpoint and password-reset confirmation endpoint
- Password-reset screen (UI only: no email is sent yet, so a reset cannot be started)
- Persistent sign-in ("remember me") support in the auth API and the client API layer, without a login-form checkbox yet
- Login rate limit per email address
- Mock API server generated from the OpenAPI contracts (`npm run mock:api`)
- CI: lint, build and tests for the server and the client, a docs-drift check of the routes against the OpenAPI specs, a next-version preview on pull requests, and an automatic tag and GitHub Release when a release pull request is merged

### Changed

- Upgraded Express to v5
- AI calls during an interview run in parallel to shorten the wait for feedback
- History and stats queries return only the fields they need
- Shared cookie, date and label helpers replace duplicated code
- CI runs on Node 24 instead of Node 22

### Removed

- The client-side dev-login stub and its `/api/auth/dev-login` endpoint, replaced by real authentication
- The static HTML design templates, once the client matched them
- The root `SPEC.md` and `ARCHITECTURE.md`, superseded by `docs/PRD.md` and `docs/sad.md`

### Fixed

- Skipping a question no longer breaks the interview flow, and failed AI calls now return a handled error
- Topic names show their display label (`node.js`, `next.js`) instead of the raw value
- The day streak counts the longest run of consecutive days ending today or yesterday
- The Google sign-in button no longer re-initializes on every keystroke in the password field
- The API client handles `204 No Content` responses instead of failing on an empty body
- Sign-out also revokes the session when only the refresh cookie is present, and refresh keeps the cookie persistent
- Password-reset tokens are rejected once expired, even before the database cleanup runs
- Password-reset confirmation rejects non-text input and treats a deleted account as an invalid token
- CI: `npm ci` no longer fails on the lock file, and the version and docs-drift workflows find their scripts and authenticate with the repository's Claude token

### Security

- Signing out or changing a password revokes existing sessions through a per-user token version
- Passwords are stored as bcrypt hashes, and auth cookies are `httpOnly`, `sameSite=lax` and `secure` in production
- Google sign-in verifies the ID token's audience
- Password-reset tokens are random 32-byte values that expire and are consumed on use
- Security headers are set with Helmet

[Unreleased]: https://github.com/Tanya19Lion/ai-interview-trainer/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.4.0
[0.3.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.3.0
[0.2.1]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.2.1
[0.2.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.2.0
[0.1.2]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.2
[0.1.1]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.1
[0.1.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.0
