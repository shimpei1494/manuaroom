import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import reactDoctor from "react-doctor/eslint-plugin";
import { defineConfig } from "vite-plus";

const reactDoctorRules = {
  ...reactDoctor.configs.recommended.rules,
  ...reactDoctor.configs["tanstack-start"].rules,
};

export default defineConfig({
  fmt: {
    ignorePatterns: ["**/routeTree.gen.ts", "worker-configuration.d.ts"],
    sortImports: {
      partitionByComment: true,
    },
    sortPackageJson: {
      sortScripts: true,
    },
  },
  lint: {
    categories: {
      correctness: "error",
    },
    env: {
      browser: true,
      node: true,
    },
    ignorePatterns: ["**/routeTree.gen.ts", "worker-configuration.d.ts"],
    jsPlugins: [{ name: "react-doctor", specifier: "react-doctor/oxlint-plugin" }],
    options: {
      denyWarnings: true,
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ["src/router.tsx", "*.config.ts"],
        rules: {
          "no-default-export": "off",
        },
      },
      // レイヤーの依存は内向きに揃える (ADR-0007)
      {
        files: ["src/domain/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: [
                    "**/application/**",
                    "**/infrastructure/**",
                    "**/server-functions/**",
                    "**/routes/**",
                  ],
                  message: "domain は外側の層に依存しない (ADR-0007)",
                },
              ],
            },
          ],
        },
      },
      {
        files: ["src/application/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["**/infrastructure/**", "**/server-functions/**", "**/routes/**"],
                  message:
                    "application は infrastructure や入口層に依存しない。必要なものは ports に定義する (ADR-0007)",
                },
              ],
            },
          ],
        },
      },
    ],
    plugins: ["react", "react-perf", "import", "jsx-a11y", "promise"],
    rules: {
      ...reactDoctorRules,
      "no-default-export": "error",
      // Mantine の modals.openConfirmModal({ onConfirm: ... }) のような
      // コールバックプロパティ経由の navigate を render 中の呼び出しと
      // 誤検出するため off にしている。
      "react-doctor/tanstack-start-no-navigate-in-render": "off",
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,css}": "vp check --fix",
  },
  plugins: [
    // dev / build ではサーバー側を workerd (Miniflare) で動かし、ローカルの D1・R2 を使う。
    // テストは Node 上で動かすので外す。
    ...(process.env.VITEST ? [] : [cloudflare({ viteEnvironment: { name: "ssr" } })]),
    tanstackStart(),
    // react's vite plugin must come after start's vite plugin
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
