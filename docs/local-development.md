# ローカル開発ガイド

手元でアプリを動かすための手順と構成の説明。ローカルでも本番（Cloudflare Workers）と同じ仕組みで動く。本番環境の用意とデプロイは [deployment.md](deployment.md)、方針は [ADR 0005](adr/0005-cloudflare-only-stack-with-access.md) を参照。

## 必要なもの

- Node.js 22 以上
- [Vite+](https://viteplus.dev/guide/)（`vp` コマンド）
- OpenAI API キー（「AIで解析」を試す場合のみ。なくても他の機能は動く）

## 起動手順

```bash
vp install
cp .dev.vars.example .dev.vars   # AI を試すなら OPENAI_API_KEY を記入
vp run db:migrate                # ローカル D1 にテーブルを用意
vp dev                           # http://localhost:5173
```

- `vp dev` の中で `@cloudflare/vite-plugin` が Worker を workerd（Miniflare）で動かし、ローカルの D1 と R2 を用意する。Cloudflare のアカウントやログインは不要。
- `.dev.vars` は Worker の秘密情報（本番の `wrangler secret` に相当）をローカルで渡すファイル。Git 管理外。
- トップページ（`/`）はメンテナンス一覧（`/maintenance`）に移動する。
- 初回は製品が空なので、「製品」→「新規登録」から始める。

## ローカルの構成

| 役割         | ローカルでの実体                                             | 設定                                        | 実装                                            |
| ------------ | ------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------- |
| DB           | ローカル D1（`.wrangler/state/v3/d1/`）+ Drizzle             | `wrangler.jsonc` の `DB` バインディング     | `src/infrastructure/db/`                        |
| PDF の保存先 | ローカル R2（`.wrangler/state/v3/r2/`）                      | `wrangler.jsonc` の `BUCKET` バインディング | `src/infrastructure/storage/r2-file-storage.ts` |
| ユーザー     | 固定の `local-user-1`（ログインなし。Access の検証もしない） | なし                                        | `src/infrastructure/auth/local-auth.ts`         |
| AI 解析      | OpenAI API（`gpt-4o-mini`）に PDF をそのまま送る             | `.dev.vars` の `OPENAI_API_KEY`             | `src/infrastructure/ai/openai-ai-service.ts`    |

これらは `src/infrastructure/deps.ts` で組み立てられ、画面やユースケースからは ports（`src/application/ports/`）経由でしか使われない。バインディングと変数の型は `worker-configuration.d.ts`（`vp run cf-typegen` で生成）にある。`wrangler.jsonc` や `.dev.vars` の項目を変えたら再生成する。

### PDF の保存のされ方

アップロードした PDF は、R2 に次のキーで保存される（ローカルも本番も同じ）。

```text
manuals/{user_id}/{product_id}/{manual_id}.pdf
```

- DB の `manuals` テーブルには、このキーと元のファイル名・サイズだけを保存する。PDF 本体は DB に入れない。
- 画面でのプレビューは `/api/manuals/{manual_id}/file` から配信される。Content-Type はアップロード時に R2 のメタデータとして保存したものを返す。
- 説明書を削除すると、DB の行を消したあとにファイルも消える。製品を削除した場合も、紐づく PDF がまとめて消える。
- アップロードできるのは PDF のみ、20MB まで。

### データの確認とリセット

- 中身の確認: `vp exec wrangler d1 execute manuaroom --local --command "select * from products"`
- リセット: `.wrangler/` を丸ごと消して `vp run db:migrate` をやり直すと、空の状態に戻る。
- 以前のローカル MVP の `.data/local.db` と `.data/uploads/` は使われなくなった。不要なら消してよい。

## よく使うコマンド

| コマンド                   | 内容                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| `vp dev`                   | 開発サーバー起動                                                     |
| `vp check`                 | フォーマット・Lint・型チェック（作業の終わりに必ず実行）             |
| `vp test`                  | テスト実行（リポジトリと R2 の結合テストはメモリ上の D1・R2 を使う） |
| `vp run db:generate`       | `schema.ts` の変更からマイグレーション SQL を `drizzle/` に生成      |
| `vp run db:migrate`        | マイグレーションをローカル D1 に適用                                 |
| `vp run db:migrate:remote` | マイグレーションを本番 D1 に適用                                     |
| `vp run cf-typegen`        | `wrangler.jsonc` と `.dev.vars` からバインディングの型を再生成       |
| `vp run deploy`            | ビルドして本番の Worker にデプロイ                                   |

### 週次通知を試す

`vp dev` を起動したまま、次を開くと Cron と同じ処理が走る。`.dev.vars` の `LINE_CHANNEL_ACCESS_TOKEN` が空なら、送る内容がターミナルに出るだけで LINE には送らない。

```bash
curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=0+0+*+*+sat"
```

## Cloudflare 構成で便利になること

- **ローカルでも本番と同じ仕組みで動く。** `@cloudflare/vite-plugin` を入れると、`vp dev` の中でローカル版の D1 と R2（Miniflare）が自動で立ち上がる。ローカル専用の SQLite クライアントやファイル保存のコードが不要になり、「ローカルでは動くが本番で動かない」が起きにくくなる。
- **設定がほぼ不要になる。** DB や保存先はバインディング名（`DB`、`BUCKET`）で参照するため、`DATABASE_URL`、`UPLOAD_DIR`、`STORAGE_DRIVER` が消える。ローカルで必要な秘密情報は `.dev.vars` の `OPENAI_API_KEY` だけになる。
- **ローカルのデータは `.wrangler/state/` に入る。** リセットはこのフォルダを消すだけ。中身は「データの確認とリセット」のコマンドで確認できる。
- **本番のデータをダッシュボードで見られる。** D1 のテーブルと R2 に保存された PDF は Cloudflare のダッシュボードから閲覧・ダウンロードできる。
- **本番の DB に対して手元からコマンドを打てる。** `--remote` を付けると、同じコマンドで本番の D1 を確認・修正できる。
- **ログインはローカルでは不要のまま。** Cloudflare Access はデプロイ先の入口にだけかかるので、ローカルは今と同じく固定ユーザーで動かす。
- **通知を追加のサービスなしで書ける。** Cron Triggers で毎週土曜に LINE へ週次のまとめを送っている（`src/server.ts`）。
