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
- `ConfirmDialog` (`components/ConfirmDialog/`) is the modal replacement for `window.confirm`
  (title/message/confirm+cancel labels; Escape or an overlay click = cancel). Used by
  `InterviewSessionPage` for "Завершити сесію"; reuse it instead of `window.confirm`.
- `CodeDiffLine` takes an optional `label` (a bold mono badge above the text). The review cards
  (`FeedbackCard`, `ReviewModal`, both `LandingPage` demos) show the user's answer as a neutral
  line labelled "Ось твоя відповідь" (no strike-through, so it doesn't read as "all wrong") and the
  model's as a green `+` line labelled "Можлива відповідь"; a skipped question shows only the model's
  answer ("Ось відповідь на питання") plus a "doesn't affect the result" note. `AnswerForm`'s
  `skipping` prop switches the loading text for "Не знаю". The `removed` variant still exists but
  the review UI no longer uses it.
- `Heatmap` takes `activityByDay` (`{ 'YYYY-MM-DD': sessions }`) and `today` straight from
  `GET /api/stats` — the server owns which UTC day a session belongs to, so the component has no
  day-bucketing of its own (`addUtcDays` is only calendar arithmetic to lay out the window). The
  `bucketize(count): 0-4` mapping and the 53×7-day window live inside the component
  (`components/Heatmap/Heatmap.tsx`), not in `ProgressPage`, so any other screen that wants a
  heatmap just passes the two stats fields. Both `Heatmap` and `HistoryTable` now read from `useTranslation()`
  (months come from `Intl` for the active language), so `LandingPage`'s local demo duplicates —
  which predate that — are candidates to delete in favor of reuse. They were written when both
  hardcoded Ukrainian copy (column headers, "співбесід за останні 12 місяців", etc.), so
  `LandingPage` deliberately did **not** reuse them and has its own local markup instead (see
  `.claude/rules/frontend/overview.md`'s i18n note).
- `Reveal` (`components/Reveal/Reveal.tsx`) wraps children in a `div` that fades/translates in via
  IntersectionObserver the first time it enters the viewport (ports the mockup's
  `.reveal`/`.reveal.is-in` pattern; a no-op under `prefers-reduced-motion: reduce`). Used
  throughout `LandingPage` for section-heads/cards/tables — not used anywhere in the authenticated
  app, where content should just be there, not animate in on scroll.
- `LangOverlay` (`components/LangOverlay/LangOverlay.tsx`) is the once-only language picker for
  `LandingPage`, gated on `localStorage['diff-lang-chosen']`; calls `setLanguage()` (from
  `i18n.ts`) on choice. Only rendered by `LandingPage`; the persistent switcher everywhere else is
  `LangToggle` (`components/LangToggle/`, in `AppShell`'s nav, the landing nav and the auth screens).
- **`client/src/App.tsx`** — now mounted only at `/showcase` (see
  `.claude/rules/frontend/routing-and-auth.md`); still a kitchen-sink page rendering primitives
  from the component library, not a real app screen.
