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
- **Project-level docs** (repo root): `SPEC.md` (goals/non-goals/technical decisions/acceptance
  criteria), `ARCHITECTURE.md` (layered-backend pattern and the `routes → controllers → services
  → models` dependency rule), `docs/adr/` (architecture decision records, starting with
  `0001-initial-setup.md`). Read these before proposing an architectural change — a new ADR
  should follow when a decision recorded there is revisited.
- **Root `Makefile`** now also exposes app-level targets alongside the existing sandbox/firewall
  verification ones: `make dev` (server, `tsx watch`), `make dev-client` (client Vite dev
  server), `make test` (server unit tests), `make migrate` (currently a documentation stub — see
  `docs/adr/0001-initial-setup.md` for why there's no formal migration tool yet).
