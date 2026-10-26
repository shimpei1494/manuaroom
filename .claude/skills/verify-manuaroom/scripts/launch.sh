#!/usr/bin/env bash
# 検証用の manuaroom を起動する。モック OpenAI (4010) と、E2E 用の空の D1・R2 を使う vp dev (3101)。
# 手元の開発データ (.wrangler/state) と .dev.vars の本物のキーには触らない。
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

PORT="${VERIFY_PORT:-3101}"
MOCK_PORT="${VERIFY_MOCK_PORT:-4010}"
RUN_DIR=".wrangler/verify-run"
READY_TIMEOUT_SECONDS=120

listener_pid() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true
}

# E2E (3100) は同じ .wrangler/e2e-state を作り直すので、同時には動かさない。
for busy in 3100 "$PORT" "$MOCK_PORT"; do
  if [ -n "$(listener_pid "$busy")" ]; then
    echo "port $busy is already in use (pid $(listener_pid "$busy")). Not starting; do not kill it unless you started it." >&2
    exit 1
  fi
done

mkdir -p "$RUN_DIR" .wrangler/verify-evidence

nohup node scripts/mock-openai.mjs >"$RUN_DIR/mock.log" 2>&1 &
echo $! >"$RUN_DIR/mock.pid"

# 本物の OpenAI キーが入った .dev.vars を読ませない。CLOUDFLARE_ENV=verify にすると
# .dev.vars.verify だけが読まれるので、ダミーのキーとモックの URL だけを書いたファイルを作る。
# 万一モックに向かなくても、ダミーキーなので本物の API には認証されない。
# このファイルはコミットしない (cleanup.sh が消す)。ローカルだけの除外設定で git status に出さない。
grep -qxF '/.dev.vars.verify' .git/info/exclude 2>/dev/null || echo '/.dev.vars.verify' >>.git/info/exclude
cat >.dev.vars.verify <<EOF
OPENAI_API_KEY=verify-mock-key
OPENAI_BASE_URL=http://127.0.0.1:${MOCK_PORT}/v1
EOF

# e2e:server は .wrangler/e2e-state を消して、マイグレーション適用後に vp dev を起動する。
CLOUDFLARE_ENV=verify \
  nohup vp run e2e:server --port "$PORT" >"$RUN_DIR/dev.log" 2>&1 &
echo $! >"$RUN_DIR/dev.pid"

# 準備完了 = マイグレーション済みで、DB を読む画面が 200 を返す (プロセスが応答するだけでは足りない)。
deadline=$((SECONDS + READY_TIMEOUT_SECONDS))
until [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}/products" || true)" = "200" ]; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "not ready after ${READY_TIMEOUT_SECONDS}s. See $RUN_DIR/dev.log" >&2
    tail -n 30 "$RUN_DIR/dev.log" >&2
    exit 1
  fi
  sleep 2
done

# 後片付けで「自分が起動したもの」だけを止めるために、実際に待ち受けている PID を控える。
listener_pid "$PORT" >"$RUN_DIR/dev-listener.pid"
echo "ready: http://localhost:${PORT}  (mock OpenAI: http://127.0.0.1:${MOCK_PORT}/v1)"
