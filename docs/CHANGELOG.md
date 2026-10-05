# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Full UK/EN interface with a persistent language toggle; AI questions, feedback and model answers follow the language chosen at session start (`InterviewSession.lang`, `POST /api/interview/start` accepts `lang`)

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

[Unreleased]: https://github.com/Tanya19Lion/ai-interview-trainer/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.2.1
[0.2.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.2.0
[0.1.2]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.2
[0.1.1]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.1
[0.1.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.0
