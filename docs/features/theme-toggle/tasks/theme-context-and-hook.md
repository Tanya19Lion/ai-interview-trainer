---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T1 — ThemeContext + useTheme hook

## Links

- SAD: [../sad.md](../sad.md) §5 Building block view (`context/theme/` module)
- ADR: [../adr/0001-react-context-for-theme-state.md](../adr/0001-react-context-for-theme-state.md)

## Scope

Create the typed Context skeleton only — no resolution logic, no DOM sync (that's T2).

- `client/src/context/theme/ThemeContext.tsx` — `React.createContext<ThemeContextValue>`.
- `client/src/context/theme/useTheme.ts` — `useContext(ThemeContext)` wrapper hook, throws if used outside provider.

## Deps

None.

## DoD

- [ ] PR merged.
- [ ] `npm run typecheck` (client) green.
- [ ] `useTheme()` throws a clear error when called outside `ThemeProvider`.

## Out of scope

- `ThemeProvider` implementation — see T2.
