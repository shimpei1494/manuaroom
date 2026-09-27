import { describe, expect, test } from "vite-plus/test";

import { emptyToNull, errorMessage } from "./form";

describe("emptyToNull", () => {
  test("空白だけなら null", () => {
    expect(emptyToNull("  ")).toBeNull();
  });

  test("前後の空白を除いて返す", () => {
    expect(emptyToNull(" ダイキン ")).toBe("ダイキン");
  });
});

describe("errorMessage", () => {
  test("Error ならメッセージを返す", () => {
    expect(errorMessage(new Error("失敗"))).toBe("失敗");
  });

  test("Error 以外は文字列にする", () => {
    expect(errorMessage("失敗")).toBe("失敗");
  });
});
