---
paths:
  - "client/src/components/**/*"
  - "client/src/App.tsx"
---

# Component library

- **`client/src/components/`** — the design-system component library, one folder per component
  (primitives: `Button/`, `Badge/`, `EditorWindow/`, `EditorComment/`, `CodeDiffLine/`,
  `Eyebrow/`, `Spinner/`, `Textarea/`, `TextField/`, `PasswordField/`, `Tabs/`; interview-flow-
  specific: `TopicPicker/`, `LevelPicker/`, `ProgressSegments/`, `QuestionCard/`, `AnswerForm/`,
  `FeedbackCard/`, `SessionSummary/`; history-specific: `HistoryTable/`, `ReviewModal/`;
  stats-specific: `Heatmap/`; landing-specific: `Reveal/`, `LangOverlay/`; app-shell: `AppShell/`),
  each with a `.tsx` and a co-located CSS Module (`.module.css`) that
  consumes the tokens from `client/src/styles/tokens.css`. All exports are re-exported centrally
  through `client/src/components/index.ts` — when adding a new component, export it there too.
  `EditorComment` (the yellow "AI reviewer" callout) is shared between `FeedbackCard` and
  `LoginPage`'s ambient decoration — reach for it instead of re-copying that callout markup.
  `AppShell` is routing-aware (renders `<Outlet />` internally, reads `useMe`/`useLogout`) rather
  than a pure presentational component — see `.claude/rules/frontend/routing-and-auth.md`.
  `ReviewModal` deliberately does **not** reuse `FeedbackCard` (which wraps its own
  `EditorWindow` per question) — a history session has multiple `questions[]` entries, so
  `ReviewModal` renders one `EditorWindow` titled `session · {topic}/{level}/answer.md` with a
  repeated question/diff/comment block per entry, closer to a real multi-hunk diff than N stacked
  cards.
- `Heatmap` computes its own grid from a `completedDates: string[]` prop (raw `completedAt`
  values from a `GET /api/history` response) rather than receiving pre-bucketed cells — the
  `bucketize(count): 0-4` mapping and the 53×7-day window live inside the component
  (`components/Heatmap/Heatmap.tsx`), not in `ProgressPage`, so any other screen that wants a
  heatmap just passes dates. Neither `Heatmap` nor `HistoryTable` reads from `useTranslation()` —
  both hardcode Ukrainian copy (column headers, "співбесід за останні 12 місяців", etc.) — so
  `LandingPage` deliberately does **not** reuse them for its bilingual demo heatmap/history table;
  it has its own local markup instead (see `.claude/rules/frontend/overview.md`'s i18n note). If
  either component is ever made i18n-aware, `LandingPage`'s local duplicates become candidates to
  delete in favor of reuse.
- `Reveal` (`components/Reveal/Reveal.tsx`) wraps children in a `div` that fades/translates in via
  IntersectionObserver the first time it enters the viewport (ports the mockup's
  `.reveal`/`.reveal.is-in` pattern; a no-op under `prefers-reduced-motion: reduce`). Used
  throughout `LandingPage` for section-heads/cards/tables — not used anywhere in the authenticated
  app, where content should just be there, not animate in on scroll.
- `LangOverlay` (`components/LangOverlay/LangOverlay.tsx`) is the once-only language picker for
  `LandingPage`, gated on `localStorage['diff-lang-chosen']`; calls `i18n.changeLanguage()` on
  choice. Only rendered by `LandingPage` — there's no equivalent language switcher in the
  authenticated app since only the landing page is i18n-wired.
- **`client/src/App.tsx`** — now mounted only at `/showcase` (see
  `.claude/rules/frontend/routing-and-auth.md`); still a kitchen-sink page rendering primitives
  from the component library, not a real app screen.
