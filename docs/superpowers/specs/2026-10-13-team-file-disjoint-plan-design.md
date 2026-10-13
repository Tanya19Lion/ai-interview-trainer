# Design: reusable file-disjoint team-planning command + team hooks

Date: 2026-10-13
Status: approved (chat design), pending implementation plan

## Problem

We want to work with Claude Code agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`,
already set in `.claude/settings.json`). For a team to work safely and in parallel, each
teammate needs a task whose file set does not overlap with any other open task's file set,
and dependencies between tasks must be explicit. Contracts between layers (e.g. API shape
shared between backend and client) must be negotiated directly between teammates via
`SendMessage`, not relayed through the lead. Work quality (tests, migrations rules, enum
sync, no file overlap) must be enforced automatically, not by trusting teammates' self-reports.

Team hooks (`TaskCreated`, `TaskCompleted`, `TeammateIdle`) are the only automatic
enforcement point available: they fire on every occurrence (no matcher support), and exit
code 2 lets a hook reject the action with stderr fed back as feedback.

## Constraints discovered during research (verified against official docs, 2026-10-13)

- Hook stdin payload for all three events contains only `task_id`, `task_subject`,
  `task_description` (may be absent), `teammate_name` (may be absent), `team_name`
  (deprecated), `agent_id`. **No file list, no sibling-task list.**
- `TaskCreated` exit 2 → task is deleted, stderr returned as tool error.
- `TaskCompleted` exit 2 → task not marked complete, stderr fed back.
- `TeammateIdle` exit 2 → teammate kept working, stderr fed back as feedback.
- `SendMessage` writes to `~/.claude/teams/{team-name}/inboxes/{agent-name}.json` — one
  recipient per call, **no broadcast**.
- `{team-name}` is session-derived (`session-` + 8 chars of session id), not user-set.
- Claude's own task storage (`~/.claude/tasks/{team-name}/`) has an **undocumented internal
  file layout** that may change between versions — hooks must not depend on it.

Because hooks cannot see file lists or sibling tasks, the file-disjoint guarantee and the
anti-idle check cannot be derived from Claude's own state. They are built on two things we
control ourselves:

1. A **fixed JSON-block convention** inside `task_description` that the lead must follow
   when creating every task.
2. A **self-maintained ledger file**, written only by our own hooks, that is the sole source
   of truth for "which files are currently claimed" and "which teammate still has an open
   task."

This is a deliberate scope limit: any task created without the JSON-block convention (by a
future, different workflow) is invisible to these hooks. Accepted — all tasks in this team
go through this convention by agreement.

## Components

### 1. `/team-plan` command (`.claude/commands/team-plan.md`)

Reusable, generic — takes a feature description as an argument. Plan-only: it does **not**
spawn the team or create tasks itself; that is a separate, deliberate next step the user
takes afterward.

Behavior:
- Reads the feature description and the repo's actual layer structure (`src/` backend,
  `client/` frontend, `docs/`).
- Produces a file-disjoint task breakdown, each task tagged with one of three fixed owners:
  `backend`, `client`, `docs`.
- Writes the plan to `docs/features/<slug>/team-plan.md` as human-readable markdown. Each
  task entry embeds the JSON block (see below) ready to paste into `TaskCreate`'s
  description when the user later decides to launch the team.
- Flags cross-layer dependencies explicitly (e.g. "client task depends on backend's
  response shape") and marks which of those need a negotiated contract.

### 2. Task JSON-block convention

Every task's `description` must contain exactly one fenced JSON block:

```json
{
  "owner": "backend|client|docs",
  "files": ["src/...", "client/src/..."],
  "requires_contract": false,
  "contract_path": null
}
```

A task description without a valid block, or with `owner` outside the fixed set, is
rejected at `TaskCreated` — this is the "garbage task" filter.

### 3. Ledger (`.claude/hooks/team-state/<team_name>/ledger.json`)

Written and read only by our own hooks (never Claude's internal task files):

```json
{
  "tasks": {
    "<task_id>": {
      "owner": "backend",
      "files": ["..."],
      "teammate_name": "...",
      "status": "open|done"
    }
  }
}
```

### 4. Hooks (Python, `python3`/`python` fallback — matches the existing
`PY=python3; command -v python3 >/dev/null 2>&1 || PY=python` pattern already used for
`SessionStart` in `.claude/settings.json`)

**`.claude/hooks/team/task_created.py`**
- Parses the JSON block from `task_description`.
- Rejects (exit 2) if: block missing/invalid, `owner` not in `{backend, client, docs}`,
  any file in `files` overlaps with the `files` of any ledger entry with `status: open`, or
  (`requires_contract: true` and `contract_path` file does not exist or is empty).
- Otherwise appends `{task_id: {..., status: "open"}}` to the ledger and exits 0.

**`.claude/hooks/team/task_completed.py`**

Two gate steps, both must pass:

1. **Test-coverage check:** among the task's `files` (from ledger), at least one file must
   match a test pattern for its owner (`*.test.ts`, `*.spec.ts`, `__tests__/**` for
   backend/client — docs tasks are exempt from this step). Missing → exit 2, stderr:
   `"No test file declared for this task — write tests alongside the implementation before
   completing."`
2. **Test-run + layer gate:**
   - `backend`: `npx tsc --noEmit && npx eslint . && npx vitest run`
   - `client`: `cd client && npm run build && npm test`
   - `docs`: if any file in the task touches `src/models/*.ts`, verify `docs/data-model.md`
     has a new dated Schema-change log entry (grep for today's date + "Rollback")
   - always, regardless of owner: run the existing `check_enums.py` enum-drift check
   - Any failure → exit 2, stderr: `"Tests are red: <first lines of failure output>"` (or
     the specific lint/enum/migration error). Ledger entry stays `status: open`; the same
     teammate gets the feedback and naturally retries on their next `TaskComplete` call —
     no extra retry bookkeeping needed.

Only when both steps pass does the ledger entry flip to `status: done`.

**`.claude/hooks/team/teammate_idle.py`**
- Looks up ledger entries where `teammate_name` matches stdin's `teammate_name` and
  `status == "open"`.
- Any match → exit 2, stderr: `"You still have an open task <task_id> — finish it before
  going idle."`
- No match → exit 0.

### 5. Contract negotiation (direct, not via the lead)

When the plan marks a task `requires_contract: true`, the lead's job is limited to: create
both sides' tasks with matching `contract_path`, and instruct (in each task's description)
"negotiate the shape directly with `<other teammate_name>` via SendMessage; write the agreed
shape to `<contract_path>` before implementing." The lead takes no part in the negotiation
itself. The dependent task's `TaskCreated` hook enforces the ordering by refusing to create
until `contract_path` exists and is non-empty — this is the mechanism that keeps the
negotiation strictly peer-to-peer instead of lead-mediated.

### 6. Settings wiring

Three new keys under `"hooks"` in `.claude/settings.json`: `TaskCreated`, `TaskCompleted`,
`TeammateIdle`. None carries a `"matcher"` (not supported for these events — silently
ignored if present, so it is simply omitted). Each uses the same
`PY=python3; command -v python3 >/dev/null 2>&1 || PY=python; "$PY" "$CLAUDE_PROJECT_DIR/.claude/hooks/team/<script>.py"`
invocation already established for `SessionStart`.

## Out of scope

- Actually launching the team (Agent tool calls, `TaskCreate` calls) — a separate, explicit
  step after this command produces a plan.
- Any task created outside the JSON-block convention — invisible to these hooks by design.
- Reading Claude's internal `~/.claude/tasks/{team-name}/` files — never done, since the
  format is undocumented and may change.
