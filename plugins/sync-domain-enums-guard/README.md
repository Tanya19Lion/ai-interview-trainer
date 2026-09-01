# sync-domain-enums-guard

## Purpose

A Claude Code plugin that guards against `TOPICS`/`LEVELS` enum drift between this repo's
client and server domain types (`client/src/types/interview.ts` and
`src/models/InterviewSession.ts`). The two arrays are declared independently with no shared
package importing one from the other, so `tsc` cannot catch a mismatch — drift only surfaces
later as a Mongoose `ValidationError` or a silent UI bug.

This plugin is **repo-specific**: the file paths above are hardcoded into the skill and hook
scripts. It isn't meant to be generic across projects — it packages this repo's existing
`sync-domain-enums` enforcement (skill + two Claude Code hooks) into an installable unit instead
of files loose in `.claude/`.

The underlying `check_enums.py` script is also the one invoked directly by `.husky/pre-commit`
at commit time — that git hook works for every contributor regardless of whether this plugin is
installed. The plugin's hooks only add an earlier, in-session warning during a Claude Code
session.

## Install

Register `sync-domain-enums-guard: true` under `enabledPlugins` in `.claude/settings.json` (or
`.claude/settings.local.json` for a personal-only install), then run `/reload-plugins`. No
`marketplace.json` is defined for this repo, so the plugin is picked up directly from the local
`plugins/` directory by name — no `@marketplace` suffix is needed on the key.

## Commands

-

## Skills

- **`sync-domain-enums`** (invoked as `/sync-domain-enums-guard:sync-domain-enums`) — a checklist
  for safely adding/renaming/removing enum values, plus the known gotchas observed in this repo.
  See `skills/sync-domain-enums/SKILL.md`.

## Hooks

- **`PostToolUse`** (`hooks/scripts/post_tool_use_enum_check.py`) — re-runs the drift check
  immediately after any Edit/Write on either enum file, surfacing drift in-session instead of
  only at commit time.
- **`PreToolUse`** (`hooks/scripts/pre_tool_use_block_no_verify.py`) — denies
  `git commit --no-verify`/`-n`, since that would silently bypass the `.husky/pre-commit` gate
  that also runs this same check.