import json, os, re, shutil, subprocess, sys

# TaskCompleted (Agent Teams): не дає закрити задачу, поки тести її пакета червоні.
# stdin не містить списку файлів, тому пакет береться з рядка `package: <name>` в описі задачі;
# без нього проганяються обидва unit-набори.
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
COMMANDS = {
    "server": [("npm", "test")],
    "client": [("npm", "--prefix", "client", "test")],
    "e2e": [("npm", "--prefix", "client", "run", "test:e2e")],
}
DEFAULT = COMMANDS["server"] + COMMANDS["client"]
PACKAGE = re.compile(r"^\s*package:\s*(server|client|e2e)\b", re.I | re.M)


def commands_for(description):
    m = PACKAGE.search(description or "")
    return COMMANDS[m.group(1).lower()] if m else DEFAULT


def run(cmd):
    # shutil.which знаходить npm.cmd на Windows, де subprocess без shell не бачить "npm"
    r = subprocess.run([shutil.which(cmd[0]) or cmd[0], *cmd[1:]], cwd=ROOT,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, r.stdout + r.stderr


def main(runner=run, stdin=sys.stdin):
    payload = json.load(stdin)
    for cmd in commands_for(payload.get("task_description")):
        code, output = runner(cmd)
        if code != 0:
            tail = "\n".join(output.strip().splitlines()[-20:])
            print(f"Задачу не закрито: `{' '.join(cmd)}` червоний. Виправ і спробуй ще раз.\n{tail}",
                  file=sys.stderr)
            return 2
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8")  # на Windows за замовчуванням cp1251/cp866
    sys.exit(main())
