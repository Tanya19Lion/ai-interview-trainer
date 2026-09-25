# w.sh — raise an isolated worktree in one call (incident.io-style `w`).
#
# Works in bash/zsh, including Git Bash on Windows (not PowerShell/cmd).
#
# Usage:
#   source w.sh
#   w <feature>
#
# One call: create the worktree, copy the git-ignored .env into it, assign a
# free port, write that port into the worktree's .env, and print how to serve.
w() {
  feature="$1"
  if [ -z "$feature" ]; then
    echo "usage: w <feature>" >&2
    return 1
  fi

  root="$(git rev-parse --show-toplevel)" || return 1
  prefix="$(basename "$root")"
  dir="$root/../${prefix}-${feature}"

  # 1. create the worktree on a fresh branch (sibling dir, grouped by prefix)
  git worktree add "$dir" -b "$feature" >/dev/null || return 1

  # 2. copy the git-ignored .env into the fresh checkout
  if [ -f "$root/.env" ]; then
    cp "$root/.env" "$dir/.env"
  fi

  # 3. assign a free port and write it into THIS worktree's .env
  #    (node instead of python3: the project already needs node, and on Windows
  #    `python3` is often missing or a Microsoft Store stub)
  port="$(node -e 's=require("net").createServer().listen(0,()=>{console.log(s.address().port);s.close()})')"
  if [ -f "$dir/.env" ]; then
    if grep -q '^PORT=' "$dir/.env"; then
      sed "s/^PORT=.*/PORT=${port}/" "$dir/.env" > "$dir/.env.tmp" && mv "$dir/.env.tmp" "$dir/.env"
    else
      printf 'PORT=%s\n' "$port" >> "$dir/.env"
    fi
  fi

  # 4. isolate the database: append a sanitized -<feature> suffix to the db
  #    name in MONGODB_URI (Atlas SRV: mongodb+srv://host/<dbname>?query)
  db_suffix="$(printf '%s' "$feature" | tr -c 'a-zA-Z0-9_-' '-')"
  if [ -f "$dir/.env" ] && grep -q '^MONGODB_URI=' "$dir/.env"; then
    sed -E "s#^(MONGODB_URI=mongodb\+srv://[^/]+/)([^?[:space:]]+)#\1\2-${db_suffix}#" "$dir/.env" > "$dir/.env.tmp" && mv "$dir/.env.tmp" "$dir/.env"
  fi

  # 5. copy the git-ignored client/.env and point it at this worktree's port
  if [ -f "$root/client/.env" ]; then
    mkdir -p "$dir/client"
    cp "$root/client/.env" "$dir/client/.env"
    if grep -q '^VITE_API_URL=' "$dir/client/.env"; then
      sed "s#^VITE_API_URL=.*#VITE_API_URL=http://localhost:${port}#" "$dir/client/.env" > "$dir/client/.env.tmp" && mv "$dir/client/.env.tmp" "$dir/client/.env"
    else
      printf 'VITE_API_URL=http://localhost:%s\n' "$port" >> "$dir/client/.env"
    fi
  fi

  # 6. install dependencies fresh in this worktree (node_modules is git-ignored
  #    and not shared between worktrees)
  echo "installing server dependencies..."
  (cd "$dir" && npm ci) || return 1
  if [ -f "$dir/client/package.json" ]; then
    echo "installing client dependencies..."
    (cd "$dir/client" && npm ci) || return 1
  fi

  echo "worktree ready: ${prefix}-${feature}  (branch ${feature}, PORT=${port}, DB suffix=-${db_suffix})"
  echo "  server: cd ${dir} && npm run dev           # http://localhost:${port}"
  echo "  client: cd ${dir}/client && npm run dev     # Vite, talks to that server"
}
