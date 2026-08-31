#!/usr/bin/env python3
"""SessionStart hook: surface PROGRESS.md's "Як продовжити" section at session
start, since CLAUDE.md instructs checking it before starting new work in this
client/mockup-parity area.
"""
import json
import os
import subprocess
import sys


def repo_root() -> str:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return result.stdout.strip() or os.getcwd()


def extract_section(text: str, heading: str) -> str:
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip() == heading:
            start = i
            break
    if start is None:
        return ""
    end = len(lines)
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("## "):
            end = i
            break
    return "\n".join(lines[start:end]).strip()


def main() -> int:
    root = repo_root()
    path = os.path.join(root, "PROGRESS.md")
    if not os.path.isfile(path):
        print("{}")
        return 0

    text = open(path, encoding="utf-8").read()
    section = extract_section(text, "## Як продовжити")
    if not section:
        print("{}")
        return 0

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": f"From PROGRESS.md:\n{section}",
        }
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
