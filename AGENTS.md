# Vite+ (`vp`) の使い方

**Vite+** は開発・ビルド・テスト・Lint・フォーマット・パッケージ管理をひとつにまとめた CLI です。Vite 関連ツールをラップしています。`vp dev` と `vp build` は Vite を呼び出します。`vp help`、`vp <command> --help`、`vp --version` で詳細を確認できます。

**よく使うコマンド:** `vp install`, `vp dev`, `vp check`, `vp lint`, `vp test`, `vp build`, `vp run <script>`, `vp add` / `vp remove` / `vp update`

**ワークフロー:** pull 後は依存関係やロックファイルが変わっている可能性があるため `vp install` を実行してください。コードの修正が完了したら必ず `vp check` を実行し、エラーが出た場合はすべて修正してから作業を完了としてください。

## よくあるミス

- **パッケージマネージャーを直接使わない:** pnpm、npm、Yarn は直接使用しないでください。パッケージ管理はすべて Vite+ で行えます。
- **Vite コマンドでツールを実行する:** `vp vitest` や `vp oxlint` は存在しません。テストは `vp test`、Lint は `vp lint` を使用してください。
- **スクリプトの実行:** `package.json` の `scripts` に組み込みコマンドと同名のスクリプト（例: `test`）がある場合は `vp run test` で実行してください。
- **Vitest・Oxlint・Oxfmt・tsdown を直接インストールしない:** これらは Vite+ にラップされています。直接インストールしたり、個別にアップグレードしたりしないでください。
- **単発バイナリは Vite+ ラッパーを使う:** `npx` や各パッケージマネージャーの `dlx` の代わりに `vp dlx` を使用してください。
- **JavaScript モジュールは `vite-plus` からインポートする:** `vite` や `vitest` からは直接インポートせず、プロジェクトの `vite-plus` 依存からインポートしてください。例: `import { defineConfig } from 'vite-plus';` や `import { expect, test, vi } from 'vite-plus/test';`。テストユーティリティのために `vitest` をインストールしてはいけません。
- **型を考慮した Lint:** `oxlint-tsgolint` をインストールする必要はありません。`vp lint --type-aware` がそのまま使えます。

## 補助ツール

`vp check` には含まれません。インストールは Vite+ 経由で行うため `vp run` を使ってください。

- **Knip** (`vp run knip`) — 未使用のファイル・依存関係・エクスポートを検出します。依存関係の整理やエントリーポイントのリファクタリング時に使用してください（設定は `knip.config.ts`）。
- **react-doctor** (`vp run doctor`) — React に特化したヘルスチェックを実行します。スクリプトは `--no-lint` で動作するため、通常の Lint は `vp lint` で行ってください。

## Mantine UI

このプロジェクトは Mantine v9 を使用しています。
コンポーネントや API について不明な場合は以下を参照してください:

- ドキュメント: https://mantine.dev/llms.txt (コンパクト版)
- フル版: https://mantine.dev/llms-full.txt
