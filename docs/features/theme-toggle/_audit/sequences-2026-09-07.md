# Sequence coverage audit — theme-toggle — 2026-09-07

## Coverage table (PRD §4 vs SAD §6)

| US-N | Title | Status | Notes |
|---|---|---|---|
| US-01 | Switch theme manually | Covered | "Critical flow 1" (existing, not `### US-N` heading) covers AC-01, AC-03 |
| US-02 | See the app in the right theme from the first visit | Covered | "Critical flow 2" (existing, not `### US-N` heading) covers AC-06 |
| US-03 | Keep my theme choice across sessions | Covered | Persistence write shown in flow 1 (`Storage.setItem`); AC-02 fallback shown in flow 2 |
| US-04 | Switch theme without disrupting an active interview session | **Added** | New `### US-04:` sequence added this session (AC-04) |
| US-05 | Read AI feedback clearly in either theme | Skipped — trivial | No runtime interaction to sequence; it's a static WCAG-AA contrast requirement, already covered by §10 QG-4 verify plan |

## Added

- **US-04** — Switch theme mid-interview: shows `ThemeToggle`/`ThemeProvider`/DOM cascade running independently of `InterviewSessionPage`'s local state and an in-flight `submitAnswer` mutation, so a theme switch never interrupts the timer or an in-flight submission. `mmdc` parse validated.

## Skipped (trivial)

- **US-05** — AI feedback readability across themes: a cross-theme contrast requirement (AC-05), not a runtime interaction flow. No sequence diagram applies; already tracked as verifiable via §10 QG-4 (manual WCAG AA audit).

## New actors flagged

- `InterviewSessionPage` and `Backend submitAnswer` appear in the new US-04 diagram but are not named individually in §5's C4 Container view (§5 only lists `toggle`, `provider`, `appshell`, `fouc`, and the external `browser` system — `InterviewSessionPage` is implicitly part of the existing `appshell` container, and `submitAnswer` is pre-existing backend traffic unrelated to this feature). No §5 change needed — flagged here per protocol, not because a new container was introduced by this feature.

## Heading-convention note

Existing §6 blocks ("Critical flow 1", "Critical flow 2") predate this skill's `### US-N: <title>` heading convention and were left untouched (skill rule: don't touch existing sequences). Coverage above was determined by content (AC↔US mapping), not heading grep.

## ADR potential

- None. US-04's flow is a direct consequence of ADR-0001 (React Context for theme state) plus §4's "Storage-override" decision — no new irreversible/multi-module choice was introduced.

## Self-check against DoD

- Every PRD US (US-01…US-05) is Covered, explicitly Trivial, or has a fresh §6 sequence. ✅
- New Mermaid block (US-04) passed `mmdc` render validation. ✅
