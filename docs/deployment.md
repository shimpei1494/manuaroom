# 本番環境の用意とデプロイ

Cloudflare（Workers + D1 + R2 + Access）に本番環境を作り、デプロイするまでの手順。方針は [ADR 0005](adr/0005-cloudflare-only-stack-with-access.md)、コード側の移行内容は [plan/cloudflare-migration.md](plan/cloudflare-migration.md) を参照。

コマンドはリポジトリのルートで実行する。`wrangler` は `vp exec wrangler ...` で呼び出す。ダッシュボードのメニュー名は 2026-09 時点の想定で、変わっていることがある。

## 1. アカウントとログイン（最初に一度だけ）

1. Cloudflare アカウントを作る（Free プラン）。
2. ダッシュボードで R2 を有効にする。無料枠内でも支払い方法の登録を求められることがある。
3. 手元で `vp exec wrangler login` を実行し、ブラウザで許可する。

## 2. D1 と R2 を作る

```bash
vp exec wrangler d1 create manuaroom
vp exec wrangler r2 bucket create manuaroom-manuals
```

- `d1 create` が表示する `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に書き込んでコミットする（秘密情報ではない）。
- `database_id` を書き換えると、ローカルの D1 は別の DB として扱われて空になる。ローカルのデータを残したい場合は、書き換える前に控えておく。

テーブルを作る:

```bash
vp run db:migrate:remote
```

## 3. OpenAI の API キー

```bash
vp exec wrangler secret put OPENAI_API_KEY
```

AI 解析を使わないなら省略できる（「AIで解析」を押したときにエラーになるだけ）。

## 4. 最初のデプロイ

```bash
vp run deploy
```

この時点では Access の設定が空なので、アプリはすべてのリクエストを 403 にする（検証なしで開くことはない）。

## 5. Cloudflare Access（Zero Trust）

1. ダッシュボードの Zero Trust を開き、チーム名を決めて Free プランで始める（50 ユーザー未満は無料。支払い方法の登録を求められることがある）。チームドメインは `<チーム名>.cloudflareaccess.com` になる。
2. Zero Trust の設定（Authentication → Login methods）で **Google** を追加する。画面の案内に従って Google Cloud で OAuth クライアントを作る。
3. Workers & Pages → `manuaroom` → Settings → Domains & Routes で、`workers.dev` と Preview URLs の Cloudflare Access を有効にする。
4. 作成された Access アプリケーションのポリシーを編集し、Include → Emails に家族のメールアドレスを入れる。
5. Access アプリケーションの画面で **Application Audience (AUD) Tag** をコピーする。
6. `wrangler.jsonc` の `vars` に書き込んでコミットし、もう一度 `vp run deploy` する。

```jsonc
"vars": {
  "ACCESS_TEAM_DOMAIN": "<チーム名>.cloudflareaccess.com",
  "ACCESS_AUD": "<AUD タグ>",
  "APP_USER_ID": "family",
},
```

`APP_USER_ID` は Access を通過した家族全員で共有するデータの持ち主 ID。データを入れたあとに変えると、それまでのデータが見えなくなるので変えない。

## 6. 確認

- 家族の Google アカウントでログインして開ける。
- シークレットウィンドウで家族以外の Google アカウントを使うと、Access の画面で止められる。
- 製品登録、PDF のアップロードと表示、タスク完了まで動く。データは D1、PDF は R2 のダッシュボードで見られる。
- 20MB 近い PDF で「AIで解析」を試し、メモリや時間の上限に当たらないか確かめる（移行計画の手順 4）。

## 自動デプロイ（任意）

GitHub に push したら自動でデプロイしたい場合は、Workers & Pages → `manuaroom` → Settings → Builds で GitHub リポジトリを接続する（Workers Builds）。ビルドとデプロイのコマンドは、ビルド環境で Vite+ が使えるかを確かめてから決める。

## アプリ側の仕組み

- `src/start.ts` のリクエストミドルウェアが、画面・server function・API のすべてのリクエストで `Cf-Access-Jwt-Assertion` ヘッダーを、チームの公開鍵・発行元・AUD・期限で検証する（`src/infrastructure/auth/access-jwt.ts`）。検証できなければ 403。
- `ACCESS_TEAM_DOMAIN` などが空のままデプロイした場合も 403 になる。
- 検証を通ったリクエストでは、`AuthPort.requireUserId()` が `APP_USER_ID` を返す。
- `vp dev` では Access を通らないので検証せず、固定ユーザー `local-user-1` で動く（`import.meta.env.DEV` で切り替え）。
- JS や CSS などの静的ファイルは Worker を通らずに配信されるため、このミドルウェアの対象外。本番では Access が入口で止める。
