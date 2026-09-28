# Changelog

All notable changes to this project are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
- CI: lint, build and tests for the server and the client, a docs-drift check of the routes against the OpenAPI specs, a next-version preview on pull requests, and changelog and release-notes drafting on version tags

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

[Unreleased]: https://github.com/Tanya19Lion/ai-interview-trainer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Tanya19Lion/ai-interview-trainer/releases/tag/v0.1.0
