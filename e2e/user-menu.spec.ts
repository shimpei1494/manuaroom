import { expect, test } from "@playwright/test";

// ヘッダーのアバターを押すと、ログイン中の人とログアウトのメニューが開くことを確かめる。
// vp dev は Cloudflare Access を通らないので、ローカル開発用の表示になる (本番は Access のメールアドレス)。
test("アバターを押すとユーザー情報とログアウトのメニューが開く", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const avatarButton = page.getByRole("button", { name: "ユーザーメニュー" });
  // ライト・ダーク切り替えの左に並ぶ
  const avatarBox = await avatarButton.boundingBox();
  const toggleBox = await page.getByRole("button", { name: "カラースキーム切替" }).boundingBox();
  if (!avatarBox || !toggleBox) throw new Error("ヘッダーのボタンが見つからない");
  expect(avatarBox.x + avatarBox.width).toBeLessThanOrEqual(toggleBox.x);

  await avatarButton.click();
  await expect(page.getByTestId("user-menu-name")).toHaveText("ローカル開発ユーザー");
  await expect(page.getByTestId("user-menu-email")).toHaveText("ログインなし (vp dev)");
  // ローカルにはログアウト先がないので押せない
  await expect(page.getByRole("menuitem", { name: /ログアウト/ })).toBeDisabled();
});
