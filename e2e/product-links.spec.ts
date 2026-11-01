import { expect, test } from "@playwright/test";

// 製品詳細で関連リンクを追加・編集・削除し、リンクが別タブで開く設定になっていることを確かめる。

test("関連リンクを追加・編集・削除できる", async ({ page }) => {
  const productName = `E2E リンク ${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/products/new", { waitUntil: "networkidle" });
  await page.getByLabel("製品名").fill(productName);
  // スマホ幅では開発用の Router Devtools のボタンが「登録」に重なるので、Enter で送信する
  await page.getByLabel("製品名").press("Enter");
  await page.getByRole("link", { name: productName }).first().click();
  await expect(page.getByRole("heading", { name: productName })).toBeVisible();
  await expect(page.getByText("まだリンクがありません")).toBeVisible();

  await page.getByRole("button", { name: "リンクを追加" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("URL").fill("https://www.example.com/support");
  await dialog.getByLabel("何が書いてあるか").fill("エラーコードの対処方法");
  await dialog.getByLabel("URL").press("Enter");
  await expect(page.getByText("リンクを追加しました")).toBeVisible();
  await expect(dialog).toBeHidden();

  // タイトルを入れなければホスト名になる
  const link = page.getByRole("link", { name: "example.com" });
  await expect(link).toHaveAttribute("href", "https://www.example.com/support");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(page.getByText("エラーコードの対処方法")).toBeVisible();

  await page.getByRole("button", { name: "example.com の操作" }).click();
  await page.getByRole("menuitem", { name: "編集" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("タイトル").fill("公式サポート FAQ");
  await dialog.getByLabel("タイトル").press("Enter");
  await expect(page.getByText("リンクを更新しました")).toBeVisible();
  await expect(page.getByRole("link", { name: "公式サポート FAQ" })).toBeVisible();

  await page.getByRole("button", { name: "公式サポート FAQ の操作" }).click();
  await page.getByRole("menuitem", { name: "削除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "削除" }).click();
  await expect(page.getByText("リンクを削除しました")).toBeVisible();
  await expect(page.getByText("まだリンクがありません")).toBeVisible();
});
