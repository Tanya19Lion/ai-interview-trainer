"""lint_agent.py - лінт-шар (конфігурація як текст), нуль токенів. Читає
frontmatter .claude/agents/<agent>.md у пісочниці й звіряє tools: з очікуваним
набором, переданим через vars тесту - без спільної таблиці контрактів (та вже
є в eval/lint.py; тут вона навмисно НЕ дублюється)."""
from pathlib import Path

PKG = Path(__file__).resolve().parents[3]


def _tools(agent_md):
    fm = {}
    for line in agent_md.read_text(encoding="utf-8").splitlines()[1:]:
        if line.strip() == "---":
            break
        key, _, value = line.partition(":")
        fm[key.strip()] = value.strip()
    return {t.strip() for t in fm.get("tools", "").split(",") if t.strip()}


def get_assert(output, context):
    v = context.get("vars", {})
    agent = v["agent"]
    expected = {t.strip() for t in v["expected_tools"].split(",") if t.strip()}
    sb = PKG / "tmp" / f"suite-{v['case']}"
    agent_md = sb / ".claude" / "agents" / f"{agent}.md"
    if not agent_md.is_file():
        return {"pass": False, "score": 0.0,
                "reason": f"{agent_md} відсутній у пісочниці - забули config?"}
    tools = _tools(agent_md)
    ok = tools == expected
    return {"pass": ok, "score": 1.0 if ok else 0.0,
            "reason": f"tools {sorted(tools)} == контракт {sorted(expected)}"
                      if ok else
                      f"tools {sorted(tools)} != контракт {sorted(expected)}"}
