# 本番は Cloudflare だけで揃え、入口は Cloudflare Access で守る

本番環境は Cloudflare Workers + D1 + R2 で構成し、DB に Turso は使わない。認証は当面アプリ内に実装せず、Worker 全体を Cloudflare Access（Google ログイン + 許可メールアドレスのポリシー）の後ろに置く。アプリは Access が付与する JWT（`Cf-Access-Jwt-Assertion` ヘッダー）を検証し、`AuthPort.requireUserId()` はその検証結果から値を返す。Better Auth + Google OAuth は、家族以外にも公開すると決めた時点で改めて検討する。

理由：個人・家族用アプリなので「無料で動くこと」に加えて「管理するサービスを減らすこと」を優先する。D1 は Turso と同じ SQLite なので Drizzle のスキーマとマイグレーションをほぼそのまま使え、Worker からはバインディングで直接つながるため DB の接続 URL やトークンの管理が不要になる。R2 も同じくバインディングで扱え、アクセスキーが不要になる。Access は家族のメールアドレスを許可リストに入れるだけで入口を制限でき、ログイン画面・セッション・ユーザーテーブルをアプリ側で持たずに済む。無料プランは 50 ユーザー未満まで使え、`workers.dev` や Preview URL にもワンクリックで適用できる。

## データの所有者

Access を通過した家族全員は同じデータを共有する（ADR 0004 の Household と同じ考え方）。そのため当面は、JWT を検証できたら環境変数で決めた共有 ID（例: `APP_USER_ID`）を `requireUserId()` から返す。メールアドレスごとに別の `user_id` にはしない。家族ごとに分けたくなったり、Household を正式導入したりする時点で、JWT の `email` / `sub` を使う形に切り替える。

## 影響

- `@libsql/client` とローカルファイルストレージは不要になる。ローカル開発も `@cloudflare/vite-plugin`（Miniflare）のローカル D1 / R2 を使い、本番と同じコード経路で動かす。
- Secrets は `OPENAI_API_KEY` と Access 検証用の設定（チーム名、AUD タグ）だけになる。`TURSO_AUTH_TOKEN`、`BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_SECRET`、R2 のアクセスキーは不要。
- Terraform は当面入れない。バインディングは `wrangler.jsonc`、Access はダッシュボードで管理する。
- ドメイン層・ユースケース層・画面は原則変更不要。変更は infrastructure 層、`vite.config.ts`、`wrangler.jsonc` に閉じる。

## 不採用案

- **Workers + Turso + R2（旧方針）**: 成立はするが、管理するサービスとトークンが 1 つ増える。D1 を上回る利点（組み込みレプリカ等）は個人利用では活きない。
- **Convex**: DB・ファイル・認証・定期実行が一式そろい運用は楽だが、無料枠のファイル保存が 1GB で説明書 PDF がすぐ埋まる。DB 層とサーバー処理を作り直す必要もある。
- **Better Auth + Google OAuth を最初から実装**: 家族だけが使う段階では、ログイン画面・セッション・ユーザー管理を自前で持つ手間に見合わない。
