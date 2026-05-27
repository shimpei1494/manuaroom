# TanStack Start スターターテンプレート

> [lightsound/tanstack-start-start](https://github.com/lightsound/tanstack-start-start) をベースに、Tailwind CSS を [Mantine](https://mantine.dev/) に置き換えた自分用テンプレートです。

[TanStack Start](https://tanstack.com/start) と [TanStack Router](https://tanstack.com/router) を使った最小構成のアプリケーションテンプレート。開発・ビルド・フォーマット・リント・テストは [Vite+](https://viteplus.dev/) で統一管理。

## 含まれるもの

- **TanStack Start** — `src/routes/` 配下のファイルベースルーティング
- **React 19** + **TypeScript**
- **Mantine** — UIコンポーネントライブラリ
- **Vite+** 管理ツール：Oxlint、Oxfmt、`vite-plus/test` によるテスト（ワークフローや注意点は [AGENTS.md](AGENTS.md) を参照）

## 必要な環境

[Vite+](https://viteplus.dev/guide/) をインストールして `vp` コマンドを PATH に追加してください。

パッケージマネージャーは **`pnpm@10.32.1`** を使用。依存関係の管理は `vp install` などの Vite+ コマンドで行い、`pnpm` / `npm` / `yarn` を直接呼ぶのは避けてください。

## セットアップ

\`\`\`bash
git clone <このリポジトリのURL>
cd tanstack-start-start-mantine
vp install
vp config
vp dev
\`\`\`

`vp config` を実行すると git の `core.hookspath` が `.vite-hooks/_` に設定され、コミット前に `vp staged`（ステージ済みファイルのチェック）が自動実行されるようになります。

ターミナルに表示された URL（デフォルトは `http://localhost:5173`）をブラウザで開く。

## よく使うコマンド

| コマンド     | 内容                                                   |
| ------------ | ------------------------------------------------------ |
| `vp dev`     | HMR付きの開発サーバー起動                              |
| `vp build`   | プロダクションビルド                                   |
| `vp preview` | プロダクションビルドのローカルプレビュー               |
| `vp check`   | フォーマット・リント・型チェック（`--fix` で自動修正） |
| `vp test`    | テスト実行                                             |
| `vp help`    | コマンド一覧の表示                                     |

`package.json` のスクリプト（`dev`、`build`、`check`、`test` など）は同じ `vp` コマンドに委譲しています。

任意のメンテナンスツール（`vp check` には含まれない）：

- `vp run knip` — 未使用ファイル・依存関係・エクスポートの検出（`knip.config.ts`）
- `vp run doctor` — React ヘルスチェック（`react-doctor`、`--no-lint` 付き）

## ライセンス

[MIT](LICENSE.md)
