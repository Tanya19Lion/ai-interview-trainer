import json, os, re, shutil, subprocess, sys, time

# TaskCompleted (Agent Teams): не дає закрити задачу, поки тести червоні.
# Unit-тести server і client ідуть завжди; рядок `package: e2e` в описі задачі лише додає e2e —
# опис пише агент, тож він може розширити перевірку, але не звузити.
ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
UNIT = [("npm", "test"), ("npm", "--prefix", "client", "test")]
E2E = [("npm", "--prefix", "client", "run", "test:e2e")]
E2E_LINE = re.compile(r"^\s*package:\s*e2e\b", re.I | re.M)
# Менше за timeout хука в settings.json (600 с): інакше Claude Code вб'є хук, а це не exit 2.
BUDGET_SECONDS = 540


def commands_for(description):
    return UNIT + (E2E if E2E_LINE.search(description or "") else [])


def run(cmd, timeout):
    # shutil.which знаходить npm.cmd на Windows, де subprocess без shell не бачить "npm"
    r = subprocess.run([shutil.which(cmd[0]) or cmd[0], *cmd[1:]], cwd=ROOT, timeout=timeout,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, r.stdout + r.stderr


def block(message):
    print(f"Задачу не закрито: {message}", file=sys.stderr)
    return 2


def main(runner=run, stdin=sys.stdin, budget=BUDGET_SECONDS):
    # Fail-closed: будь-який збій перевірки (поганий stdin, немає npm, таймаут) — теж exit 2,
    # бо exit 1 Claude Code трактує як "не блокувати".
    try:
        deadline = time.monotonic() + budget
        for cmd in commands_for(json.load(stdin).get("task_description")):
            code, output = runner(cmd, max(1, deadline - time.monotonic()))
            if code != 0:
                tail = "\n".join(output.strip().splitlines()[-20:])
                return block(f"`{' '.join(cmd)}` червоний. Виправ і спробуй ще раз.\n{tail}")
    except subprocess.TimeoutExpired as e:
        return block(f"тести не вклались у {budget} с (`{' '.join(map(str, e.cmd))}`).")
    except Exception as e:
        return block(f"не вдалося перевірити тести ({type(e).__name__}: {e}).")
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8")  # на Windows за замовчуванням cp1251/cp866
    sys.exit(main())
