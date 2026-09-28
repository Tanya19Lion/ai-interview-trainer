#!/usr/bin/env python3
"""Compare the Express routes in src/routes/ with the OpenAPI specs in docs/features/.

Routes are read from `<name>Router.<method>('<path>', ...)` calls and prefixed with
the mount point from `app.use('/api/...', <name>Router)` in src/index.ts. Documented
operations are read from every docs/features/*/(contracts/)openapi.yaml, honouring a
`servers: - url:` base path. Path params are normalised (`:id` and `{id}` -> `{}`).

Prints a report to stdout. Exit 0 = in sync, 1 = drift (used by docs-drift.yml).
"""

import glob
import re
import sys

METHODS = ("get", "post", "put", "patch", "delete")


def norm(path):
    path = re.sub(r":\w+|\{[^}]+\}", "{}", path)
    return path.rstrip("/") or "/"


def code_operations():
    with open("src/index.ts", encoding="utf-8") as fh:
        mounts = dict(
            (name, prefix)
            for prefix, name in re.findall(r"app\.use\('([^']+)',\s*(\w+Router)\)", fh.read())
        )
    ops = set()
    for path in glob.glob("src/routes/*.routes.ts"):
        with open(path, encoding="utf-8") as fh:
            src = fh.read()
        for name, method, route in re.findall(
            r"(\w+Router)\.(%s)\(\s*'([^']*)'" % "|".join(METHODS), src
        ):
            if name in mounts:
                ops.add((method.upper(), norm(mounts[name] + route)))
    return ops


def documented_operations():
    ops = set()
    specs = glob.glob("docs/features/*/openapi.yaml") + glob.glob(
        "docs/features/*/contracts/openapi.yaml"
    )
    for path in specs:
        with open(path, encoding="utf-8") as fh:
            lines = fh.read().splitlines()
        base = ""
        in_paths = False
        current = None
        for line in lines:
            m = re.match(r"\s+-\s+url:\s*(\S+)", line)
            if m and not in_paths:
                base = m.group(1).rstrip("/")
                continue
            if re.match(r"paths:\s*$", line):
                in_paths = True
                continue
            if in_paths and re.match(r"\S", line):
                in_paths = False
            if not in_paths:
                continue
            m = re.match(r"  (/\S*):\s*$", line)
            if m:
                current = m.group(1)
                continue
            m = re.match(r"    (%s):\s*$" % "|".join(METHODS), line)
            if m and current is not None:
                ops.add((m.group(1).upper(), norm(base + current)))
    return ops


def main():
    code, docs = code_operations(), documented_operations()
    undocumented = sorted(code - docs)
    unimplemented = sorted(docs - code)

    print(f"Routes in code: {len(code)}; operations in OpenAPI specs: {len(docs)}")
    print("In code but missing from docs/features/*/openapi.yaml:")
    for method, path in undocumented:
        print(f"  - {method} {path}")
    if not undocumented:
        print("  (none)")
    print("In OpenAPI specs but not implemented in src/routes/:")
    for method, path in unimplemented:
        print(f"  - {method} {path}")
    if not unimplemented:
        print("  (none)")
    return 1 if undocumented or unimplemented else 0


if __name__ == "__main__":
    sys.exit(main())
