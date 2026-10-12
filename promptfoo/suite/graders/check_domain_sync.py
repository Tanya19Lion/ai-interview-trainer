"""check_domain_sync.py - грейдер domain-sync-drift, факт середовища:
агент оновив ЛИШЕ свою пам'ять (.claude/agent-memory/domain-sync-keeper/),
нічого не торкнувся поза нею - шлях у git diff, а не мова чи стек."""
import subprocess
from pathlib import Path

PKG = Path(__file__).resolve().parents[3]
MEM = "agent-memory/domain-sync-keeper"


def get_assert(output, context):
    v = context.get("vars", {})
    sb = PKG / "tmp" / f"suite-{v['case']}"
    memory = sb / ".claude" / MEM / "MEMORY.md"
    if not memory.is_file():
        return {"pass": False, "score": 0.0,
                "reason": f".claude/{MEM}/MEMORY.md не створено"}
    # --untracked-files=all: інакше git згортає новий каталог у один рядок
    # ("?? .claude/agent-memory/"), і per-path перевірка нижче хибно фейлить.
    changed = subprocess.run(
        ["git", "-C", str(sb), "status", "--porcelain", "--untracked-files=all"],
        capture_output=True, text=True).stdout.strip().splitlines()
    # transcript.jsonl пише сам провайдер ПІСЛЯ seed-коміту - завжди
    # untracked, і це не дія агента, тож ігноруємо його в цій перевірці.
    outside = [line for line in changed
               if f".claude/{MEM}/" not in line and "transcript.jsonl" not in line]
    if outside:
        return {"pass": False, "score": 0.0,
                "reason": "зміни поза пам'яттю: " + "; ".join(outside)}
    return {"pass": True, "score": 1.0,
            "reason": "оновлено лише .claude/agent-memory/domain-sync-keeper/"}
