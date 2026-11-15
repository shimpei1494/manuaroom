import { describe, expect, test } from "vite-plus/test";

import { avatarSeed, userDisplayName } from "./user-display";

describe("avatarSeed", () => {
  test("メールアドレスの大文字小文字や前後の空白が違っても同じ模様になる", () => {
    expect(avatarSeed({ kind: "access", email: " Taro@Example.com " })).toBe(
      avatarSeed({ kind: "access", email: "taro@example.com" }),
    );
  });

  test("家族それぞれ（メールが違う）なら別の模様になる", () => {
    expect(avatarSeed({ kind: "access", email: "taro@example.com" })).not.toBe(
      avatarSeed({ kind: "access", email: "hanako@example.com" }),
    );
  });

  test("ローカル開発でも固定の模様を出す", () => {
    expect(avatarSeed({ kind: "local" })).toBe(avatarSeed({ kind: "local" }));
  });
});

describe("userDisplayName", () => {
  test("Access から名前が取れたらそれを出す", () => {
    expect(userDisplayName({ kind: "access", email: "taro@example.com" }, "山田 太郎")).toBe(
      "山田 太郎",
    );
  });

  test("名前がなければメールアドレスの @ より前を出す", () => {
    expect(userDisplayName({ kind: "access", email: "taro@example.com" }, "  ")).toBe("taro");
  });

  test("メールアドレスも取れなければ一般的な呼び方にする", () => {
    expect(userDisplayName({ kind: "access", email: null })).toBe("ログイン中のユーザー");
  });

  test("ローカル開発ではローカル用の名前にする", () => {
    expect(userDisplayName({ kind: "local" }, "無視される")).toBe("ローカル開発ユーザー");
  });
});
