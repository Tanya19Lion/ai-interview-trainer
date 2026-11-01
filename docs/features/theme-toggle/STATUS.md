# STATUS — Theme toggle

**Purpose:** feature-level "how to pick this back up." `tasks/tracker.md` is gone (all core
implementation tasks — T1–T5, T7–T10 — were `Merged`/`In review`); this file keeps the two tasks
that were still `Not started` plus one open decision, so they aren't lost with the tracker.

## Where things stand

`ThemeContext`/`ThemeProvider`/`useTheme`/`ThemeToggle` are implemented and wired into `main.tsx`
(see `adr/0001-react-context-for-theme-state.md`). Light-theme tokens exist in
`client/src/styles/tokens.css`.

## Still open

- **Manual QA: WCAG AA contrast audit** (was T11) — not done.
- **Manual QA: perf verification of QG-1/QG-2** (first-paint ≤16ms, no toggle jank) — not done
  (was T12).
- **Accent-token decision**: `--green`/`--rust`/`--amber`/`--plum` (+ soft variants) and
  `--btn-primary-*` are still theme-invariant by design — shared between diff cards
  (`CodeDiffLine`/`EditorWindow`, which must stay dark under QG-4) and plain badge/chip
  components. Before closing the WCAG audit above, decide: give diff elements their own
  theme-invariant tokens, or accept amber as the primary color and revisit SAD §5's palette
  proposal.
