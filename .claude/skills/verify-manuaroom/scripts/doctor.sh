#!/usr/bin/env bash
# 読み取り専用。「この検証インスタンスは操作してよいか」を答える。何も起動・停止しない。
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PORT="${VERIFY_PORT:-3101}"
MOCK_PORT="${VERIFY_MOCK_PORT:-4010}"
RUN_DIR=".wrangler/verify-run"
failed=0

check() {
  if [ "$2" = "ok" ]; then echo "ok   $1"; else echo "FAIL $1 -- $3"; failed=1; fi
}

listener_pid() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

recorded="$(cat "$RUN_DIR/dev-listener.pid" 2>/dev/null || true)"
actual="$(listener_pid "$PORT")"
if [ -n "$recorded" ] && [ "$recorded" = "$actual" ]; then
  check "port $PORT is owned by the instance launch.sh started (pid $actual)" ok
else
  check "port $PORT owner" no "recorded pid '${recorded:-none}', actual '${actual:-none}'. Run scripts/launch.sh (or scripts/cleanup.sh first if stale)."
fi

status="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/products" || true)"
if [ "$status" = "200" ]; then
  check "GET /products returns 200 (DB migrated)" ok
else
  check "GET /products" no "got '${status}'. See $RUN_DIR/dev.log"
fi

if [ -n "$(listener_pid "$MOCK_PORT")" ] && [ "$(listener_pid "$MOCK_PORT")" = "$(cat "$RUN_DIR/mock.pid" 2>/dev/null || true)" ]; then
  check "mock OpenAI on $MOCK_PORT is ours" ok
else
  check "mock OpenAI on $MOCK_PORT" no "not running or not ours. AI journeys will fail."
fi

if [ -n "$(listener_pid 3100)" ]; then
  check "no E2E server on 3100" no "vp run e2e is running and shares .wrangler/e2e-state. Wait for it to finish."
else
  check "no E2E server on 3100" ok
fi

# macOS は ~/Library/Caches、Linux は ~/.cache。PLAYWRIGHT_BROWSERS_PATH があればそちら
if compgen -G "${PLAYWRIGHT_BROWSERS_PATH:-/nonexistent}/chromium-*" >/dev/null ||
  compgen -G "$HOME/Library/Caches/ms-playwright/chromium-*" >/dev/null ||
  compgen -G "$HOME/.cache/ms-playwright/chromium-*" >/dev/null; then
  check "Playwright chromium installed" ok
else
  check "Playwright chromium" no "run: vp exec playwright install chromium"
fi

exit "$failed"
