---
status: Living
updated_at: "2026-09-05"
---

# Domain Context

## Glossary

<!-- Це SAD-internal технічна термінологія фічі theme-toggle, а не domain-лексика проєкту в цілому. -->

| Term | Meaning |
|---|---|
| Smart default | The theme the app shows on a job-seeker's first visit, computed once from the browser/OS `prefers-color-scheme` preference — never re-read after that visit unless no manual choice was ever stored (PRD §2, AC-06). |
| Manual choice | The theme a job-seeker explicitly picks via the toggle; once stored in `localStorage`, it outranks any later OS preference change (AC-03) — this is what the storage-override resolution logic in sad.md §4 keys off of. |
| Anti-FOUC | "Flash of unstyled/wrong content" — the visible flicker if the correct theme is applied only after React hydrates instead of before first paint; avoided by the inline `<head>` script mechanism (mechanism itself is an open decision, sad.md §11). |
| `data-theme` attribute | The `[data-theme="light"\|"dark"]` attribute set on `document.documentElement`, driving the CSS custom-property overrides in `tokens.css` that give every component its theme-appropriate colors (sad.md §4, §5). |
