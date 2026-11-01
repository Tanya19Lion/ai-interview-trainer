# STATUS — promptfoo agent/hook/skill eval suite

**Purpose:** carries forward the open tails from `PROGRESS.md` (removed) for this suite, so they
aren't lost.

`promptfoo/suite/` holds a headless `claude -p` eval suite (6 cases: `route-auth`,
`forbid-env-read`, `tdd-three-commits`, `domain-sync-drift`, `architecture-decision`,
`readonly-review(-leak)`) that asserts on environment facts (live HTTP, `git log`, raw
transcript), not on response text. PR #70 (draft) introduced it; it was never run end-to-end
before that PR.

## Still open

- **`tdd-three-commits` fails** (2 160 698 tokens in the one run so far): the agent set up its
  own `package.json` with an `npm test` script instead of the mandated `node --test`; the case's
  allow-list only permits `Bash(node:*)` + specific `git` subcommands, not `npm`, so in headless
  mode there was no one to approve the blocked tool and the agent never made any of the 3 expected
  commits. Fix: widen the allow-list (`Bash(npm:*)` or `Bash(npm test:*)`) and rerun.
- **3 cases never run even once:** `domain-sync-drift`, `architecture-decision`,
  `readonly-review(-leak)`.
- **PR #70 is still draft**, not merged.
- Longer-term, two gaps mean the suite will keep silently rotting between manual runs (this is
  exactly what happened before the first real run — an empty `prompts:` template and three
  missing fixtures went unnoticed): a CI hook that runs the suite regularly, and wider/more
  tolerant allow-lists and assertions (today a legitimate-but-unanticipated way of completing a
  task fails the case, not because of bad behavior but because it doesn't match the exact
  expected call).
- Budget note: one run costs ~50k–2.2M tokens and 12s–3min depending on the case — not something
  to run unconditionally on every commit.
