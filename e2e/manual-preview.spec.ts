import { expect, test } from "@playwright/test";

// 説明書の PDF の開き方を確かめる。PC はモーダルの iframe でプレビューし、スマホはアプリ内のビューアで開く。
// iOS Safari は iframe 内の PDF を 1 ページ目しか描画せず、Android Chrome は iframe 内で PDF を表示できない。
// 別タブで開くとホーム画面の PWA から戻れなくなるので、pdf.js で描いて「戻る」を出す。

const MINIMAL_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R 4 0 R]/Count 2>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
4 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 300]>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

test("説明書の PDF を開ける", async ({ page, isMobile }) => {
  const productName = `E2E PDF ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "manual.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(MINIMAL_PDF),
  });
  await page.getByRole("button", { name: "アップロード", exact: true }).click();
  await expect(page.getByText("説明書をアップロードしました")).toBeVisible();

  if (isMobile) {
    await expect(page.getByRole("button", { name: "プレビュー" })).toHaveCount(0);
    await page.getByRole("link", { name: "PDF を開く" }).click();
    await expect(page).toHaveURL(/\/manuals\/[^/?]+\?/);
    await expect(page.getByRole("heading", { name: "manual.pdf" })).toBeVisible();
    await expect(page.getByText("全 2 ページ")).toBeVisible();
    // 2 ページとも canvas に描かれる (幅が付く)
    for (const label of ["1 ページ目", "2 ページ目"]) {
      const canvas = page.getByLabel(label);
      await canvas.scrollIntoViewIfNeeded();
      await expect
        .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width))
        .toBeGreaterThan(0);
    }
    // ブラウザ (PWA ではない) では別タブで開くリンクもある
    await expect(page.getByRole("link", { name: "新しいタブで開く" })).toHaveAttribute(
      "target",
      "_blank",
    );

    await page.getByRole("button", { name: "戻る" }).click();
    await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  } else {
    await page.getByRole("button", { name: "プレビュー" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("iframe")).toHaveAttribute("src", /^\/api\/manuals\/[^/]+\/file$/);
    await expect(dialog.getByRole("link", { name: "新しいタブで開く" })).toHaveAttribute(
      "target",
      "_blank",
    );
  }
});
