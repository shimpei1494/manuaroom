# 説明書 PDF から製品を登録

製品の新規登録画面で説明書 PDF を選んで `PDF から登録` を押すと、AI が表紙などから製品名・メーカー・型番・カテゴリを読み取り、その内容で製品を登録して、説明書も一緒に保存する。登録後は製品詳細に移り、内容が違えば `編集` で直せる (ADR 0008)。この検証では OpenAI の代わりにモックが固定の内容を返す。

## Sub-features

- `product-from-manual-create` PDF を選んで `PDF から登録` を押すと、製品と説明書が作られる。
- `product-from-manual-fields` 読み取った製品名・メーカー・型番・カテゴリが製品に入る。
- `product-from-manual-failure` 読み取りに失敗したら `読み取りに失敗しました` が出て、製品は作られない (journey では未確認)。

## How to get to it (user POV)

- サイドバーの `製品` → 製品一覧 → 新規登録 (`/products/new`)。画面の上にある `説明書 PDF から登録` のパネル。
- `説明書 PDF` の入力に PDF を選ぶと `PDF から登録` が押せる。選ぶまでは押せない。
- 下の `または手で入力` のフォームは別の入口 (maintenance-tasks.md)。

## Driving it with drive.mjs

Preconditions:

- `scripts/doctor.sh` が `FAIL` なし。**特に `mock OpenAI on 4010 is ours` が `ok`。**
- `.wrangler/verify-run/mock.log` が `mock OpenAI: http://127.0.0.1:4010/v1` で始まっている。

- **PDF を選ぶ。** `node .claude/skills/verify-manuaroom/scripts/drive.mjs product-from-manual`。`/products/new` でファイル入力に `verify-manual.pdf` (最小の PDF) を渡す。`PDF から登録` が押せるようになる。証拠: `product-from-manual-1-selected.png`。
- **登録する。** `PDF から登録`。`「ルームエアコン（モック）」を登録しました` が出て、製品詳細に移る。見出しが `ルームエアコン（モック）`、メーカー `モック電機`、型番 `MOCK-2026`、カテゴリ `エアコン`、説明書 `verify-manual.pdf` が出る。証拠: `product-from-manual-2-created.png`。
- **画面の外で確かめる。**
  - モックに届いた: `.wrangler/verify-run/mock.log` に `POST /v1/responses 製品情報` が 1 回増える (`解析` や `チャット` ではない)。
  - 保存された: `select p.name, p.manufacturer, p.model_number, p.category, m.file_name, m.ai_status from products p left join manuals m on m.product_id = p.id` (SKILL.md の `wrangler d1 execute`)。説明書の `ai_status` は `not_analyzed` のまま (製品情報を読むだけで、メンテナンスの解析はしない)。

## Gotchas

- **モックに届いていないのに登録できることがある。** 本物の OpenAI に向いている。`mock.log` を見る。`launch.sh` が `.dev.vars.verify` を使うのは、このため。`vp dev` を直接起動して流さない。
- 読み取り結果は固定。モックの回答 (`scripts/mock-openai.mjs` の `PRODUCT_INFO_RESULT`) が変わったら、journey の文言も直す。
- モックは、構造化出力のスキーマに `maintenances` があれば `解析`、なければ `製品情報` と判断する。スキーマの形が変わると、違う回答が返る。
- この画面には `登録` を名前に含むボタンが 2 つある (`PDF から登録` と手入力の `登録`)。ボタンを探すときは名前を完全に指定する。
- 登録後は、製品詳細に移るまでに読み取りの時間がかかる (モックは速いが、本物は数十秒)。
- 未確認: 読み取りに失敗したとき (`読み取りに失敗しました`)、PDF 以外や 20MB を超えるファイルの拒否、読み取れない項目が空のままになるとき。
