---
status: Draft
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T2 — ThemeProvider: resolution logic + anti-FOUC

## Links

- PRD: [../PRD.md](../PRD.md) AC-02, AC-03, AC-06
- SAD: [../sad.md](../sad.md) §4 (storage-override resolution rule, point 3) + §6 "Critical flow 2" sequence diagram
- Epic: [./_epic.md](./_epic.md) "Open-decision resolution" — `useLayoutEffect` chosen over inline `<head>` script

## Scope

`client/src/context/theme/ThemeProvider.tsx`:

- Resolution order on mount, exactly per SAD §4 point 3: valid stored value in `localStorage` (`diff-theme` key, per SAD §2 naming precedent) → use it; otherwise → read `prefers-color-scheme` live, do not persist it.
- Corrupted/missing/invalid stored value → silently fall back to the OS read (AC-02) — no thrown error, no logged error (SAD §8 Crosscutting: logging N/A for this case).
- `useLayoutEffect` sets `document.documentElement.setAttribute('data-theme', resolvedTheme)` before paint.
- Exposes `setTheme(theme)` that updates state, writes to `localStorage`, and re-syncs the `data-theme` attribute (AC-01).
- Manual choice always wins over later OS changes (AC-03) — no separate `isManual` flag; presence of a stored value *is* the signal (SAD §4).

## Deps

T1.

## DoD

- [ ] PR merged.
- [ ] Unit tests (T8) pass against this implementation.
- [ ] No `isManual`-style extra flag introduced (matches SAD §4 rule — flag in review if one appears).

## Out of scope

- Wiring into `main.tsx` — see T3.
