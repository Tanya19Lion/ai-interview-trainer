---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T3 — Wire ThemeProvider into main.tsx

## Links

- SAD: [../sad.md](../sad.md) §5 (Provider composition alongside existing `I18nextProvider` / `QueryClientProvider`)

## Scope

Compose `ThemeProvider` in `client/src/main.tsx` alongside the existing providers. Order relative to `I18nextProvider` / `QueryClientProvider` should not matter functionally — pick the order that keeps the provider stack readable, no new indirection.

## Deps

T2.

## DoD

- [ ] PR merged.
- [ ] App boots (`make dev-client`) with no console errors.
- [ ] `useTheme()` is callable from any routed page without a "used outside provider" error.
