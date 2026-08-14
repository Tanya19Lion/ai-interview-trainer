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
  `FeedbackCard/`, `SessionSummary/`; app-shell: `AppShell/`), each with a `.tsx` and a
  co-located CSS Module (`.module.css`) that consumes the tokens from
  `client/src/styles/tokens.css`. All exports are re-exported centrally through
  `client/src/components/index.ts` — when adding a new component, export it there too.
  `EditorComment` (the yellow "AI reviewer" callout) is shared between `FeedbackCard` and
  `LoginPage`'s ambient decoration — reach for it instead of re-copying that callout markup.
  `AppShell` is routing-aware (renders `<Outlet />` internally, reads `useMe`/`useLogout`) rather
  than a pure presentational component — see `.claude/rules/frontend/routing-and-auth.md`.
- **`client/src/App.tsx`** — now mounted only at `/showcase` (see
  `.claude/rules/frontend/routing-and-auth.md`); still a kitchen-sink page rendering primitives
  from the component library, not a real app screen.
