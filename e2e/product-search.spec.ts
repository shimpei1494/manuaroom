import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

async function createProduct(page: Page, name: string, manufacturer: string) {
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(name);
  await page.getByLabel("メーカー").fill(manufacturer);
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await expect(page.getByRole("link", { name }).first()).toBeVisible();
}

// 製品一覧の検索欄で、製品名やメーカーの一部から絞り込めることを確かめる。
test("製品一覧を製品名・メーカーの部分一致で絞り込める", async ({ page }) => {
  const id = crypto.randomUUID().slice(0, 8);
  const washer = `E2E 検索 洗濯機 ${id}`;
  const fridge = `E2E 検索 冷蔵庫 ${id}`;
  await createProduct(page, washer, `ハヤテ電機${id}`);
  await createProduct(page, fridge, `ツメタ工業${id}`);

  const search = page.getByRole("searchbox", { name: "製品を検索" });

  // 製品名の一部
  await search.fill(`洗濯機 ${id}`);
  await expect(page.getByRole("link", { name: washer })).toBeVisible();
  await expect(page.getByRole("link", { name: fridge })).toHaveCount(0);
  await expect(page).toHaveURL(/[?&]q=/);

  // メーカーの一部 (ひらがなでもカタカナに一致する)
  await search.fill(`つめた工業${id}`);
  await expect(page.getByRole("link", { name: fridge })).toBeVisible();
  await expect(page.getByRole("link", { name: washer })).toHaveCount(0);

  // 詳細を開いて戻っても検索語が残る
  await page.getByRole("link", { name: fridge }).click();
  await expect(page.getByRole("heading", { name: fridge })).toBeVisible();
  await page.goBack();
  await expect(search).toHaveValue(`つめた工業${id}`);
  await expect(page.getByRole("link", { name: washer })).toHaveCount(0);

  // 一致しなければ案内を出し、クリアで全件に戻る
  await search.fill(`該当なし ${id}`);
  await expect(page.getByText("一致する製品はありません")).toBeVisible();
  await page.getByRole("button", { name: "検索をクリア" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("link", { name: washer })).toBeVisible();
  await expect(page.getByRole("link", { name: fridge })).toBeVisible();
});
