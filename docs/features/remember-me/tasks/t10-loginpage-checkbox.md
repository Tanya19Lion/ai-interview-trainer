---
id: T10
title: "LoginPage: \"remember me\" checkbox"
status: Todo
deps: [T8]
estimate: S
owner: "Tanya19Lion"
---

# T10 — LoginPage: "remember me" checkbox

**Links:** [[../PRD.md]] US-01, US-04, US-05 · [[../sad.md]] §5 (`client/src/pages/LoginPage.tsx`
+ "remember me" checkbox) · `.claude/rules/frontend/overview.md`

## Scope

`client/src/pages/LoginPage.tsx` — add a "remember me" checkbox to the login form, unchecked by
default (2026-09-10 decision override, AC-02). Wire its value through to T8's updated
`useLoginWithPassword`/`useRegister`/`useGoogleLogin` mutation calls as `rememberMe`.

Applies the same checkbox to whichever of login/register the page currently renders — check the
existing component structure for whether login and register share one form or are separate before
assuming a single checkbox placement.

## Out of scope

- `useAuth.ts` mutation signatures (T8 already extends the request bodies; this task just passes
  the checkbox's boolean value through).
- Silent renewal UX (T9) — unrelated to the login-time checkbox.
- i18n — per `.claude/rules/frontend/overview.md`, `LoginPage` is not currently i18n-aware
  (`useTranslation()` is only wired on `LandingPage`); match the page's existing hardcoded-text
  convention, don't introduce i18n scope creep here.

## DoD

- Checkbox renders, unchecked by default, label communicates the ~7-day duration only at a
  reasonable point (PRD §2: "communicated only when it matters — at expiry, not shown as a
  forward-looking date" — so the checkbox label itself should stay simple, not advertise "7 days"
  upfront).
- Checked state reaches the network request as `rememberMe: true` (verify via browser dev tools
  or a component test).
- `tsc -b` + `oxlint` pass in `client/`.
- Manual check in a real browser per this project's "test the golden path in a browser before
  reporting complete" convention (CLAUDE.md) — not yet verified against a live backend for any
  auth-adjacent screen per `.claude/rules/frontend/overview.md`'s existing caveat; this task
  should be included in T11's live-Mongo verification pass, not skipped.
- PR ≤ 500 LOC.
