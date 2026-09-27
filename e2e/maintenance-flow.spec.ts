import { expect, type Page, test } from "@playwright/test";

// 製品の登録から、今やること・完了・取り消し・スキップ・履歴・カレンダーまでを通しで確かめる。
// テストごとに名前の違う製品を作るので、同じ DB を使い回しても互いに影響しない。

/** 画面を開き、ハイドレーションが終わって操作できるようになるまで待つ。 */
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
}

async function createProductWithTask(page: Page, { interval }: { interval: number }) {
  const productName = `E2E 製品 ${crypto.randomUUID().slice(0, 8)}`;
  await open(page, "/products/new");
  await page.getByLabel("製品名").fill(productName);
  await page.getByRole("button", { name: "登録" }).click();
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.getByRole("button", { name: "タスクを追加" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("タスク名").fill("フィルター掃除");
  await dialog.getByLabel("周期").fill(interval.toString());
  await dialog.getByLabel("単位").click();
  await page.getByRole("option", { name: "日", exact: true }).click();
  await dialog.getByRole("button", { name: "追加" }).click();
  await expect(page.getByText("タスクを追加しました")).toBeVisible();
  return productName;
}

function todoCard(page: Page, productName: string) {
  return page.locator(".mantine-Card-root", { hasText: productName });
}

test("今やることから完了し、通知から元に戻せる", async ({ page }) => {
  const productName = await createProductWithTask(page, { interval: 3 });

  await open(page, "/");
  const card = todoCard(page, productName);
  await expect(card).toContainText("フィルター掃除");
  await expect(card).toContainText("あと3日");

  await card.getByRole("button", { name: "完了" }).click();
  const notice = page.locator(".mantine-Notification-root", { hasText: "完了を記録しました" });
  await expect(notice).toBeVisible();
  // 完了すると次回が今日 + 3 日になるので、カードは「あと3日」のまま残る
  await expect(card).toContainText("あと3日");

  await notice.getByRole("button", { name: "元に戻す" }).click();
  await expect(page.getByText("取り消しました")).toBeVisible();
});

test("スキップすると回数が出て、履歴から取り消せる", async ({ page }) => {
  const productName = await createProductWithTask(page, { interval: 3 });
  const row = page.getByRole("row", { name: /フィルター掃除/ });

  await row.getByRole("button", { name: "スキップ" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "スキップする" }).click();
  await expect(row).toContainText("1回スキップ中");

  await row.getByRole("button", { name: "履歴" }).click();
  const history = page.getByRole("dialog", { name: /履歴/ });
  await expect(history).toContainText("スキップ");
  await history.getByRole("button", { name: "元に戻す" }).click();
  await expect(history).toContainText("まだ記録がありません");
  await page.keyboard.press("Escape");
  await expect(row).not.toContainText("スキップ中");

  await open(page, "/maintenance");
  await expect(page.getByRole("row", { name: new RegExp(productName) })).toBeVisible();
});

test("カレンダーで今日の実施記録と予定が見られる", async ({ page }) => {
  const productName = await createProductWithTask(page, { interval: 1 });
  await page
    .getByRole("row", { name: /フィルター掃除/ })
    .getByRole("button", { name: "完了" })
    .click();
  await expect(page.getByText("完了を記録しました")).toBeVisible();

  await open(page, "/calendar");
  await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
  // 今日の欄が最初から開いている
  const detail = page.locator(".mantine-Card-root", { hasText: productName });
  await expect(detail).toContainText("実施");
});
