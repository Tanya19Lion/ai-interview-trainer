#!/usr/bin/env python3
"""PreToolUse hook: deny `git commit --no-verify` / `-n`, which would skip the
.husky/pre-commit sync-domain-enums gate without the user's explicit say-so.

Tokenizes with shlex rather than regex-searching the raw string, so `-n` inside
a quoted commit message (e.g. `git commit -m "fix -n flag parsing"`) is not
mistaken for the flag.
"""
import json
import shlex
import sys

SEPARATORS = {"&&", "||", ";", "|"}


def commit_has_no_verify(command: str) -> bool:
    try:
        tokens = shlex.split(command, posix=True)
    except ValueError:
        tokens = command.split()

    for i in range(len(tokens) - 1):
        if tokens[i] != "git" or tokens[i + 1] != "commit":
            continue
        j = i + 2
        while j < len(tokens) and tokens[j] not in SEPARATORS:
            tok = tokens[j]
            if tok == "--no-verify":
                return True
            if tok.startswith("-") and not tok.startswith("--") and "n" in tok[1:]:
                return True
            j += 1
    return False


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        print("{}")
        return 0

    command = (data.get("tool_input") or {}).get("command") or ""
    if commit_has_no_verify(command):
        print(json.dumps({
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": (
                    "git commit --no-verify/-n skips the sync-domain-enums pre-commit "
                    "gate (.husky/pre-commit). Ask the user explicitly before bypassing it."
                ),
            }
        }))
    else:
        print("{}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
