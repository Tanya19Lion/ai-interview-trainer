---
status: Living
updated_at: "2026-09-05"
---

# Domain Context

<!-- Operational status (implementation progress, unverified areas, where to debug) lives in
     STATUS.md in this folder, not here — this file is domain vocabulary only. -->

## Glossary

- interview session — один прохід користувача від старту до завершення, що складається з до 5
  AI-оцінених відповідей.
- question attempt — один запис питання та відповіді користувача в межах interview session, з
  AI-оцінкою та виявленими weak topics. NOT interview session (одна сесія містить до 5 question
  attempts).
- correctAnswer — еталонна відповідь, яку AI генерує під час оцінювання для порівняння в
  ReviewModal. NOT answer (фактична відповідь користувача на question attempt — це інше поле,
  саме їх плутанина викликала історичний баг).
- weak topic — конкретна знаннієва прогалина, яку AI виявляє в окремій відповіді користувача. NOT
  topic (предметна область всієї сесії, обирається один раз на початку, тоді як weak topic —
  виявляється заднім числом на відповідь).
- topic — предметна область, обрана користувачем один раз на всю interview session. NOT weak
  topic (виявлена AI прогалина в окремій відповіді, без прямого зв'язку з обраним topic сесії).
