---
paths:
  - "client/src/styles/**/*"
---

# Design tokens and global styles

- **`tokens.css`** — the single source of truth for design tokens (color, typography, spacing,
  radii). This is the most important config decision in the client app: components read
  `var(--token-name)` instead of hardcoding values, so a palette/spacing change is made once here
  instead of once per component. Breakpoints are intentionally **not** tokenized here since
  `@media` can't take a `var()` condition; they're hardcoded per-component instead
  (640/700/760/860/960/1100px).
- **`reset.css`** and **`fonts.css`** — global reset and `@fontsource` font-face imports
  (`Onest`, `IBM Plex Sans`, `IBM Plex Mono`).
