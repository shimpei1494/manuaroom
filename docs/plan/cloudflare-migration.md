# 実装計画: Cloudflare（Workers + D1 + R2 + Access）への移行

方針の決定理由は [ADR 0005](../adr/0005-cloudflare-only-stack-with-access.md) を参照。この文書は、`feature/initial_base` のローカル MVP を本番で動かすまでの作業手順をまとめたもの。

## 目標の構成

```text
Runtime:  TanStack Start on Cloudflare Workers（@cloudflare/vite-plugin）
DB:       Cloudflare D1（Drizzle、drizzle-orm/d1）
Storage:  Cloudflare R2（Worker バインディング）
Auth:     Cloudflare Access（Google ログイン + 家族のメールアドレスを許可）
AI:       OpenAI API（ボタン押下時のみ）
Deploy:   Workers Builds（GitHub 連携）または GitHub Actions + wrangler deploy
Local:    vp dev（Miniflare のローカル D1 / R2、Access 検証はスキップ）
```

ローカルと本番で同じバインディング（`DB`、`BUCKET`）を使うため、ローカル専用の DB クライアントやファイル保存の実装は持たない。

## 現状との差分（2026-09-26 時点のコード）

| 対象                                               | 現状                                                | 移行後                                                       |
| -------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| `src/infrastructure/env/runtime-env.ts`            | `process.env` を zod で検証                         | `cloudflare:workers` の `env` からバインディングと変数を取得 |
| `src/infrastructure/db/client.ts`                  | `@libsql/client` + `drizzle-orm/libsql`             | `drizzle-orm/d1` に `env.DB` を渡す                          |
| `src/infrastructure/storage/local-file-storage.ts` | `node:fs` でローカル保存                            | 削除し、`r2-file-storage.ts`（`env.BUCKET`）に置き換え       |
| `src/infrastructure/auth/local-auth.ts`            | `local-user-1` 固定                                 | ローカル用として残し、本番用 `access-auth.ts` を追加         |
| `src/infrastructure/ai/openai-ai-service.ts`       | `Buffer` で base64 化                               | Web 標準の方法に変えるか `nodejs_compat` を有効にする        |
| `src/infrastructure/deps.ts`                       | 常にローカル実装を組み立てる                        | 環境に応じて auth 実装を選ぶ。storage は常に R2              |
| `drizzle.config.ts` / `.env.example`               | Turso 前提（`DATABASE_URL`、`DATABASE_AUTH_TOKEN`） | D1 前提に変更。Turso 関連の変数を削除                        |
| `vite.config.ts`                                   | TanStack Start + React                              | `@cloudflare/vite-plugin` を追加                             |
| `wrangler.jsonc`                                   | なし                                                | 新規作成（D1・R2 バインディング、互換性日付、変数）          |

ports、usecases、domain、routes、server-functions は変更しない想定。

## 手順

各ステップの終わりに `vp check` と `vp test` を通し、`vp dev` で製品登録 → PDF アップロード/閲覧 → タスク完了まで動くことを確認する。

### 1. Workers 上で動かす土台

- `vp add -D wrangler @cloudflare/vite-plugin`
- `wrangler.jsonc` を作成する（`name`、`compatibility_date`、`main` は TanStack Start の Cloudflare 向け手順に従う）。
- `vite.config.ts` に `cloudflare({ viteEnvironment: { name: "ssr" } })` を追加する。
- `runtime-env.ts` を `cloudflare:workers` の `env` から読む形に変更する。
- `vp dev` で既存画面が表示されることを確認する（この時点では DB/Storage はまだ動かなくてよい）。

### 2. D1 への切り替え

- `wrangler d1 create manuaroom` で DB を作成し、`wrangler.jsonc` に `DB` バインディングを追加する。`migrations_dir` は `drizzle` にする。
- `client.ts` を `drizzle(env.DB, { schema })` に変更し、`@libsql/client` を削除する。
- `drizzle.config.ts` は `drizzle-kit generate`（SQL 生成）専用にし、適用は `wrangler d1 migrations apply manuaroom --local` / `--remote` で行う。`package.json` の `db:*` スクリプトもこれに合わせる。
- スキーマ（`schema.ts`）は SQLite のままなので変更不要のはず。既存の `drizzle/0000_*.sql` がそのまま D1 に適用できるか確認する。

### 3. R2 への切り替え

- `wrangler r2 bucket create manuaroom-manuals` を実行し、`BUCKET` バインディングを追加する。
- `FileStoragePort` の R2 実装を作る（`put` は `httpMetadata.contentType` を保存し、`get` は `object.body` と保存した Content-Type を返す）。
- `local-file-storage.ts` と `UPLOAD_DIR` / `STORAGE_DRIVER` を削除する。
- キー設計（`manuals/{user_id}/{product_id}/{manual_id}.pdf`）は変えない。

### 4. OpenAI 呼び出しの Workers 対応

- `Buffer` を使わない base64 化に置き換える（または `compatibility_flags: ["nodejs_compat"]`）。
- `OPENAI_API_KEY` はローカルでは `.dev.vars`、本番では `wrangler secret put OPENAI_API_KEY` で設定する。
- Workers のメモリ上限（128MB）を踏まえ、20MB の PDF を base64 化して送れるか実機で確認する。厳しければアップロード上限を下げるか、OpenAI の Files API にアップロードしてから参照する方式に変える。

### 5. Cloudflare Access での保護

- ダッシュボードで Zero Trust を有効にし（Free プラン、50 ユーザー未満）、ID プロバイダーに Google を追加する。
- Worker の設定から Access を有効にする（`workers.dev` と Preview URL をまとめて保護できる）。ポリシーは「家族のメールアドレスを許可」にする。
- `access-auth.ts` を実装する: `Cf-Access-Jwt-Assertion` ヘッダーを、`https://<チーム名>.cloudflareaccess.com/cdn-cgi/access/certs` の公開鍵と AUD タグで検証する（`jose` の `createRemoteJWKSet` / `jwtVerify` を想定）。検証に失敗したら 403 を返す。
- 検証に成功したら `APP_USER_ID`（家族共有の ID）を返す（ADR 0005「データの所有者」参照）。
- `wrangler.jsonc` の `vars` に `ACCESS_TEAM_DOMAIN`、`ACCESS_AUD` を追加する。これらが未設定のローカル開発では `localAuth` を使う。
- `AuthPort.requireUserId()` はリクエストのヘッダーを読む必要があるため、server function / route から現在のリクエストを受け取れる形にする（TanStack Start の `getRequest()` 等を利用）。

### 6. 本番データとデプロイ

- 既存のローカル DB に残したいデータがあれば、`wrangler d1 execute --remote` で移す（なければ空で開始）。
- デプロイは Workers Builds（Cloudflare 側の GitHub 連携）を第一候補にする。GitHub Actions を使う場合は `CLOUDFLARE_API_TOKEN` だけを Secrets に置く。
- デプロイ後、Access を通さないアクセスが 403 になること、家族以外のアカウントで入れないことを確認する。

### 7. 後片付け

- `docs/仮仕様.md` の該当章と `CONTEXT.md` が実装と一致しているか見直す。
- `vp run knip` で不要になった依存（`@libsql/client` など）が残っていないか確認する。

## 無料枠の目安（2026-09 時点）

| サービス | 無料枠                                                                       | 備考                                               |
| -------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Workers  | 1 日 10 万リクエスト                                                         | 個人利用なら十分                                   |
| D1       | 5GB、読み取り 1 日 500 万行、書き込み 1 日 10 万行                           | 2026-09 から上限到達時はその日の残りクエリが止まる |
| R2       | 10GB、書き込み系操作 月 100 万回、読み取り系操作 月 1,000 万回。転送量は無料 | PDF 本体の置き場                                   |
| Access   | 50 ユーザー未満は無料                                                        | 家族利用なら十分                                   |

料金は変わるため、導入時に公式ページで再確認する。

## 決まっていないこと

- 独自ドメインを使うか（`workers.dev` のままでも Access は使える）。
- D1 のバックアップ方針（Time Travel の保持期間で足りるか、定期エクスポートするか）。
- 20MB の PDF を AI 解析するときのメモリ・時間の上限への対処（手順 4）。
