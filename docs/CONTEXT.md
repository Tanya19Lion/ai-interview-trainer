---
status: Living
updated_at: "2026-09-09"
---

# Domain Context

<!-- Project-level domain vocabulary — shared by docs/PRD.md and docs/sad.md. Feature-scoped
     glossaries (docs/features/*/CONTEXT.md) may add feature-internal terms on top of this;
     when a term here changes meaning, update it here first, then re-check features that cite it. -->

## Glossary

| Term | Meaning |
|---|---|
| Job-seeker | The single end-user role of the product — a person practicing for a technical interview by running sessions and reading AI feedback. There is no second role (admin/reviewer/team) in this product (PRD §3 non-goals). |
| Interview session | One run by a job-seeker from start to completion, consisting of up to 5 question attempts, one topic, and one level (`src/models/InterviewSession.ts`). |
| Question attempt | One recorded question+answer pair within an interview session, carrying an AI score, feedback text, correct answer, and detected weak topics. NOT interview session (one session holds up to 5 question attempts). |
| Correct answer | The reference answer AI generates during evaluation, shown for comparison against the job-seeker's own answer (`ReviewModal`). NOT answer (the job-seeker's actual submitted text is a separate field — conflating the two caused a real historical bug, see `plugins/sync-domain-enums-guard`). |
| Weak topic | A specific knowledge gap AI detects in one individual answer. NOT topic (the subject area of the whole session, chosen once at the start, with no direct link to any single weak topic surfaced later). |
| Topic | The subject area a job-seeker chooses once for an entire interview session — one of `react`, `javascript`, `nodejs`, `typescript`, `nextjs`, `css`, `html`, `sql`, `restapi` (`src/models/InterviewSession.ts` `TOPICS`). NOT weak topic. |
| Level | The difficulty tier of a session — `junior`, `middle`, or `senior` (`src/models/InterviewSession.ts` `LEVELS`). |
| Password reset token | A one-time, time-limited token proving ownership of an email address, used to authorize setting a new password. NOT session auth token (the one issued at login that authenticates ongoing requests). |
