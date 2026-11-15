import { expect, test, type Page } from "@playwright/test";

// 製品詳細の「間取りに置く」から、図を押して置き、ドラッグで動かして保存し、
// 間取りのページの点から製品を開けること、間取りから外せることを確かめる。

async function saveSampleLayout(page: Page) {
  await page.goto("/map/settings", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "サンプルを入れる" }).click();
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText("間取りを保存しました")).toBeVisible();
}

test("製品を間取りに置いて、点から製品を開ける", async ({ page }) => {
  await saveSampleLayout(page);
  const productName = `E2E 冷蔵庫 ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);
  await page.getByLabel("設置場所").fill("キッチンの奥");
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.getByRole("link", { name: "間取りに置く" }).click();
  await expect(page.getByText(`「${productName}」を置く`)).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeDisabled();

  // 図の左下 (DK) を押して仮に置き、点をドラッグして少し右へ動かす
  const plan = page.locator(".floor-plan");
  const box = await plan.boundingBox();
  if (!box) throw new Error("間取り図が表示されていません");
  await plan.click({ position: { x: box.width * 0.2, y: box.height * 0.75 } });
  const marker = page.getByRole("button", { name: `${productName} の位置 (矢印キーで動かす)` });
  await expect(marker).toBeVisible();
  const before = await marker.boundingBox();
  if (!before) throw new Error("点が表示されていません");
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 30, before.y + before.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  const after = await marker.boundingBox();
  expect(after?.x ?? 0).toBeGreaterThan(before.x + 20);

  await page.getByRole("button", { name: "保存" }).click();
  await expect(page.getByText(`「${productName}」を間取りに置きました`)).toBeVisible();
  await expect(page).toHaveURL(/\/map\?product=/);

  // 保存直後は、置いた製品の吹き出しが開いている。先頭がその製品で、部屋名と設置場所が並ぶ
  // (近くに置いた製品があれば、その下に並ぶ)
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("DK ・ キッチンの奥").first()).toBeVisible();
  await dialog.getByRole("link", { name: productName, exact: true }).click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  // 置いた製品は「間取りで見る」になり、そこから外せる
  await page.getByRole("link", { name: "間取りで見る" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: `${productName} の位置を直す` })
    .click();
  await page.getByRole("button", { name: "間取りから外す" }).click();
  await expect(page.getByText(`「${productName}」を間取りから外しました`)).toBeVisible();
  await expect(page.getByRole("link", { name: "間取りに置く" })).toBeVisible();
});
