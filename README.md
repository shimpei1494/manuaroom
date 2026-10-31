# Manuaroom

家電・家具・住宅設備の説明書 PDF をまとめて保管し、フィルター掃除や部品交換などのメンテナンス時期を管理する、家族向けの Web アプリ。説明書 PDF を AI で読み取り、「使えるメンテナンス台帳」に変えることを狙いにしている。

本番: <https://manuaroom.peishim.workers.dev>（Cloudflare Access で家族のアカウントだけがログインできる）

## できること

- **製品の登録** — 製品名・メーカー・型番・購入日などを登録する。説明書 PDF をアップロードすると、AI が製品情報を読み取ってそのまま登録することもできる。
- **説明書の保管とプレビュー** — 1 つの製品に複数の PDF（取扱説明書・据付説明書など）を紐づけ、画面上で開ける。
- **AI によるメンテナンス項目の提案** — 説明書を解析し、「フィルター清掃 / 2 週間ごと」のような項目を提案する。採用したものだけが台帳に入る。
- **説明書への質問** — 説明書の内容について AI にチャットで質問できる（履歴は保存しない）。
- **今やること** — トップページに、期限切れと 7 日以内に期限が来る項目を出す。
- **完了・スキップ・取り消し** — 完了すると次回予定日が立ち、スキップすると次の周期へ送る。直前の操作は取り消せる。実施・スキップの履歴が残る。
- **カレンダー** — 月ごとに予定・目安・実施・スキップを表示する（3 か月先までの見込みも切り替えて見られる）。
- **LINE の週次通知** — 毎週土曜 9:00（JST）に、今週やることのまとめを LINE 公式アカウントから送る。

用語（Product、Manual、Maintenance Task など）の定義は [CONTEXT.md](CONTEXT.md) にある。

## 技術スタック

| 分類           | 使っているもの                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------- |
| フレームワーク | [TanStack Start](https://tanstack.com/start)（React 19 + TypeScript、ファイルベースルーティング） |
| UI             | [Mantine](https://mantine.dev/) v9、[Tabler Icons](https://tabler.io/icons)                       |
| 実行環境       | Cloudflare Workers                                                                                |
| DB             | Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team/)                                          |
| PDF の保存先   | Cloudflare R2                                                                                     |
| 認証           | Cloudflare Access（Google ログイン、家族のメールアドレスだけ許可）                                |
| AI             | [TanStack AI](https://tanstack.com/ai) 経由で OpenAI API。PDF をそのまま渡して解析・質問する      |
| 通知           | Cloudflare Cron Triggers + LINE Messaging API                                                     |
| ツールチェーン | [Vite+](https://viteplus.dev/)（`vp`）で開発・ビルド・Lint・フォーマット・テストをまとめて扱う    |
| テスト         | `vite-plus/test`（単体・ユースケース・結合）、[Playwright](https://playwright.dev/)（E2E）        |

コードは `domain`（業務ルールの純粋関数）→ `application`（ユースケースと ports）→ `infrastructure`（D1・R2・AI などの実装）の層に分けている。

```text
src/
  domain/            業務ルール（日付・周期の計算、完了・スキップなど）
  application/       ユースケースと ports（外部への依存の口）
  infrastructure/    D1・R2・Access・AI・LINE の実装と組み立て（deps.ts）
  server-functions/  画面から呼ぶサーバー関数
  routes/            画面と API（ページを組み立てるだけ）
  features/          画面の部品（製品・説明書・メンテナンスなど機能ごと）
  server.ts          Worker の入口（Cron の処理もここ）
drizzle/             D1 のマイグレーション SQL
e2e/                 Playwright の E2E テスト
docs/                開発・デプロイの手順と ADR
```

## ローカルで動かす

必要なもの: Node.js 26 (LTS) 推奨、22 以上と [Vite+](https://viteplus.dev/guide/)（`vp` コマンド）。Cloudflare のアカウントは不要で、`vp dev` の中でローカル版の D1・R2 が立ち上がる。ログインもなく、固定のユーザーで動く。

```bash
vp install                       # 止まったまま進まないときは CI=true vp install
vp config                        # コミット前チェック（vp staged）の Git フックを有効にする
cp .dev.vars.example .dev.vars   # AI を試すなら OPENAI_API_KEY を記入
vp run db:migrate                # ローカル D1 にテーブルを用意
vp dev                           # http://localhost:5173
```

OpenAI のキーがなくても、AI 以外の機能は動く。AI もキーなしで試したいときは、別のターミナルで `vp run mock:openai` を起動し、`.dev.vars` の `OPENAI_BASE_URL` を有効にする（`OPENAI_API_KEY` には適当な値を入れる）。

パッケージマネージャーは `pnpm@12.15.0`（`package.json` の `packageManager` で固定、Vite+ が自動で取得する）。依存の追加・削除も `vp install` / `vp add` / `vp remove` で行い、`pnpm` / `npm` を直接呼ばない。pnpm の設定は `pnpm-workspace.yaml` にある。

ローカルの構成、データの確認とリセット、週次通知の試し方は [docs/local-development.md](docs/local-development.md) を参照。

### DB を変更したとき

`src/infrastructure/db/schema.ts` を変えたら `vp run db:generate` でマイグレーションを作り、`vp run db:migrate` でローカルに適用する。DB を変える変更を取り込んだあとも、ローカルで `vp run db:migrate` を実行する。本番には `vp run db:migrate:remote` で適用する。

## よく使うコマンド

| コマンド                   | 内容                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `vp dev`                   | 開発サーバー起動                                             |
| `vp check`                 | フォーマット・Lint・型チェック（`--fix` で自動修正）         |
| `vp test`                  | 単体・ユースケース・結合テスト                               |
| `vp run e2e`               | E2E テスト（初回は `vp exec playwright install chromium`）   |
| `vp run db:generate`       | スキーマの変更からマイグレーション SQL を生成                |
| `vp run db:migrate`        | マイグレーションをローカル D1 に適用                         |
| `vp run db:migrate:remote` | マイグレーションを本番 D1 に適用                             |
| `vp run mock:openai`       | キーなしで AI 機能を試すためのモック OpenAI サーバー         |
| `vp run cf-typegen`        | `wrangler.jsonc` と `.dev.vars` からバインディングの型を生成 |
| `vp run deploy`            | ビルドして本番の Worker にデプロイ                           |
| `vp run knip`              | 未使用のファイル・依存・エクスポートの検出                   |
| `vp run doctor`            | React のヘルスチェック（react-doctor）                       |

## テスト

業務ルール（`domain`）とユースケースはテストを先に書く。ユースケースはフェイクの依存と固定の時計で試し、リポジトリと R2 の結合テストはメモリ上の D1・R2 で動かす。画面は主要な流れだけを Playwright の E2E で確かめる。

PR では GitHub Actions が `vp check`・`vp test`・`vp run e2e` を実行する。書き方と層ごとの方針は [docs/testing.md](docs/testing.md) を参照。

## デプロイ

Cloudflare の D1・R2・Access・シークレット（`OPENAI_API_KEY`、`LINE_CHANNEL_ACCESS_TOKEN`）の用意から、デプロイ、家族の追加、LINE 通知の設定までの手順は [docs/deployment.md](docs/deployment.md) にまとめている。

## ドキュメント

- [CONTEXT.md](CONTEXT.md) — 用語集
- [docs/local-development.md](docs/local-development.md) — ローカル開発ガイド
- [docs/deployment.md](docs/deployment.md) — 本番環境の用意とデプロイ
- [docs/testing.md](docs/testing.md) — テストの書き方
- [docs/adr/](docs/adr/) — 設計判断の記録
  - [0001](docs/adr/0001-maintenance-interval-uses-completion-date.md) 次回予定日は完了日から数える
  - [0002](docs/adr/0002-product-fields-are-mostly-optional.md) 製品の項目はほとんど任意
  - [0003](docs/adr/0003-consumables-as-maintenance-tasks.md) 消耗品もメンテナンスタスクとして扱う
  - [0004](docs/adr/0004-user-scoping-with-household-future.md) ユーザー単位のデータ（将来は世帯単位）
  - [0005](docs/adr/0005-cloudflare-only-stack-with-access.md) Cloudflare だけで動かし、認証は Access
  - [0006](docs/adr/0006-skip-advances-to-next-cycle-and-is-logged.md) スキップは次の周期へ送り、記録に残す
  - [0007](docs/adr/0007-layered-structure-and-testing-policy.md) 層の分け方とテストの方針
  - [0008](docs/adr/0008-ai-features-use-tanstack-ai.md) AI 機能は TanStack AI を使う
  - [0009](docs/adr/0009-concurrent-maintenance-writes-compare-updated-at.md) 同時更新は updated_at を比べて防ぐ
- [docs/plan/](docs/plan/) — 実装計画（Cloudflare 移行、今やること・カレンダー・スキップ）
- [AGENTS.md](AGENTS.md) — Vite+ の使い方と、コーディングエージェント向けの約束

## ライセンス

[MIT](LICENSE.md)。[lightsound/tanstack-start-start](https://github.com/lightsound/tanstack-start-start) をもとにしたテンプレートから始めている。
