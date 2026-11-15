import { expect, test } from "@playwright/test";

// 間取り設定で JSON を貼り付け、誤りの表示・プレビュー・保存を通して、間取りのページに平面図が出ることを確かめる。
// 間取りは家族で 1 枚なので、desktop と mobile のどちらが先に走っても通るように書く。

const LAYOUT = {
  version: 1,
  name: "E2E の 1K",
  rooms: [
    { id: "room", name: "洋室", type: "bedroom", rect: [0, 0, 360, 300] },
    { id: "kitchen", name: "キッチン", type: "kitchen", rect: [0, 300, 240, 180] },
    { id: "bath", name: "ユニットバス", type: "bath", rect: [240, 300, 120, 180] },
  ],
  doors: [{ wall: [100, 300, 180, 300], opensInto: "room" }],
  windows: [{ wall: [60, 0, 300, 0] }],
};

test("間取りの JSON を貼り付けて保存すると、間取りのページに平面図が出る", async ({ page }) => {
  await page.goto("/map/settings", { waitUntil: "networkidle" });
  const textarea = page.getByLabel("間取りの JSON");

  // 誤りがあれば場所つきで知らせ、保存できない
  await textarea.fill(
    JSON.stringify({ ...LAYOUT, rooms: [{ ...LAYOUT.rooms[0], type: "garage" }] }),
  );
  await expect(page.getByText("この JSON はまだ保存できません")).toBeVisible();
  await expect(page.getByText(/rooms\[0\]\.type/)).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeDisabled();

  // AI が付けがちな ```json の囲みごと貼り付けても読める
  await textarea.fill("```json\n" + JSON.stringify(LAYOUT, null, 2) + "\n```");
  await expect(page.getByRole("heading", { name: "プレビュー" })).toBeVisible();
  await expect(page.getByText("ユニットバス", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("間取りを保存しました")).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByText("E2E の 1K", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "間取り図: E2E の 1K" })).toBeVisible();
  for (const name of ["洋室", "キッチン", "ユニットバス"]) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  // 設定を開き直すと、保存した間取りが入っている
  await page.getByRole("link", { name: "間取り設定" }).click();
  await expect(page.getByLabel("間取りの JSON")).toHaveValue(/"name": "E2E の 1K"/);
});
