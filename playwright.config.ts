import { defineConfig, devices } from "@playwright/test";

// E2E テスト (docs/testing.md)。vp dev をテスト専用の空の D1・R2 で起動して、画面を通しで操作する。
// 手元の開発データ (.wrangler/state) には触らない。
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT.toString()}`,
    // 「今日」や日付の表示を日本時間で確かめる
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `vp run e2e:server --port ${PORT.toString()}`,
    url: `http://localhost:${PORT.toString()}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
