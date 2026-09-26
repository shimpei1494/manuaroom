# ローカル開発ガイド

`feature/initial_base` 時点のローカル MVP を手元で動かすための手順と構成の説明。本番（Cloudflare）への移行後にどう変わるかは末尾にまとめている。

## 必要なもの

- Node.js 22 以上
- [Vite+](https://viteplus.dev/guide/)（`vp` コマンド）
- OpenAI API キー（「AIで解析」を試す場合のみ。なくても他の機能は動く）

## 起動手順

```bash
vp install
cp .env.example .env      # AI を試すなら OPENAI_API_KEY を記入
vp run db:migrate         # .data/local.db を作成してテーブルを用意
vp dev                    # http://localhost:5173
```

- `.env` は `vp dev` が自動で読み込むので、シェルで export する必要はない。
- トップページ（`/`）はメンテナンス一覧（`/maintenance`）に移動する。
- 初回は製品が空なので、「製品」→「新規登録」から始める。

## ローカルの構成

| 役割         | ローカルでの実体                                               | 設定                                                 | 実装                                               |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| DB           | SQLite ファイル `.data/local.db`（`@libsql/client` + Drizzle） | `DATABASE_URL=file:./.data/local.db`                 | `src/infrastructure/db/`                           |
| PDF の保存先 | `.data/uploads/` 以下のファイル                                | `UPLOAD_DIR=./.data/uploads`、`STORAGE_DRIVER=local` | `src/infrastructure/storage/local-file-storage.ts` |
| ユーザー     | 固定の `local-user-1`（ログインなし）                          | なし                                                 | `src/infrastructure/auth/local-auth.ts`            |
| AI 解析      | OpenAI API（`gpt-4o-mini`）に PDF をそのまま送る               | `OPENAI_API_KEY`                                     | `src/infrastructure/ai/openai-ai-service.ts`       |

これらは `src/infrastructure/deps.ts` で組み立てられ、画面やユースケースからは ports（`src/application/ports/`）経由でしか使われない。本番向けに差し替えるときは infrastructure 層だけを変える。

### PDF の保存のされ方

アップロードした PDF は、次のパスにそのまま保存される。

```text
.data/uploads/manuals/local-user-1/{product_id}/{manual_id}.pdf
```

- DB の `manuals` テーブルには、このキー（`manuals/...pdf`）と元のファイル名・サイズだけを保存する。PDF 本体は DB に入れない。
- 画面でのプレビューは `/api/manuals/{manual_id}/file` から配信される。
- 説明書を削除すると、DB の行を消したあとにファイルも消える。製品を削除した場合も、紐づく PDF がまとめて消える。
- アップロードできるのは PDF のみ、20MB まで。
- キーの形（`manuals/{user_id}/{product_id}/{manual_id}.pdf`）は本番の R2 でも同じものを使う。

### データのリセット

`.data/` を丸ごと消して `vp run db:migrate` をやり直せば、空の状態に戻る。`.data/` と `.env` は Git 管理外。

## よく使うコマンド

| コマンド             | 内容                                                     |
| -------------------- | -------------------------------------------------------- |
| `vp dev`             | 開発サーバー起動                                         |
| `vp check`           | フォーマット・Lint・型チェック（作業の終わりに必ず実行） |
| `vp test`            | テスト実行                                               |
| `vp run db:generate` | `schema.ts` の変更からマイグレーション SQL を生成        |
| `vp run db:migrate`  | マイグレーションをローカル DB に適用                     |
| `vp run db:studio`   | Drizzle Studio で DB の中身を見る                        |

## Cloudflare 移行後に変わること・便利になること

移行手順は [plan/cloudflare-migration.md](plan/cloudflare-migration.md)、方針は [ADR 0005](adr/0005-cloudflare-only-stack-with-access.md) を参照。

- **ローカルでも本番と同じ仕組みで動く。** `@cloudflare/vite-plugin` を入れると、`vp dev` の中でローカル版の D1 と R2（Miniflare）が自動で立ち上がる。ローカル専用の SQLite クライアントやファイル保存のコードが不要になり、「ローカルでは動くが本番で動かない」が起きにくくなる。
- **設定がほぼ不要になる。** DB や保存先はバインディング名（`DB`、`BUCKET`）で参照するため、`DATABASE_URL`、`UPLOAD_DIR`、`STORAGE_DRIVER` が消える。ローカルで必要な秘密情報は `.dev.vars` の `OPENAI_API_KEY` だけになる。
- **ローカルのデータは `.wrangler/state/` に入る。** リセットはこのフォルダを消すだけ。中身は `wrangler d1 execute manuaroom --local --command "select * from products"` などで確認できる。
- **本番のデータをダッシュボードで見られる。** D1 のテーブルと R2 に保存された PDF は Cloudflare のダッシュボードから閲覧・ダウンロードできる。
- **本番の DB に対して手元からコマンドを打てる。** `--remote` を付けると、同じコマンドで本番の D1 を確認・修正できる。
- **ログインはローカルでは不要のまま。** Cloudflare Access はデプロイ先の入口にだけかかるので、ローカルは今と同じく固定ユーザーで動かす。
- **将来の通知に使える。** Cron Triggers を使えば、「期限が近いメンテナンスを毎朝チェックする」といった定期処理を追加のサービスなしで書ける（仮仕様の通知機能は後回しの扱い）。
