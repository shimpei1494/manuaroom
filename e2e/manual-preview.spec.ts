import { expect, test } from "@playwright/test";

// 説明書の PDF の開き方を確かめる。PC はモーダルの iframe でプレビューし、スマホは新しいタブで開く。
// iOS Safari は iframe 内の PDF を 1 ページ目しか描画せず、Android Chrome は iframe 内で PDF を表示できないため。

const MINIMAL_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
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
    const open = page.getByRole("link", { name: "PDF を開く" });
    const href = await open.getAttribute("href");
    expect(href).toMatch(/^\/api\/manuals\/[^/]+\/file$/);
    await expect(open).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("button", { name: "プレビュー" })).toHaveCount(0);

    const res = await page.request.get(href ?? "");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
    expect(res.headers()["content-disposition"]).toMatch(/^inline;/);
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
