---
paths:
  - "client/src/components/**/*"
  - "client/src/App.tsx"
---

# Component library

- **`client/src/components/`** — the design-system component library, one folder per component
  (primitives: `Button/`, `Badge/`, `EditorWindow/`, `CodeDiffLine/`, `Eyebrow/`, `Spinner/`,
  `Textarea/`; interview-flow-specific: `TopicPicker/`, `LevelPicker/`, `ProgressSegments/`,
  `QuestionCard/`, `AnswerForm/`, `FeedbackCard/`, `SessionSummary/`), each with a `.tsx` and a
  co-located CSS Module (`.module.css`) that consumes the tokens from
  `client/src/styles/tokens.css`. All exports are re-exported centrally through
  `client/src/components/index.ts` — when adding a new component, export it there too.
- **`client/src/App.tsx`** — now mounted only at `/showcase` (see
  `.claude/rules/frontend/routing-and-auth.md`); still a kitchen-sink page rendering primitives
  from the component library, not a real app screen.
