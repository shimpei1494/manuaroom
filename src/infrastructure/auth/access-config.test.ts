import { describe, expect, test } from "vite-plus/test";

import { readAccessConfig } from "./access-config";

describe("readAccessConfig", () => {
  test("チーム名・AUD・共有ユーザー ID がそろっていれば返す", () => {
    expect(
      readAccessConfig({
        ACCESS_TEAM_DOMAIN: "family.cloudflareaccess.com",
        ACCESS_AUD: "aud",
        APP_USER_ID: "family",
      }),
    ).toEqual({ teamDomain: "family.cloudflareaccess.com", aud: "aud", appUserId: "family" });
  });

  test("https:// や末尾の / 付きで書かれたチーム名はホスト名にそろえる", () => {
    expect(
      readAccessConfig({
        ACCESS_TEAM_DOMAIN: "https://family.cloudflareaccess.com/",
        ACCESS_AUD: "aud",
        APP_USER_ID: "family",
      }).teamDomain,
    ).toBe("family.cloudflareaccess.com");
  });

  test("未設定の項目があれば、どれが足りないかを示して失敗する（開いたまま動かさない）", () => {
    expect(() =>
      readAccessConfig({ ACCESS_TEAM_DOMAIN: "", ACCESS_AUD: "", APP_USER_ID: "family" }),
    ).toThrow(/ACCESS_TEAM_DOMAIN.*ACCESS_AUD/);
  });
});
