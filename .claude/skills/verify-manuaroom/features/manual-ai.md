# 説明書と AI

製品に取扱説明書の PDF を登録できる。AI で解析するとメンテナンス候補が出て、承認するとタスクになり、却下すると消える。説明書の内容について質問すると AI が答える (ADR 0008)。この検証では OpenAI の代わりにモックが固定の回答を返す。

## Sub-features

- `manual-upload` PDF (20MB まで) をアップロードする。
- `manual-analyze` `AIで解析` で候補を抽出し、バッジが `解析済み` になる。
- `suggestion-accept` 候補の `承認` でメンテナンスタスクになる。
- `suggestion-accept-all` 未処理の候補が 2 件以上あると出る `すべて承認 (N)` で、確認ダイアログのあと全部をタスクにする。
- `suggestion-reject` 候補の `却下` で候補を捨てる (journey では未確認)。
- `manual-chat` `質問する` のドロワーで質問し、回答がストリーミングで出る。
- `manual-delete` 説明書を確認ダイアログ経由で削除する。
- `manual-preview` `プレビュー` で PDF を開く (journey では未確認)。

## How to get to it (user POV)

- 製品詳細 (`/products/<id>`) の `説明書` セクション。
- `PDF をアップロード` の入力に PDF を選び、`アップロード`。
- 説明書のカードにある `AIで解析`、`質問する`、`プレビュー`、`削除`。
- PDF の配信は `/api/manuals/<id>/file`、チャットは `/api/manuals/<id>/chat`。

## Driving it with drive.mjs

Preconditions:

- `scripts/doctor.sh` が `FAIL` なし。**特に `mock OpenAI on 4010 is ours` が `ok`。**
- `.wrangler/verify-run/mock.log` が `mock OpenAI: http://127.0.0.1:4010/v1` で始まっている。

- **アップロードする。** `node .claude/skills/verify-manuaroom/scripts/drive.mjs manual-ai`。製品を作り、ファイル入力に `verify-manual.pdf` (最小の PDF) を渡して `アップロード` を押す。`説明書をアップロードしました` が出て、カードにファイル名が出る。証拠: `manual-1-uploaded.png`。
- **解析する。** `AIで解析`。`3 件の候補が抽出されました` が出て、候補 `フィルター清掃` (2 週間ごと・p.12)、`熱交換器の点検` (1 年ごと)、`リモコンの電池交換` (周期なし) が並ぶ。証拠: `manual-2-analyzed.png`。
- **承認する。** 先頭の候補の `承認` (名前が完全一致のもの。`すべて承認` と区別する)。`候補をメンテナンスタスクに登録しました` が出て、タスク表に `フィルター清掃` の行が増える。証拠: `manual-3-accepted.png`。
- **まとめて承認する。** `すべて承認 (2)` → `候補をまとめて承認` ダイアログに残りの 2 件の名前が並ぶ → `2 件を承認`。`2 件の候補をメンテナンスタスクに登録しました` が出て、タスク表に 2 行増え、`未処理の候補はありません。` になる。証拠: `manual-3b-accept-all-confirm.png`, `manual-3c-accepted-all.png`。
- **質問する。** `質問する` で `に質問` を名前に持つドロワーを開き、`質問` のテキストエリアに入力して Enter で送る (右下の `送信` には開発用の Router Devtools のボタンが重なる)。ドロワーに `（モック）フィルターは 2週間に1回 掃除してください (p.12)` が出る。モックは Markdown で答えるので、`2週間に1回` が太字 (`strong`)、`手順` が見出し、リスト項目が 3 つになり、`**` が画面に残っていないことも確かめる。証拠: `manual-4-chat.png`。
- **削除する。** `Escape` でドロワーを閉じ、説明書のカードの `削除` → ダイアログの `削除`。`説明書を削除しました` が出る。証拠: `manual-5-deleted.png`。
- **画面の外で確かめる。**
  - モックに届いた: `.wrangler/verify-run/mock.log` に `POST /v1/responses 解析` と `POST /v1/responses チャット` が 1 回ずつ増える。
  - 保存された: `select ai_status from manuals`、`select status from ai_suggestions`、`select title from maintenance_tasks where source = 'ai'` (3 行) (SKILL.md の `wrangler d1 execute`)。

## Gotchas

- **モックに届いていないのに `解析完了` (`0 件の候補`) が出ることがある。** 本物の OpenAI に向いている。実際にそうなった。操作を止めて `mock.log` を見る。`launch.sh` が `.dev.vars.verify` を使うのは、このため。`vp dev` を直接起動してこの journey を流さない。
- 解析結果の件数は `3 件` 固定。モックの回答が変わった (`scripts/mock-openai.mjs`) ら、journey の文言も直す。
- `削除` ボタンは製品・タスク・説明書にある。説明書のカードの中に絞る。
- 説明書を削除しても、承認済みのタスクは残る (独立したタスクになっているため)。DB の件数を数えるときに注意する。
- 未確認: `プレビュー`。ヘッドレス Chromium は PDF ビューアを描画しないので、`iframe` の `src` が `/api/manuals/<id>/file` で、そこが `200` と `application/pdf` を返すかを `curl -I` で確かめる。
- 未確認: 候補の `却下`、20MB を超える PDF や PDF 以外のファイルの拒否 (`アップロードに失敗しました`)、解析の失敗時 (`解析に失敗しました` と `解析失敗` のバッジ)。
