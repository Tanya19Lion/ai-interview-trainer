---
name: sdlc-audit
description: Inspects a feature's SDLC artifact map (idea-brief, PRD, SAD, ADRs, data-model, openapi.yaml, api-sync-report, tasks/, CONTEXT) under docs/features/<feature>/, reporting which artifacts are missing or stale and what breaks when each is skipped. Use whenever the user asks to audit documentation completeness, check artifact drift, review SDLC hygiene for a feature/module, or asks "what docs are we missing for X" — even if they don't name a specific artifact.
---

## What this skill does

This is an **inspection** skill, not a workflow skill: it never creates, edits,
or scaffolds artifacts. It only scans, classifies, and reports. Point it at a
feature and it tells you what documentation exists for that feature, what's
missing, and what's gone stale relative to the code.

The reason this matters in this repo specifically: `client/src/types/interview.ts`
and `src/models/InterviewSession.ts` type the interview domain independently, by
hand, with no shared package (see `ARCHITECTURE.md`, `CLAUDE.md`, `docs/adr/0001-initial-setup.md`).
That gap already caused a real bug — `correctAnswer` was computed in
`ai.service.ts` but never persisted through `submitAnswer`, silently breaking
`ReviewModal`'s diff rendering (recorded in `PROGRESS.md`). Nothing in the repo
checks this systematically for a whole feature; `plugins/sync-domain-enums-guard/`
only guards specific enums. This skill is the systemic check.

## SDLC phase pipeline

This project's SDLC is role-based, not stage-based:

`PM -> BA/PO -> Architect -> TL+devs -> devs -> Review -> QA -> Docs+Deploy -> Monitor`

Each artifact below is tagged with the phase whose role owns producing (or
consuming) it. Not every phase produces a tracked artifact — `devs` (writes
the code itself, no separate doc), `QA` (runs tests; this repo has no test
artifact convention yet), and `Monitor` (no observability doc tracked yet)
currently own none of the 9. That's a legitimate finding in its own right if
the audit is ever extended to cover those phases.

## The 9 artifacts

Each artifact is expected under `docs/features/<feature>/` unless the user
names a different documentation root.

| # | Artifact | Expected path | SDLC phase | Contract it holds |
|---|----------|----------------|------------|--------------------|
| 1 | idea-brief | `idea-brief.md` | PM | Captures the problem/motivation before requirements are formalized |
| 2 | PRD | `PRD.md` | BA/PO | The "what" contract between product intent and engineering |
| 3 | SAD (Software Architecture Doc) | `SAD.md` | Architect | The "how" contract between requirements and implementation; should stay consistent with the repo's `ARCHITECTURE.md` |
| 4 | adr/ | `adr/` (or an entry in the repo-root `docs/adr/` tagged to this feature) | Architect | Records irreversible decisions and rejected alternatives so they aren't silently re-litigated |
| 5 | data-model | `data-model.md` | Architect | Contract between the SAD and the actual Mongoose schemas in `src/models/*.ts` |
| 6 | openapi.yaml | `openapi.yaml` | Architect | Contract between `src/routes/*.routes.ts` + `src/controllers/*` and `client/src/api/*.ts` — the exact layer where the `correctAnswer` mismatch happened; this is the handoff artifact Architect gives to TL+devs before implementation starts |
| 7 | api-sync-report | `api-sync-report.md` | Review | Explicit check that client types (`client/src/types/*.ts`) and server types (`src/models/*.ts`) are still in sync — the gate a PR reviewer should consult before approving, since this is exactly the check that would have caught the `correctAnswer` bug pre-merge |
| 8 | tasks/ | `tasks/` | TL+devs | Traces PRD line items to actual code changes; produced when the tech lead breaks the PRD/SAD down into work devs pick up |
| 9 | CONTEXT | `CONTEXT.md` | Docs+Deploy | Feature-level analogue of the repo-root `PROGRESS.md` — "how to pick this back up" |

## exists / missing / stale criteria

- **missing** — the path does not exist.
- **exists** — the file/dir exists and its latest commit is not older than the
  latest commit touching the feature's related code paths.
- **stale** — the file/dir exists but the feature's code changed more recently
  than the artifact. Determine this by comparing:
  - `git log -1 --format=%ct -- <artifact path>`
  - `git log -1 --format=%ct -- <related code paths>`

  If the code timestamp is greater, mark the artifact `stale`.

  Get "related code paths" for the feature from the `paths:` frontmatter of
  the matching files under `.claude/rules/backend/*.md` and
  `.claude/rules/frontend/*.md` — reuse that existing path-scoping mechanism
  instead of guessing globs. If no rule file covers the feature, ask the user
  which glob(s) count as "this feature's code."

## Protocol

1. **Select a feature.** Take it from the invocation argument, or ask the user
   if none was given.
2. **Resolve the feature's code paths** via `.claude/rules/backend/*.md` and
   `.claude/rules/frontend/*.md` frontmatter (fall back to asking the user).
3. **Scan the 9 artifact paths** under `docs/features/<feature>/` (or the
   documentation root the user specifies).
4. **Classify each as exists/missing/stale** using the criteria above (one
   `git log` per artifact and per code-path group).
5. **Emit the status table** (format below).
6. **Give 3-5 lines of recommendations**, most critical omission first.
   Weight artifacts whose absence has already caused a real bug in this repo
   highest — `openapi.yaml` and `api-sync-report` sit directly on the
   client/server contract that broke once already (`correctAnswer` /
   `ReviewModal`), so a missing or stale one there is a higher-severity
   finding than a missing `idea-brief`.

## Output format

ALWAYS end with exactly these two sections:

### Status table

| Phase | Artifact | Container (path) | Status | Consequence of omission |
|-------|----------|-------------------|--------|--------------------------|

One row per artifact, all 9 rows present even if the whole `docs/features/<feature>/`
directory doesn't exist (everything reports `missing` in that case — don't skip
the scan just because the directory is absent).

### Recommendations

3-5 lines, ordered most-critical-first, each naming the specific artifact and
the concrete risk of leaving it missing/stale.