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

- `d1 create` が表示する `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に書き込んでコミットする（秘密情報ではない。作成済みの `manuaroom` の ID は記入済み）。
- `d1 create` の最後に「wrangler.jsonc に追加するか」と聞かれたら **no** にする。yes にすると別のバインディング名で 2 つ目の設定が追加されてしまう。
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
2. Zero Trust の設定（Authentication → Login methods）で **Google** を追加する。Google Cloud 側で OAuth クライアントを作る（使っているプロジェクトは `home-manuals`）。
   - Google Auth Platform → **クライアント** → 作成。アプリケーションの種類は「ウェブ アプリケーション」、承認済みのリダイレクト URI は `https://<チーム名>.cloudflareaccess.com/cdn-cgi/access/callback`。JavaScript 生成元は空欄でよい（サーバーサイドの OAuth フローのみ使うため）。
   - 作成されたクライアント ID とクライアント シークレットを Cloudflare の Login methods 設定に貼り付ける。
   - このプロジェクトの OAuth 同意画面は「テスト中」のまま運用している。**テストユーザーに登録していない Google アカウントはログイン自体ができない**（Google Auth Platform → **対象** → テストユーザー）。家族を追加するときは、ここへの追加が必要（下の「家族を追加・削除するとき」参照）。
3. Workers & Pages → `manuaroom` → Settings → Domains & Routes で、`workers.dev` と Preview URLs の Cloudflare Access を有効にする。
4. 作成された Access アプリケーションにポリシーを追加する。**ルールのセレクタは「メール」（個別アドレス指定）にし、ドメイン指定（Email domain / Emails ending in）は使わない**（`gmail.com` などで全許可すると、Google 側のテスト制限が外れた時に誰でも入れてしまう）。アクションは「許可」。家族それぞれの実際の Gmail アドレスを入れる。
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

## 7. LINE の週次通知（任意）

毎週土曜 9:00（日本時間）に、期限切れと 7 日以内に期限が来るタスクを LINE 公式アカウントから家族に送る。知らせるタスクがない週は送らない。

1. [LINE Official Account Manager](https://manager.line.biz/) で LINE ビジネス ID を作り、公式アカウントを作る（未認証アカウントでよい。コミュニケーションプランなら無料で月 200 通まで。1 人に 1 回送ると 1 通なので、家族 4 人で週 1 回なら月 20 通弱）。
2. 公式アカウントの設定 → Messaging API で「Messaging API を利用する」を押し、プロバイダーを作る（名前は何でもよい）。
3. [LINE Developers コンソール](https://developers.line.biz/console/) で、そのチャネルの「Messaging API 設定」→ **チャネルアクセストークン（長期）** を発行する。
4. トークンを Worker のシークレットに登録する。

```bash
vp exec wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
```

5. 家族それぞれが、Messaging API 設定の QR コードから公式アカウントを友だち追加する。**友だち全員に送る（ブロードキャスト）ので、家族以外は友だちにしない。**
6. 自動応答メッセージが不要なら、Official Account Manager の応答設定で「応答メッセージ」をオフにする。

Cron は `wrangler.jsonc` の `triggers.crons`（`0 0 * * sat` = UTC の土曜 0:00）で決まり、`vp run deploy` のときに登録される。曜日や時刻を変えるときはここを書き換えて再デプロイする。Cron は Worker の中から直接呼ばれるので Cloudflare Access の影響は受けない。

トークンが未登録のときは送らずにログへ出すだけなので、LINE の準備より先にデプロイしても問題ない。送信結果は Workers & Pages → `manuaroom` → Logs で確認できる。

## 家族を追加・削除するとき

ログインを許可・禁止するには、次の 2 箇所を**両方**更新する。片方だけだと、意図せず全員通す/誰も通さない状態になる。

1. **Google Cloud（`home-manuals` プロジェクト）**: Google Auth Platform → 対象 → テストユーザーに、その人の Google アカウントを追加・削除する。ここに載っていないアカウントは Google のログイン画面自体で弾かれる。
2. **Cloudflare Access のポリシー**: `manuaroom` の Access アプリケーションのポリシーで、「メール」セレクタに登録した個別アドレスを追加・削除する。

## 自動デプロイ（GitHub のリリース）

GitHub でリリースを公開すると、GitHub Actions（`.github/workflows/deploy.yml`）が本番の D1 にマイグレーションを当ててから `vp run deploy` を実行する。main へのマージでは出さないので、いくつかマージしてからまとめてリリースする。

### 最初に一度だけ

1. Cloudflare ダッシュボード → 右上のアカウントアイコン → Profile → API Tokens → Create Token → **Create Custom Token**。
2. 権限を最小にして作る（テンプレート「Edit Cloudflare Workers」は KV やルート、ゾーンまで触れるので使わない）。
   - Permissions: **Account → Workers Scripts → Edit** と **Account → D1 → Edit**
   - Account Resources: Include → 自分のアカウントだけ
   - TTL: 終了日を 1 年後などに設定する（切れたら作り直して Secret を差し替える）
   - 初回のデプロイが権限不足（Authentication error など）で落ちたら、エラーに出た権限だけを足す。
3. 発行したトークンと、Workers & Pages の画面右側に出ている **Account ID** を控える。
4. GitHub のリポジトリ → Settings → Secrets and variables → Actions → New repository secret で、次の 2 つを登録する。

| 名前                    | 値                   |
| ----------------------- | -------------------- |
| `CLOUDFLARE_API_TOKEN`  | 手順 2 のトークン    |
| `CLOUDFLARE_ACCOUNT_ID` | 手順 3 の Account ID |

`OPENAI_API_KEY` や `LINE_CHANNEL_ACCESS_TOKEN` は Worker 側に登録済みで、デプロイしても消えないので GitHub には置かない。

### なぜ OIDC ではなく API トークンか

AWS や Google Cloud なら、GitHub Actions の OIDC で長期の鍵を置かずに済む。Cloudflare の API は 2026-10 時点で OIDC（ワークロード ID 連携）に対応していないため、API トークンを使う（[workers-sdk の要望](https://github.com/cloudflare/workers-sdk/discussions/11434)）。代わりに次の方法で漏れたときの影響を小さくしている。

- トークンの権限を Workers のスクリプトと D1 だけ、自分のアカウントだけに絞り、期限を付ける。
- トークンは wrangler を動かす 2 つのステップにだけ渡し、依存関係のインストール中のスクリプトからは見えないようにする。
- シークレットを扱うワークフローの Action はコミット SHA で固定する。
- リポジトリは非公開で、フォークからの PR にはシークレットが渡らない。デプロイはリリースの公開か手動実行のときだけ動く。

対応されたら OIDC に切り替える。

### リリースのしかた

GitHub のリポジトリ → Releases → Draft a new release で、タグ（例: `v1.2.0`）を新しく作り、対象は `main` のまま「Generate release notes」でマージした PR の一覧を入れて Publish する。Actions タブの Deploy が緑になれば完了。

- 出し直したいときは Actions → Deploy → Run workflow で、選んだブランチ（通常は `main`）をそのままデプロイできる。
- 前のバージョンに戻したいときは、Workers & Pages → `manuaroom` → Deployments から以前のデプロイに戻せる（Rollback）。ただし DB のマイグレーションは戻らない。
- 手元から `vp run db:migrate:remote` と `vp run deploy` を実行する方法も、これまでどおり使える。

## アプリ側の仕組み

- `src/start.ts` のリクエストミドルウェアが、画面・server function・API のすべてのリクエストで `Cf-Access-Jwt-Assertion` ヘッダーを、チームの公開鍵・発行元・AUD・期限で検証する（`src/infrastructure/auth/access-jwt.ts`）。検証できなければ 403。
- `ACCESS_TEAM_DOMAIN` などが空のままデプロイした場合も 403 になる。
- 検証を通ったリクエストでは、`AuthPort.requireUserId()` が `APP_USER_ID` を返す。
- `vp dev` では Access を通らないので検証せず、固定ユーザー `local-user-1` で動く（`import.meta.env.DEV` で切り替え）。
- JS や CSS などの静的ファイルは Worker を通らずに配信されるため、このミドルウェアの対象外。本番では Access が入口で止める。
