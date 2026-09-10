---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: XS
stage: "08"
ticket: "<TBD>"
---

# T12 — Manual QA: QG-1/QG-2 perf verification

## Links

- PRD: [../PRD.md](../PRD.md) §6 NFR "Theme switch visual latency" (≤100ms) and "Time to correct-theme first paint on cold load" (≤16ms)
- SAD: [../sad.md](../sad.md) §10 QG-1, QG-2
- Epic: [./_epic.md](./_epic.md) "Open-decision resolution" — `useLayoutEffect` chosen; SAD §11 flags this as a harder path to QG-2 than an inline `<head>` script

## Scope

Manual QA using browser Performance API:

- **QG-1:** measure click-to-repaint latency on toggle, confirm ≤100ms.
- **QG-2:** measure cold-load time-to-correct-theme, confirm ≤16ms with no visible flash-of-unstyled-content. **This is the check that validates (or invalidates) the `useLayoutEffect` choice from the epic's open-decision resolution** — if it fails, the fallback per SAD §11 is the inline `<head>`-script approach, which would reopen T2/T3.

## Deps

T3, T5, T10.

## DoD

- [ ] QG-1 measurement logged, ≤100ms confirmed.
- [ ] QG-2 measurement logged, ≤16ms confirmed, no observable FOUC.
- [ ] If QG-2 fails: flag back to the epic — do not silently accept a missed threshold.
