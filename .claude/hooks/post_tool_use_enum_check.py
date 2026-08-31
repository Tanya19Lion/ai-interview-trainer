#!/usr/bin/env python3
"""PostToolUse hook: after Edit/Write on client/server TOPICS-LEVELS enum files,
run check_enums.py immediately and surface drift in-session, instead of waiting
for the .husky/pre-commit gate at commit time.
"""
import json
import os
import subprocess
import sys

WATCHED_SUFFIXES = (
    "client/src/types/interview.ts",
    "src/models/InterviewSession.ts",
)


def repo_root() -> str:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return env
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    return result.stdout.strip() or os.getcwd()


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    file_path = (data.get("tool_input") or {}).get("file_path") or ""
    file_path = file_path.replace("\\", "/")
    if not file_path.endswith(WATCHED_SUFFIXES):
        return 0

    root = repo_root()
    script = os.path.join(root, ".claude", "skills", "sync-domain-enums", "scripts", "check_enums.py")
    result = subprocess.run(
        [sys.executable, script, root], capture_output=True, text=True
    )
    if result.returncode != 0:
        msg = (result.stdout + result.stderr).replace("\n", " ").strip()
        print(json.dumps({"systemMessage": f"TOPICS/LEVELS enum drift: {msg}"}))

    return 0


if __name__ == "__main__":
    sys.exit(main())
