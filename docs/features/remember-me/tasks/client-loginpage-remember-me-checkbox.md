---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T10 — LoginPage: "remember me" checkbox

## Links

- PRD: [../PRD.md](../PRD.md) US-01, US-04, US-05
- SAD: [../sad.md](../sad.md) §5 (`client/src/pages/LoginPage.tsx` + "remember me" checkbox)
- Rule: `.claude/rules/frontend/overview.md`

## Scope

`client/src/pages/LoginPage.tsx` — add a "remember me" checkbox to the login form, unchecked by
default (2026-09-10 decision override, AC-02). Wire its value through to T8's updated
`useLoginWithPassword`/`useRegister`/`useGoogleLogin` mutation calls as `rememberMe`.

Applies the same checkbox to whichever of login/register the page currently renders — check the
existing component structure for whether login and register share one form or are separate before
assuming a single checkbox placement.

## Deps

T8.

## DoD

- [ ] PR merged.
- [ ] Checkbox renders, unchecked by default, label stays simple (PRD §2: duration is
      communicated only when it matters, at expiry — not advertised upfront as "7 days").
- [ ] Checked state reaches the network request as `rememberMe: true` (verified via dev tools or
      a component test).
- [ ] `tsc -b` + `oxlint` pass in `client/`.
- [ ] Manual browser check folded into T11's live-Mongo verification pass, not skipped.

## Out of scope

- `useAuth.ts` mutation signatures (T8 already extends the request bodies).
- Silent renewal UX (T9).
- i18n — `LoginPage` is not currently i18n-aware (`useTranslation()` only wired on `LandingPage`,
  per `.claude/rules/frontend/overview.md`); match the page's existing hardcoded-text convention.
