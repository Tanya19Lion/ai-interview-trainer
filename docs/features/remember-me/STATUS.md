# STATUS — Remember me

**Purpose:** feature-level "how to pick this back up." `tasks/tracker.md` is gone (T1–T6, T8–T10,
T12, T13 were `Merged`/`Verified`); this file keeps what was still open, so it isn't lost with
the tracker.

## Where things stand

Access+refresh token issuance (`rememberMe`), `tokenVersion`-based revocation on logout/refresh,
login rate-limiting, silent token renewal, and the "remember me" checkbox on `LoginPage` are all
implemented and merged — see `adr/0001-...`, `adr/0002-...`, `adr/0003-...` for the design
decisions.

## Still open

- **k6 latency smoke test (QG-2)** — not done (was T7).
- **Manual QA: live-Mongo verification** — not done (was T11); the rest of this feature has only
  been confirmed via mocked-model tests, never against a real Mongo instance.
- **Known gap, no task filed yet:** `useGoogleLogin` (`client/src/hooks/useAuth.ts`) doesn't pass
  `rememberMe` to `POST /api/auth/google`, even though `api/auth.ts` already supports it — the
  "remember me" checkbox silently does nothing for Google sign-in. Needs a decision before it
  becomes a task (always remember Google logins? add a checkbox state for that path too?).
