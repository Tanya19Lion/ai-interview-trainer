---
status: Todo
owner: "Tanya19Lion"
reviewers: ["Tech Lead"]
updated_at: "2026-09-10"
feature_size: S
stage: "08"
ticket: "<TBD>"
---

# T11 — Manual QA: WCAG AA contrast audit

## Links

- PRD: [../PRD.md](../PRD.md) AC-05, §7 KPI "Feedback readability incidents"
- SAD: [../sad.md](../sad.md) §1 Stakeholders (Tech Lead owns this audit), §5 "WCAG AA spot-check on the new cream canvas" (author's own spot-check — not a substitute for this audit), §10 QG-4

## Scope

Manual QA pass: audit AI-generated feedback (text, code highlighting, strength/weakness badges) for WCAG AA contrast (≥4.5:1 for body text) in both light and dark themes, using the actual rendered app against the T4 token values — not the author's spot-check numbers alone.

This is the audit SAD §1/§8 assigns to the Tech Lead owner and treats as closing PRD §8's open question — not optional polish.

## Deps

T4.

## DoD

- [ ] Audit performed across both themes on real rendered feedback content.
- [ ] 0 contrast failures logged, or each failure has a follow-up token fix before this task is marked done.
- [ ] Signed off by Tech Lead (SAD §1 stakeholder table).
