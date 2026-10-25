#!/usr/bin/env bash
# launch.sh が起動したプロセスだけを止める。名前では止めない。証拠 (.wrangler/verify-evidence) は消さない。
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

RUN_DIR=".wrangler/verify-run"

kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

for name in dev-listener dev mock; do
  file="$RUN_DIR/$name.pid"
  [ -f "$file" ] || continue
  pid="$(cat "$file")"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill_tree "$pid"
    echo "stopped $name (pid $pid)"
  fi
  rm -f "$file"
done

# 検証用の D1・R2 と、launch.sh が作ったモック用の変数ファイルはここで捨てる。
# .dev.vars (本物のキー) は触らない。
rm -rf .wrangler/e2e-state .dev.vars.verify
echo "cleanup done. evidence kept in .wrangler/verify-evidence"
