Run type-checking, linting, and build verification for the `ai-interview-trainer` project.

Argument: $ARGUMENTS (optional — `client`, `server`, or empty).

- If $ARGUMENTS is empty — run both blocks below, client first, then server.
- If $ARGUMENTS equals `client` — run only the client block.
- If $ARGUMENTS equals `server` — run only the server block.
- If $ARGUMENTS has any other value — tell the user only `client`/`server`/empty are valid, and run nothing.

Note: the Bash tool's working directory persists across calls, so each block below explicitly `cd`s to the repository root first (via `git rev-parse --show-toplevel`) instead of assuming where the previous block left off.

**Client** (from `client/`):
```bash
cd "$(git rev-parse --show-toplevel)/client" && npx tsc -b --noEmit && npm run lint && npm run build
```

**Server** (from the repository root):
```bash
cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit && npm run lint
```

After running, briefly summarize the result (success/failure, which step and what broke) without repeating the full command output.