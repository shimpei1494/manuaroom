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
    ignorePatterns: ["**/routeTree.gen.ts"],
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
    ignorePatterns: ["**/routeTree.gen.ts"],
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
    ],
    plugins: ["react", "react-perf", "import", "jsx-a11y", "promise"],
    rules: {
      ...reactDoctorRules,
      "no-default-export": "error",
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,css}": "vp check --fix",
  },
  plugins: [
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
