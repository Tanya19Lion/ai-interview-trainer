#!/usr/bin/env python3
"""Diff the TOPICS/LEVELS `as const` arrays between client and server.

Usage: python check_enums.py [repo_root]
Exit code 0 = in sync, 1 = drift found, 2 = couldn't parse one of the files.
"""

import re
import sys
from pathlib import Path

CLIENT_REL = "client/src/types/interview.ts"
SERVER_REL = "src/models/InterviewSession.ts"

# Matches `export const NAME = [ ... ] as const;` across single or multiple lines,
# tolerating single/double quotes, trailing commas, and comments on their own line.
ARRAY_RE = re.compile(
    r"export\s+const\s+(TOPICS|LEVELS)\s*=\s*\[(?P<body>.*?)\]\s*as\s+const",
    re.DOTALL,
)
STRING_ITEM_RE = re.compile(r"""['"]([^'"]+)['"]""")


def extract_enums(text: str) -> dict[str, list[str]]:
    enums: dict[str, list[str]] = {}
    for match in ARRAY_RE.finditer(text):
        name = match.group(1)
        body = match.group("body")
        enums[name] = STRING_ITEM_RE.findall(body)
    return enums


def load(path: Path) -> dict[str, list[str]]:
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(2)
    return extract_enums(path.read_text(encoding="utf-8"))


def diff_report(name: str, client_values: list[str], server_values: list[str]) -> bool:
    """Print a report for one enum; return True if it's in sync."""
    client_set, server_set = set(client_values), set(server_values)
    only_client = client_set - server_set
    only_server = server_set - client_set

    if not only_client and not only_server:
        print(f"[OK] {name}: in sync ({len(client_values)} values)")
        return True

    print(f"[DRIFT] {name}: client and server disagree")
    if only_client:
        print(f"  present in client only: {sorted(only_client)}")
    if only_server:
        print(f"  present in server only: {sorted(only_server)}")
    return False


def main() -> int:
    repo_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    client_path = repo_root / CLIENT_REL
    server_path = repo_root / SERVER_REL

    client_enums = load(client_path)
    server_enums = load(server_path)

    ok = True
    for enum_name in ("TOPICS", "LEVELS"):
        if enum_name not in client_enums:
            print(f"ERROR: could not find `{enum_name}` in {client_path}", file=sys.stderr)
            return 2
        if enum_name not in server_enums:
            print(f"ERROR: could not find `{enum_name}` in {server_path}", file=sys.stderr)
            return 2
        in_sync = diff_report(enum_name, client_enums[enum_name], server_enums[enum_name])
        ok = ok and in_sync

    if ok:
        print("\nAll enums in sync.")
        return 0
    print("\nDrift found - see plugins/sync-domain-enums-guard/skills/sync-domain-enums/SKILL.md checklist to fix.")
    return 1


if __name__ == "__main__":
    sys.exit(main())