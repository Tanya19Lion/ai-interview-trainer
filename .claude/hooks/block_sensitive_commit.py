import json, re, subprocess, sys

# .env, .env.local, *.pem, *.key, *.tfstate, credentials* — але не .env.example
SECRET = re.compile(
    r'(^|/)(\.env(\.(?!example$|sample$|template$)[^/]+)?|[^/]*\.(pem|key|tfstate)|credentials[^/]*)$',
    re.I,
)

cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")

def block(files):
    print("Заблоковано: секретні файли в коміті: " + ", ".join(files), file=sys.stderr)
    sys.exit(2)

if re.search(r'\bgit\s+add\b', cmd):
    hits = [t for t in cmd.split() if SECRET.search(t.strip("\"'"))]
    if hits:
        block(hits)

if re.search(r'\bgit\s+commit\b', cmd):
    staged = subprocess.run(["git", "diff", "--cached", "--name-only"],
                            capture_output=True, text=True).stdout.split()
    hits = [f for f in staged if SECRET.search(f)]
    if hits:
        block(hits)