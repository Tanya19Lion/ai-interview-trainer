---
status: Draft
owner: "<name>"
reviewers: []
updated_at: "<YYYY-MM-DD>"
feature_size: <XS|S|M>
stage: "08"
ticket: "<TBD>"
---

# T<N> — <title>

<!-- Frontmatter carries only status/owner/reviewers/updated_at/feature_size/stage/ticket — NOT
     id/title/deps/estimate. Those live in _epic.md's table and tracker.md, not duplicated here
     in structured form; `feature_size` here is this ONE task's own XS/S/M size, not the whole
     feature's. -->

## Links

- PRD: [../PRD.md](../PRD.md) <AC-N, §N>
- ADR (if relevant): [../adr/NNNN-<title>.md](../adr/NNNN-<title>.md)
- SAD: [../sad.md](../sad.md) <§5 module, §6 sequence, §10 QG-N>
- Data model / contract (if relevant): [../data-model.md](../data-model.md), [../contracts/openapi.yaml](../contracts/openapi.yaml)
- Rule (if relevant): `.claude/rules/<path>.md`

<!-- Link, don't duplicate — a one-line "what this points to" per link is fine; pasting the
     PRD's AC text or the SAD's sequence diagram here is the anti-pattern this skill exists to
     avoid ("story лінкує, не дублює"). -->

## Scope

<What file(s)/module(s) this task touches, and the specific behavior it adds — concrete enough
that a reviewer can judge PR completeness without re-reading every upstream artefact.>

## Deps

<Comma-separated task IDs this depends on, e.g. "T1, T2." — or "None."/"—" if none.>

## DoD

- [ ] PR merged.
- [ ] <Testable condition #1 — a concrete behavior, status code, or measurable check, not
      "works correctly".>
- [ ] <Testable condition #2.>
- [ ] <Reference to a dedicated test task if this task's own tests live there instead of inline,
      e.g. "Unit tests ([unit-tests-<topic>.md](./unit-tests-<topic>.md)) pass." — matching how a
      shared test-layer task is referenced by every task whose code it covers, rather than each
      one embedding its own ad-hoc test bullet.>

## Out of scope

<What this task deliberately does NOT do, especially anything a reader might assume it covers —
usually pointing at the task ID that does own it instead.>
