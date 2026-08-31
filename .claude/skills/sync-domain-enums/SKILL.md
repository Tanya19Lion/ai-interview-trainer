---
name: sync-domain-enums
description: Use when adding, renaming, or removing a value in the interview domain's TOPICS or LEVELS enums, or any other field that the client and server define independently for the same interview session shape. In this repo, client/src/types/interview.ts and src/models/InterviewSession.ts declare TOPICS/LEVELS as two separate `as const` arrays with no shared package importing one from the other — tsc cannot catch a mismatch between them because the two projects compile independently. Use this skill before considering such a change done, and also when reviewing a diff that touches either file, to check for drift that would otherwise only surface as a runtime Mongoose validation error or a silent UI bug.
---

# Sync domain enums (client ↔ server)

## Checklist

- [ ] Open both enum sources and list their values side by side:
      - `client/src/types/interview.ts` — `TOPICS`, `LEVELS`
      - `src/models/InterviewSession.ts` — `TOPICS`, `LEVELS`
- [ ] Confirm every value in one array also appears in the other (order doesn't matter, membership does). Flag any value present on only one side.
- [ ] If you are adding/removing a value rather than just checking, apply the same change to both files in the same pass — don't land one side and leave the other for later.
- [ ] Grep the client for other places a topic/level list is hardcoded, since a couple of client files are typed against `Topic`/`Level` and will only self-correct if you actually add the new key:
      - `client/src/lib/topicLabel.ts` — `TOPIC_LABEL: Record<Topic, string>`
      - `client/src/components/TopicPicker/TopicPicker.tsx` — `TOPIC_META: Record<Topic, {...}>`
      These are `Record<Topic, ...>`, so `tsc -b` in `client/` *will* fail loudly if you forget a key — but only once you've actually added the new value to `TOPICS`. Don't skip filling them in and rely on the compiler alone; the error message won't tell you which file needs the new key, only that one is missing it.
- [ ] Grep the rest of `client/src` and `src/` for the literal topic/level strings (e.g. `'react'`, `'junior'`) outside the two source-of-truth arrays, in case a value is duplicated somewhere not typed against `Topic`/`Level` (a raw string union, a switch statement, a select option list) — those won't be caught by anything.
- [ ] Run both verification blocks from `.claude/commands/scaffold-verify.md` (or `/scaffold-verify`) — `tsc -b` in `client/` and `tsc --noEmit` at the repo root — to catch every compiler-enforced spot before assuming the sync is complete.
- [ ] Mentally trace what happens if a topic/level is sent by the client but missing from the server's `enum: TOPICS`/`enum: LEVELS` Mongoose validator (or vice versa): the server request fails at `.save()` with a Mongoose validation error, not at request-parsing time — this is the one class of drift that no `tsc` run will ever catch, so it's worth double-checking by eye every time, not just trusting green type-checks.

## Gotchas (observed in this repo)

- **The client/server enum arrays have zero compiler coupling.** `client/src/types/interview.ts` and `src/models/InterviewSession.ts` each declare their own `TOPICS`/`LEVELS` as `as const` arrays — neither imports the other (`ARCHITECTURE.md` and `.claude/rules/backend/data-model.md` both call this out explicitly as a manual-sync point). Adding a topic on one side and forgetting the other produces **zero build errors on either side** — `client`'s `tsc -b` and root `tsc --noEmit` both pass clean, because each project only checks its own array against its own usages. The drift only shows up later as a Mongoose `ValidationError` at `.save()` time, or as a client UI offering a topic the server silently rejects.
- **`correctAnswer` was already dropped once by exactly this kind of asymmetry.** Per `.claude/rules/backend/data-model.md`: `ai.service.ts`'s `reviewAnswer()` always computed `correctAnswer`, but `submitAnswer` originally stripped it before `session.questions.push(...)`, so it never reached the database — visible only transiently in the live `SubmitAnswerResponse`, not in any persisted history. Nothing failed loudly; `ReviewModal`'s diff card just quietly had no data to show. Treat any field that exists in more than one place in the request/response/persistence chain with the same suspicion as the enum arrays — the failure mode is silent, not a compile error.
- **Don't assume `Record<Topic, ...>` maps need the same manual double-checking as the raw arrays.** `TOPIC_LABEL` and `TOPIC_META` *are* structurally tied to `Topic` via TypeScript's `Record<Topic, X>`, so a missing key is a real `tsc` error, not a silent gap — treat those two as "compiler will catch it," and spend your manual-review effort on the client/server array pair and any Mongoose-only validation instead.

## Automated enforcement

- `.husky/pre-commit` runs `scripts/check_enums.py` on every commit and **blocks the commit**
  (non-zero exit, drift report printed) if `TOPICS`/`LEVELS` disagree between
  `client/src/types/interview.ts` and `src/models/InterviewSession.ts`. No skip marker — a
  one-sided WIP change to either file must be finished (or the enum edit reverted) before it can
  be committed.
- This is wired through [husky](https://typicode.github.io/husky/): the root `package.json` has a
  `"prepare": "husky"` script and `husky` in `devDependencies`, and `.husky/pre-commit` is
  committed to the repo. Running `npm install` at the repo root (which every contributor already
  needs to do) runs `prepare`, which points git's `core.hooksPath` at `.husky/_` — so the gate is
  live for everyone after a normal clone + install, with no extra manual step.
- Two Claude Code hooks (`.claude/settings.json`, scripts under `.claude/hooks/`) reinforce the
  same gate for Claude sessions specifically: a `PostToolUse` hook
  (`post_tool_use_enum_check.py`) re-runs `check_enums.py` immediately after any Edit/Write on
  either enum file, so drift surfaces in-session instead of only at commit time; a `PreToolUse`
  hook (`pre_tool_use_block_no_verify.py`) denies any `git commit --no-verify`/`-n` Bash call,
  closing the obvious way to bypass the husky gate. Both are session-local (Claude Code hooks, not
  git hooks) — they don't affect commits made outside Claude Code.
