import { expect, test } from "@playwright/test";

// メニューで別のページに移るとき、読み込みが終わるまでの間に「前のページ」が
// 作り直されて一瞬もう一度表示されないことを確かめる。
// 初めて開くページほど読み込みに時間がかかって目立つので、サーバー関数の応答をわざと遅らせる。
test("メニューで移動したとき、前のページが一瞬もう一度表示されない", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "今やること" })).toBeVisible();

  await page.route("**/_serverFn/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });

  // ページの入れ物 (.page-enter) が作り直されるたびに、その時の中身を記録する
  await page.evaluate(() => {
    const main = document.querySelector(".app-main");
    if (!main) throw new Error(".app-main がない");
    const mounted: string[] = [];
    Object.assign(window, { __mountedPages: mounted });
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains("page-enter")) {
            mounted.push(node.innerText);
          }
        }
      }
    }).observe(main, { childList: true, subtree: true });
  });

  // PC 幅は左のサイドバー、スマホ幅は下のタブバーから移動する
  const nav = isMobile
    ? page.locator(".tab-bar").getByRole("link", { name: "メンテ", exact: true })
    : page.locator(".app-navbar").getByRole("link", { name: "メンテナンス", exact: true });
  await nav.click();
  await expect(page.getByRole("heading", { name: "メンテナンス" })).toBeVisible();

  const mounted = await page.evaluate(
    () => (window as unknown as { __mountedPages: string[] }).__mountedPages,
  );
  expect(mounted.length).toBeGreaterThan(0);
  for (const text of mounted) {
    expect(text).not.toContain("今やること");
  }
});
