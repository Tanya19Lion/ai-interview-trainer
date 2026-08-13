---
paths:
  - "client/src/styles/**/*"
---

# Design tokens and global styles

- **`tokens.css`** — the single source of truth for design tokens (color, typography, spacing,
  radii), consolidated from the three HTML mockups' duplicated `:root` blocks with the drift
  between them manually reconciled (it's a superset — includes every token used in *any* mockup,
  e.g. `--plum-soft`, `--space-7`). This is the most important config decision in the client app:
  components read `var(--token-name)` instead of hardcoding values, so a palette/spacing change
  is made once here instead of once per component (which is exactly the maintenance problem the
  duplicated `:root` blocks in the root `diff-*.html` files still have). Breakpoints are
  intentionally **not** tokenized here since `@media` can't take a `var()` condition; they're
  hardcoded per-component instead (640/700/760/860/960/1100px).
- **`reset.css`** and **`fonts.css`** — global reset and `@fontsource` font-face imports
  (`Onest`, `IBM Plex Sans`, `IBM Plex Mono` — note: `Onest` is the display font here, whereas
  the older root-level HTML prototypes use `Sora` for the same role; don't assume they match).
