---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T7 — i18n labels for ThemeToggle

## Links

- SAD: [../sad.md](../sad.md) §8 Crosscutting concepts — Internationalisation ("Toggle label / aria-label localized via existing `react-i18next`")

## Scope

Add `aria-label` / tooltip translation keys for the toggle to `client/src/locales/uk` and `client/src/locales/en`, following the existing `react-i18next` key-naming convention already used elsewhere in `client/src/locales/`.

## Deps

T5.

## DoD

- [ ] PR merged.
- [ ] Toggle's `aria-label` renders correctly in both `uk` and `en` locales.
