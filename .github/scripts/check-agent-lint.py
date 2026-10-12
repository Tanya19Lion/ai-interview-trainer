#!/usr/bin/env python3
"""Compare each .claude/agents/*.md's `tools:` frontmatter with its contract.

The contract mirrors the `expected_tools` vars in promptfoo/suite/promptfooconfig.yaml
(domain-sync-drift, architecture-decision, readonly-review, tdd-three-commits) —
this is the free, zero-token half of that check: no agent run, no promptfoo sandbox,
just the frontmatter as checked-in text.

Prints a report to stdout. Exit 0 = all agents match their contract, 1 = drift
(used by agent-lint.yml).
"""

import glob
import sys

CONTRACT = {
    "architecture-advisor": {"Read", "Grep", "Glob"},
    "domain-sync-keeper": {"Read", "Grep", "Glob", "Write", "Edit"},
    "readonly-reviewer": {"Read", "Grep", "Glob"},
    "tdd-test-writer": {"Read", "Write", "Edit", "Bash", "Glob", "Grep"},
    "tdd-implementer": {"Read", "Write", "Edit", "Bash", "Glob", "Grep"},
    "tdd-refactorer": {"Read", "Write", "Edit", "Bash", "Glob", "Grep"},
}


def tools(agent_md):
    fm = {}
    for line in agent_md.read_text(encoding="utf-8").splitlines()[1:]:
        if line.strip() == "---":
            break
        key, _, value = line.partition(":")
        fm[key.strip()] = value.strip()
    return {t.strip() for t in fm.get("tools", "").split(",") if t.strip()}


def main():
    import pathlib

    mismatches = []
    unknown = []
    seen = set()
    for path in sorted(glob.glob(".claude/agents/*.md")):
        agent = pathlib.Path(path).stem
        seen.add(agent)
        if agent not in CONTRACT:
            # Fail closed: a new agent file with no CONTRACT entry must not pass
            # silently — whoever adds it has to add its tools contract here too.
            unknown.append(agent)
            continue
        actual = tools(pathlib.Path(path))
        expected = CONTRACT[agent]
        if actual != expected:
            mismatches.append((agent, actual, expected))

    missing = sorted(set(CONTRACT) - seen)

    print(f"Agents checked: {len(seen & set(CONTRACT))}/{len(CONTRACT)}")
    for agent, actual, expected in mismatches:
        print(f"  - {agent}: tools {sorted(actual)} != контракт {sorted(expected)}")
    for agent in unknown:
        print(f"  - {agent}: немає запису в CONTRACT — додай контракт tools у check-agent-lint.py")
    for agent in missing:
        print(f"  - {agent}: .claude/agents/{agent}.md відсутній")
    if not mismatches and not unknown and not missing:
        print("  (all agents match their tools contract)")

    return 1 if (mismatches or unknown or missing) else 0


if __name__ == "__main__":
    sys.exit(main())
