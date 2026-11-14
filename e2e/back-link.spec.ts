import { expect, test } from "@playwright/test";

// 製品詳細の「製品一覧へ」は文字の部分だけが押せて、横の何もないところを押しても移動しないことを確かめる。
test("製品一覧へ戻るリンクは文字の部分だけが押せる", async ({ page }) => {
  const productName = `E2E 戻る ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  const detailUrl = page.url();

  const backLink = page.getByRole("link", { name: "製品一覧へ" });
  const linkBox = await backLink.boundingBox();
  if (!linkBox) throw new Error("リンクが見つからない");
  expect(linkBox.width).toBeLessThan(150);

  // リンクの右側の空いたところを押しても移動しない
  await page.mouse.click(linkBox.x + linkBox.width + 40, linkBox.y + linkBox.height / 2);
  await expect(page).toHaveURL(detailUrl);

  await backLink.click();
  await expect(page.getByRole("heading", { name: "製品一覧" })).toBeVisible();
});
