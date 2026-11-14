import { expect, test } from "@playwright/test";

// 購入日を入れてから保証期間の候補を選ぶと、保証期限が自動で入ることを確かめる。

test("購入日 + 保証期間の候補で保証期限が入り、購入日を直すと追従する", async ({ page }) => {
  const productName = `E2E 保証 ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);

  // 購入日がないうちは候補を選べない
  await expect(page.getByRole("radio", { name: "1年" })).toBeDisabled();

  await page.getByLabel("購入日").fill("2026/01/10");
  await page.getByLabel("製品名").click();
  await page.getByText("1年", { exact: true }).click();
  await expect(page.getByLabel("保証期限")).toHaveValue("2027/01/10");
  await expect(page.getByRole("radio", { name: "1年" })).toBeChecked();

  // 期間で入れたあとに購入日を直すと、保証期限も同じ期間でずれる
  await page.getByLabel("購入日").fill("2026/02/01");
  await page.getByLabel("製品名").click();
  await expect(page.getByLabel("保証期限")).toHaveValue("2027/02/01");

  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByText("2027/02/01")).toBeVisible();

  // 編集画面でも、保存済みの保証期限に合う期間が選ばれた状態で開く
  await page.getByRole("button", { name: "編集" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: "1年" })).toBeChecked();
  await dialog.getByText("3年", { exact: true }).click();
  await expect(dialog.getByLabel("保証期限")).toHaveValue("2029/02/01");
  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("製品を更新しました")).toBeVisible();
  await expect(page.getByText("2029/02/01")).toBeVisible();
});
