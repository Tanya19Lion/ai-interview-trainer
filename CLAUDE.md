# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo holds a real full-stack app. Two things live side by side at the root, and it's easy
to confuse them:

- **Root-level `src/`, `package.json`, `tsconfig.json`, `eslint.config.js`** — the real backend,
  `ai-interview-trainer-server`: Express + TypeScript + MongoDB (Mongoose), living at repo root
  (not inside a `server/` subfolder). See `.claude/rules/backend/` for details (topic files,
  path-scoped, auto-loaded when Claude reads matching files under `src/`).
- **`client/`** — the real Vite + React 19 + TypeScript app, the actual frontend for the `src/`
  backend above. See `.claude/rules/frontend/` for details (topic files, path-scoped,
  auto-loaded when Claude reads matching files under `client/`).

The repo also has a devcontainer-based sandbox (`.devcontainer/`, `tests/*.test.sh`, `Makefile`)
for verifying the dev container's network firewall and filesystem sandbox — unrelated to app
logic. `make help` lists the verification targets; only touch this when asked to work on sandbox/
firewall policy, not for ordinary feature work.

## Working in this repo

- For `client/` and server verification commands, see `.claude/rules/frontend/overview.md` and
  `.claude/rules/backend/overview.md`.
- The client and server type the interview domain independently (`client/src/types/interview.ts`
  vs. `src/models/InterviewSession.ts`'s Mongoose schemas) — there's no shared package, so a
  field/enum change on one side (e.g. adding a `TOPICS`/`LEVELS` value) must be applied to both
  by hand.
- Auth is real end-to-end: `POST /api/auth/google` (Google OAuth), `POST /api/auth/register` /
  `POST /api/auth/login` (email+password, `bcryptjs`-hashed). The old client-side `devLogin` /
  `/api/auth/dev-login` stub described in earlier docs has been removed — don't reintroduce it.
- **`PROGRESS.md`** (repo root) tracks in-flight work on the repo — check it before starting new
  work so you don't duplicate or skip a step.
- **Project-level docs**: `docs/PRD.md` (goals/non-goals/user stories/acceptance criteria —
  supersedes the old root `SPEC.md`), `docs/sad.md` (arc42-style SAD: layered-backend
  pattern, the `routes → controllers → services → models` dependency rule, C4 diagrams —
  supersedes the old root `ARCHITECTURE.md`), `docs/CONTEXT.md` (project-level domain
  glossary), `docs/adr/` (architecture decision records,
  starting with `0001-initial-setup.md`). Read these before proposing an architectural change —
  a new ADR should follow when a decision recorded there is revisited.
- **Root `Makefile`** now also exposes app-level targets alongside the existing sandbox/firewall
  verification ones: `make dev` (server, `tsx watch`), `make dev-client` (client Vite dev
  server), `make test` (server unit tests), `make migrate` (currently a documentation stub — see
  `docs/adr/0001-initial-setup.md` for why there's no formal migration tool yet).
  
## Merging worktree branches back

- Never merge a branch into local `main` with `git merge`. `main` only changes through
  a pull request merged on GitHub; a local merge makes a second, different commit for
  the same change, and local `main` ends up "ahead" of `origin/main` for good.
- The cycle, per branch: (1) push the named branch, (2) open a draft PR, (3) review
  the diff (`git diff main...<branch>`, three dots, or `/diff`) and merge the PR on
  GitHub, (4) `git pull --ff-only` on `main`. If step 4 refuses to fast-forward,
  local `main` has its own commits: stop and find out why, don't create a merge commit.
- Take one branch at a time, never all at once. Land the first, pull, confirm `main`
  is intact, then take the next. That way you always know which merge broke
  something if anything does.
- Don't commit directly on `main` either. Put every change on a `feat/` or `fix/`
  branch (or a worktree branch) and take it through the cycle above.
- Before pushing a branch, run `git pull` (or `git fetch` and rebase) so other people's
  merges into `main` arrive first and conflicts get resolved locally. Conflicts on
  shared files are the normal cost of parallel work, not a surprise: plan for the
  resolution step.

## Pushing

- Always push to a named branch with an explicit name, for example
  `git push origin worktree-feature-a`. Never push straight to `main`.
- A push hook (`.claude/hooks/block-main-push.sh`) catches an accidental push to
  `main` and stops it. The real protection is server-side branch protection; the
  hook only backs you up against the obvious cases.

## Cleanup

- Push first, then remove. `git worktree remove` (or removing on session exit)
  discards uncommitted work and even commits, so an unpushed branch is lost work.
- Make `git worktree remove` and `git worktree prune` a habit: clean up a
  worktree as soon as you finish with its branch, so the repo never fills up with
  abandoned worktrees.
- A manual `git worktree remove` only removes the directory. The branch stays, so
  delete it separately with `git branch -d <branch>` once it is merged.

## Git

- Commits in Conventional Commits format: `type(scope): description`
  (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Branch names: `feat/<short-name>` or `fix/<short-name>`.
- Open a pull request right after the first clean commit.
- Add a `Co-Authored-By: Claude <noreply@anthropic.com>` trailer to commits you make.
- Never commit `.env`. Only `.env.example` with placeholder values stays in the repo.

## Pull requests

- Platform: GitHub. We open PR via `gh pr create`.
- PR title - in commit format: `type(area): description`.
- PR body: sections "What changed"; "Why"; "How to check"; "Related issues" with the next line `Closes #<issue>`.
- We open a new PR as `--draft` until the work is completed.
