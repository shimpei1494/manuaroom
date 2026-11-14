import { expect, type Locator, type Page, test } from "@playwright/test";

// 購入日のカレンダーは、空のとき今日 (日本時間) の月で開き、今日に印が付く。値は選ぶまで空のまま。
// 「今日」を固定するため、実際の今日とは違う月 (2026/03/20 日本時間) に時計を合わせる。

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-03-20T10:00:00+09:00"));
});

async function openPurchaseCalendar(page: Page, scope: Locator) {
  await scope.getByLabel("購入日").click();
  // DateInput のドロップダウン内の今日のマス
  return page.locator("button[data-today]");
}

test("新規登録: 購入日のカレンダーは今日の月で開き、選ぶまで空のまま", async ({ page }) => {
  await page.goto("/products/new", { waitUntil: "networkidle" });
  const today = await openPurchaseCalendar(page, page.locator("main"));

  await expect(today).toHaveCount(1);
  await expect(today).toHaveText("20");
  await expect(page.getByRole("button", { name: "3月 2026", exact: true })).toBeVisible();
  await expect(page.getByLabel("購入日")).toHaveValue("");

  await today.click();
  await expect(page.getByLabel("購入日")).toHaveValue("2026/03/20");
});

test("編集: 購入日が空の製品でも、カレンダーは今日の月で開く", async ({ page }) => {
  const productName = `E2E 購入日 ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await page.getByRole("button", { name: "編集" }).click();

  const dialog = page.getByRole("dialog");
  const today = await openPurchaseCalendar(page, dialog);
  await expect(today).toHaveCount(1);
  await expect(today).toHaveText("20");
  await expect(page.getByRole("button", { name: "3月 2026", exact: true })).toBeVisible();
  await expect(dialog.getByLabel("購入日")).toHaveValue("");
});
