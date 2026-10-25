import { defineConfig } from "vite-plus";

// 通常の vp test (vite.config.ts) には含めない、並行実行の全順序検証だけを走らせる設定。
export default defineConfig({
  test: {
    include: [".claude/skills/verify-maintenance-log-races/*.check.ts"],
  },
});
