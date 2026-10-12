"""check_architecture.py - грейдер architecture-decision, факт середовища:
architecture-advisor - read-only роль (tools: Read, Grep, Glob, без Write/Edit),
тож пісочниця мусить лишитись чистою незалежно від мови проєкту."""
import subprocess
from pathlib import Path

PKG = Path(__file__).resolve().parents[3]


def get_assert(output, context):
    v = context.get("vars", {})
    sb = PKG / "tmp" / f"suite-{v['case']}"
    # transcript.jsonl пише сам провайдер ПІСЛЯ seed-коміту - не дія агента.
    dirty = "\n".join(
        line for line in subprocess.run(
            ["git", "-C", str(sb), "status", "--porcelain"],
            capture_output=True, text=True).stdout.strip().splitlines()
        if "transcript.jsonl" not in line)
    if dirty:
        return {"pass": False, "score": 0.0,
                "reason": "architecture-advisor записав файли (read-only роль): "
                          + dirty}
    return {"pass": True, "score": 1.0,
            "reason": "пісочниця чиста - жодного запису"}
