---
status: Todo
owner: "Tanya19Lion"
reviewers: []
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T4 — Light-theme design tokens

## Links

- PRD: [../PRD.md](../PRD.md) AC-05, §6.1 (data classification — not applicable to this task's content, purely visual tokens)
- SAD: [../sad.md](../sad.md) §5 "Light-theme token mapping (Variant A)" — full token table (canvas & surfaces, typography, buttons, semantic colors, shadow) + WCAG AA spot-check
- Rule: `.claude/rules/frontend/styles.md` — `tokens.css` is the single source of truth, components read `var(--token-name)`

## Scope

Extend `client/src/styles/tokens.css` with a `[data-theme="light"]` override block containing exactly the token values in SAD §5's table — do not invent new colors, do not round/approximate the hex values given there.

- Canvas & surfaces (`--canvas`, `--canvas-2`, `--canvas-3`, `--line`, `--nav-bg`)
- Typography outside the editor-window card (`--text-strong`, `--text-soft`, `--text-faint`)
- Buttons (`--btn-primary-bg`, `--btn-primary-text`, `--btn-secondary-border`, `--btn-secondary-text`)
- Semantic colors — text usage (`--green`, `--rust`, `--amber`, `--plum`)
- Semantic colors — soft background usage (`--green-soft`, `--rust-soft`, `--amber-soft`)
- Shadow (`--shadow`)

**Explicitly unchanged in both themes** (do not touch): all `--card-*` tokens, diff-row colors, traffic-light dots — SAD §5 is explicit that the editor-window card stays dark in both themes.

## Deps

None — independent of the Context/Provider work.

## DoD

- [ ] PR merged.
- [ ] `[data-theme="light"]` block present in `tokens.css`, values match SAD §5 table exactly.
- [ ] Editor-window / diff-card tokens untouched (diff review should show zero changes to those lines).

## Out of scope

- The WCAG AA contrast audit itself — SAD §5 includes the author's own spot-check numbers, but the sign-off audit is T11 (manual QA, Tech Lead owner).
