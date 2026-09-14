---
status: Merged
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T5 — ThemeToggle component + rapid-toggle debounce

## Links

- PRD: [../PRD.md](../PRD.md) AC-01, §6.1 abuse case "Rapid-toggle spam"
- SAD: [../sad.md](../sad.md) §5 (`components/ThemeToggle/`, reuses `buttonClassName({variant:'ghost'})` and `lucide-react` `Sun`/`Moon` icons — same convention as `PasswordField`)

## Scope

- `client/src/components/ThemeToggle/ThemeToggle.tsx` + co-located `ThemeToggle.module.css`, re-exported via `components/index.ts` (existing convention).
- Calls `useTheme()` (T1) for current value and `setTheme()`.
- Reuses existing `buttonClassName({variant: 'ghost', size: 'md'})` helper — no new button styling.
- Icon: `lucide-react` `Sun`/`Moon`, switches based on active theme — no new icon dependency.
- Debounce the click handler client-side (PRD §6.1: mitigates a script spamming the toggle to force excessive re-renders — no server-side rate limit applies, there's no request).

## Deps

T1, T4 (component needs finished tokens to be visually verifiable in both themes).

## DoD

- [x] PR merged.
- [ ] Manual click-through in both themes — icon and visual state match the active theme. **Not
      live-verified**: `npm run build`/`npm run lint` pass, but the Playwright browser tool
      requires an interactive permission grant unavailable in this autonomous run — same
      "unverified against a live render" gap already tracked for other screens in `PROGRESS.md`.
      Needs a manual pass before this is treated as fully closed.
- [x] Debounce verified: `handleClick` guards on a `lastToggleRef` timestamp (300ms window) and
      returns early without calling `setTheme()` for clicks inside that window — confirmed by
      code inspection (`ThemeToggle.tsx`).

## Out of scope

- Localized label text — see T7.
- Automated tests — see T9.
