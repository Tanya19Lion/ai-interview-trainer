# Idea brief — Interview flow

**Phase:** PM

## Problem

Candidates preparing for technical interviews want realistic, repeatable practice:
a question relevant to a specific topic and seniority level, immediate feedback on
their answer, and a record of what they got wrong so they know what to study next.
Static question banks don't adapt to the answer just given, and don't explain *why*
an answer was wrong.

## Proposed direction

Use an LLM (Anthropic Claude) as both question generator and grader:

- the candidate picks a topic (`react`, `javascript`, `nodejs`, `typescript`,
  `nextjs`, `css`, `html`, `sql`, `restapi`) and a level (`junior`, `middle`,
  `senior`);
- the app runs a fixed-length session (5 questions) instead of an open-ended quiz,
  so a session has a clear start/end and produces one summary score;
- every answer gets a structured review (score 0-10, feedback text, the correct
  answer, and a list of weak sub-topics) instead of just right/wrong, so the
  candidate can act on it later (history, progress tracking).

## Why this is worth building

Differentiates this app from a static flashcard tool: the question set never
repeats verbatim, and the feedback is tailored to what the candidate actually
wrote, not a canned explanation.

## Out of scope for this brief

Pricing/quota on AI calls, multi-language question generation (currently
Ukrainian-only prompts in `ai.service.ts`), and interview formats other than
"one question, one free-text answer" (e.g. live coding, multiple choice).