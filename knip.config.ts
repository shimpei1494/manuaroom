import type { KnipConfig } from "knip";

export default {
  // better-typescript-lib: TypeScript の lib 差し替え用。import されないため未使用扱いになる
  // cloudflare: `cloudflare:workers` は Workers ランタイムの組み込みモジュール
  ignoreDependencies: ["better-typescript-lib", "cloudflare"],
  // Vite が自動検出する PostCSS 設定ファイル
  ignore: ["postcss.config.cjs"],
} satisfies KnipConfig;
