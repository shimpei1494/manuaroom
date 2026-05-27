import type { KnipConfig } from "knip";

export default {
  // TypeScript の lib 差し替え用。import されないため未使用扱いになる
  ignoreDependencies: ["better-typescript-lib"],
  // Vite が自動検出する PostCSS 設定ファイル
  ignore: ["postcss.config.cjs"],
} satisfies KnipConfig;
