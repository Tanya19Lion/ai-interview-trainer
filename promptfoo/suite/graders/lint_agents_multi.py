"""lint_agents_multi.py - lint_agent.py для кейсів з кількома агентами
(TDD-трійка): comma-separated vars.agents, той самий очікуваний tools-набір
для кожного."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lint_agent import _tools  # noqa: E402

PKG = Path(__file__).resolve().parents[3]


def get_assert(output, context):
    v = context.get("vars", {})
    agents = [a.strip() for a in v["agents"].split(",") if a.strip()]
    if not agents:
        return {"pass": False, "score": 0.0, "reason": "vars.agents порожній"}
    expected = {t.strip() for t in v["expected_tools"].split(",") if t.strip()}
    sb = PKG / "tmp" / f"suite-{v['case']}"
    problems = []
    for agent in agents:
        agent_md = sb / ".claude" / "agents" / f"{agent}.md"
        if not agent_md.is_file():
            problems.append(f"{agent}: .md відсутній у пісочниці")
            continue
        tools = _tools(agent_md)
        if tools != expected:
            problems.append(f"{agent}: tools {sorted(tools)} != {sorted(expected)}")
    return {"pass": not problems, "score": 1.0 - len(problems) / len(agents),
            "reason": f"усі {len(agents)} агенти відповідають контракту"
                      if not problems else "; ".join(problems)}
