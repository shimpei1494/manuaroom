---
name: verify-manuaroom
description: Drive the real Manuaroom web app (家電・設備のメンテナンス管理, TanStack Start on Cloudflare Workers) in a browser the way a user does, with a mock OpenAI, and capture screenshots and DB proof. Use to prove a UI or server-function change works beyond unit tests: tasks, skip/history, calendar, manual upload and AI analysis/chat.
---

# Verify Manuaroom

Manuaroom は製品・メンテナンスタスク・説明書(PDF)を管理する Web アプリ。利用者が触るのはブラウザの画面だけ。この skill は、検証専用のインスタンスを立てて画面を操作し、証拠を残す。

## 守ること

- **本物の OpenAI を呼ばない。** `.dev.vars` には本物の `OPENAI_API_KEY` がある。`launch.sh` は `CLOUDFLARE_ENV=verify` で `.dev.vars` を読ませず、ダミーキーとモック URL だけの `.dev.vars.verify` を使う。`vp dev` を直接起動したり、環境変数で `OPENAI_BASE_URL` を渡したりしない (環境変数では `.dev.vars` のキーが勝ち、モックに届かないまま本物に飛ぶ。実際にそうなった)。
- 自分が起動したものしか止めない。ポート 3000 などに別の node が居ても触らない。名前で kill しない。
- `vp run e2e` (3100) と同時に動かさない。どちらも `.wrangler/e2e-state` を作り直す。
- 手元の開発データ (`.wrangler/state`) と `.dev.vars` は読まない・変えない。
- テストを通すために操作を弱めない。前提が足りず失敗したら、理由を機能マップの `Gotchas` に書く。

## Launch

リポジトリのルートで実行する。

```bash
.claude/skills/verify-manuaroom/scripts/launch.sh
```

- モック OpenAI (`scripts/mock-openai.mjs`, 4010) と、空の D1・R2 で `vp run e2e:server --port 3101` を起動する。マイグレーション適用まで済み、`GET /products` が 200 を返したら `ready:` と出力する (最大 120 秒)。
- ポート 3100・3101・4010 のどれかが使用中なら起動せずに終了する。
- ログは `.wrangler/verify-run/{dev,mock}.log`。起動時の「No environment found ... `verify`」の警告は無害。`.dev.vars.verify` が読まれた印は `Using secrets defined in .dev.vars.verify`。
- 初回だけ `vp install` と `vp exec playwright install chromium` が要る。

## Doctor

何かおかしいとき、操作の前に必ず実行する。読み取り専用。

```bash
.claude/skills/verify-manuaroom/scripts/doctor.sh
```

3101 の持ち主が launch.sh の起動したプロセスか、DB が使える (`/products` が 200) か、モックが生きているか、E2E が動いていないか、Chromium があるか、を `ok` / `FAIL` で出す。`FAIL` があれば操作しない。

## Drive

`drive.mjs` は Playwright (リポジトリの `@playwright/test`) で Chromium を起動し、PC 幅 (1280x800) とスマホ幅 (412x915) の両方で、日本語ロケール・Asia/Tokyo で操作する。

```bash
node .claude/skills/verify-manuaroom/scripts/drive.mjs <journey>
# journey: tasks | skip-history | calendar | manual-ai | product-from-manual | all
```

| journey        | 利用者の操作                                                | 機能マップ                                         |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `tasks`        | 製品登録 → タスク追加 → 今やることから完了 → 通知で元に戻す | [maintenance-tasks](features/maintenance-tasks.md) |
| `skip-history` | スキップ → 回数表示 → 履歴から取り消し                      | [skip-history](features/skip-history.md)           |
| `calendar`     | 完了 → カレンダーの今日の欄に「実施」                       | [calendar](features/calendar.md)                   |
| `manual-ai`    | PDF アップロード → AI 解析 → 承認 → 質問 → 削除             | [manual-ai](features/manual-ai.md)                 |
| `product-from-manual` | 新規登録画面で PDF を選ぶ → `PDF から登録` → 読み取った内容で製品ができる | [product-from-manual](features/product-from-manual.md) |

- 安定した手がかりを使う: ARIA ロール + 画面の文言 (`getByRole("button", { name: "完了" })`, `getByLabel("製品名")`)。Mantine のクラスは通知 (`.mantine-Notification-root`) とカード (`.mantine-Card-root`) の絞り込みだけに使う。
- 画面の文言を変えたら、`drive.mjs` と機能マップの文言も同じ変更で直す。
- 変更した機能の journey だけでなく、機能マップに載っている入口は全部確かめる。1 つの入口だけでは検証が足りない。
- 画面は `vp dev` の開発ビルドなので、右下に TanStack Router のデバッグボタンが写る。気にしない。

## Evidence

- 置き場所: `.wrangler/verify-evidence/<日時>/` (Git 管理外。後片付けでは消えない)。`test-results/` は Playwright が消すので使わない。
- 各 journey は、操作の途中と最後で `<journey>-<番号>-<状態>.png` を撮る。失敗時は `FAIL-<journey>-<device>.png`。同じ実行の PC 幅とスマホ幅は同じファイル名で、あとに撮ったスマホ幅が残る。
- **実際の画面操作で確かめる。** 内部の関数や API を直接叩いて「通った」とは言わない。
- **画面の外の結果も見る。** 画面が成功を出しても、保存されたものを別の見方で確かめる。

  ```bash
  vp exec wrangler d1 execute manuaroom --local --persist-to .wrangler/e2e-state \
    --command "select title, next_due_date from maintenance_tasks order by rowid desc limit 5"
  ```

  テーブルは `products`, `manuals`, `maintenance_tasks`, `maintenance_logs` (`kind`, `done_at`), `ai_suggestions`。説明書の PDF は R2 (`manuals/{user_id}/{product_id}/{manual_id}.pdf`)。
- **AI がモックに届いたか見る。** `manual-ai` の後、`.wrangler/verify-run/mock.log` に `POST /v1/responses 解析` と `... チャット` が並ぶ。無いのに「解析完了」が出たら、モックに向いていない。操作を止めて cleanup.sh のあと launch.sh からやり直す。
- モックの回答は固定 (`フィルター清掃` 2 週間ごと p.12、チャットは「（モック）…」)。**AI の回答の質は検証できない。** 見ているのは、画面から Worker・TanStack AI・SDK を通って結果が保存・表示されるところまで。
- 週次通知 (LINE) はこの skill の対象外。

## Cleanup

どの実行のあとも、失敗した試行のあとも実行する。

```bash
.claude/skills/verify-manuaroom/scripts/cleanup.sh
```

`.wrangler/verify-run/*.pid` に控えた PID (と、その子プロセス) だけを止め、`.wrangler/e2e-state` と `.dev.vars.verify` を消す。`.dev.vars`・`.wrangler/state`・`.wrangler/verify-evidence` は残す。

## Helpers

| ファイル             | 使い方                                                                              |
| -------------------- | ----------------------------------------------------------------------------------- |
| `scripts/launch.sh`  | 引数なし。環境変数 `VERIFY_PORT` (既定 3101)、`VERIFY_MOCK_PORT` (既定 4010) で変更 |
| `scripts/doctor.sh`  | 引数なし。終了コード 0 = 操作してよい                                               |
| `scripts/drive.mjs`  | `node .../drive.mjs <journey>`。1 つでも失敗したら終了コード 1                      |
| `scripts/cleanup.sh` | 引数なし。何度実行しても安全                                                        |

機能マップは [features/README.md](features/README.md)。アプリの変更に合わせて保つには `/maintain-verification-skill`。
