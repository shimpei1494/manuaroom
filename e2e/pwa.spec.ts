import { expect, test } from "@playwright/test";

// ホーム画面に追加できるように、manifest とアイコンが配信されていることを確かめる。
test("PWA の manifest とアイコンが読み込める", async ({ page, request }) => {
  await page.goto("/");

  const manifestLink = page.locator('link[rel="manifest"]');
  // Cloudflare Access の Cookie を付けて manifest を取りに行かせる
  await expect(manifestLink).toHaveAttribute("crossorigin", "use-credentials");
  const manifestHref = await manifestLink.getAttribute("href");
  if (!manifestHref) throw new Error("manifest の href がない");

  const manifestResponse = await request.get(manifestHref);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as {
    display: string;
    start_url: string;
    icons: { src: string; purpose: string }[];
  };
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons.map((icon) => icon.purpose)).toContain("maskable");

  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  for (const src of [...manifest.icons.map((icon) => icon.src), appleIcon ?? ""]) {
    const response = await request.get(src);
    expect(response.ok(), src).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});
