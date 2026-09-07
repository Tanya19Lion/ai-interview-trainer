---
status: Accepted
owner: "Tanya19Lion"
reviewers: ["Tech Lead"]
updated_at: "2026-09-07"
feature_size: S
stage: "04-05"
ticket: "<TBD>"
---

# 0001 — Use React Context for theme state

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** Architect (this session) + user, during the SAD §4 Socratic walk

## Context

The theme-toggle feature (PRD `docs/features/theme-toggle/PRD.md`) requires every component that renders visible text, code highlighting, or feedback badges to reflect the active theme with sufficient contrast (AC-05, QG-4). The Explore-repo scan for this SAD confirmed there is no existing React Context in `client/src` for UI state — auth state is server-derived via TanStack Query (`useMe()`), and the one existing localStorage-driven UI flag (`LangOverlay`, language choice) is local `useState` with no shared distribution mechanism. Introducing theming forces a first decision about how theme state reaches components.

## Decision drivers

- QG-1 (SAD §1): switch visual latency ≤100 ms from click to full re-paint (PRD §6 NFR).
- QG-4 (SAD §1): AI-feedback readability (text, code highlighting, badges) must hold in both themes — several components across the tree need theme-awareness, not just the toggle button.
- SAD §2 Constraints: no existing global-UI-state pattern in the repo — this decision sets the precedent other features may follow.

## Considered options

1. **React Context + Provider** — a `ThemeContext` with a `ThemeProvider` composed in `main.tsx` alongside the existing `I18nextProvider` / `QueryClientProvider`; components call `useContext(ThemeContext)` (or a `useTheme()` wrapper hook) for the current theme value.
2. **DOM attribute + CSS custom-property cascade** — `document.documentElement.setAttribute('data-theme', ...)` with `[data-theme="light"] { --ink: ...; }` overrides in `tokens.css`; only the toggle button itself holds local React state for its icon, everything else is pure CSS with no JS-level theme value.

## Decision outcome

**Chosen:** Option 1, React Context + Provider. The team prioritized a typed, discoverable JS-level API for "what's the current theme" — useful now for AI-feedback code-highlighting components that need to pick a syntax-highlighting theme variant programmatically (not achievable through CSS variables alone), and useful going forward as the first precedent for shared UI state in this codebase.

## Consequences

**Positive**
- Every component gets a typed, testable `useTheme()` read of the current theme without inspecting the DOM.
- Establishes a reusable Context + Provider pattern for future shared UI state (first precedent in `client/src`).
- Code-highlighting components can branch on theme value directly in JS (not solvable by CSS variables alone).

**Negative**
- A theme change triggers a re-render fan-out to every subscribed component — this is the primary risk against QG-1's ≤100 ms visual-latency target on pages with many feedback/code-highlighting components; verification is tracked in SAD §10 QG-1.
- Adds a new cross-cutting pattern to the codebase (Provider composition in `main.tsx`) that has no precedent to follow — first-of-its-kind risk if the API shape is wrong.

**Neutral**
- Migrating later to the DOM-attribute + CSS approach is possible but requires removing the Context/Provider and rewiring every consuming component — a multi-day rework, consistent with why this crossed the blast-radius threshold.

## Links

- PRD: [[../PRD.md]]
- SAD: [[../sad.md]] §4
- Related ADR: none yet
