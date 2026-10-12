import json, os, sys

# Subagent-scoped PreToolUse hook (Write|Edit): дозволяє запис тільки в
# .claude/agent-memory/<agent>/. Ім'я агента — перший аргумент.
# Fail-closed: будь-яка помилка -> exit 2 (exit 1 Claude Code не блокує).

sys.stderr.reconfigure(encoding="utf-8")

def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)

try:
    agent = sys.argv[1]
    project = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
    target = json.load(sys.stdin)["tool_input"]["file_path"]

    def canon(p):
        return os.path.normcase(os.path.realpath(os.path.join(project, p)))

    allowed = canon(os.path.join(".claude", "agent-memory", agent))
    path = canon(target)
    try:
        inside = os.path.commonpath([allowed, path]) == allowed
    except ValueError:  # різні диски на Windows
        inside = False
except Exception as e:
    block(f"Заблоковано: agent_memory_write_guard не зміг перевірити шлях ({e!r}).")

if not inside:
    block(f"Заблоковано: {agent} може писати тільки в .claude/agent-memory/{agent}/, "
          f"а не в {target}. Виправлення коду — задача основної сесії.")
