import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../errors";
import { normalizeProductLinkFields, productLinkHostname } from "./product-link";

describe("normalizeProductLinkFields", () => {
  test("前後の空白を除いて、そのまま保存する形にする", () => {
    expect(
      normalizeProductLinkFields({
        url: "  https://example.com/support  ",
        title: " 公式サポート ",
        description: " エラーコードの一覧 ",
      }),
    ).toEqual({
      url: "https://example.com/support",
      title: "公式サポート",
      description: "エラーコードの一覧",
    });
  });

  test("タイトルが空ならホスト名 (www. なし) を入れ、説明が空なら null", () => {
    expect(
      normalizeProductLinkFields({
        url: "https://www.example.co.jp/faq",
        title: " ",
        description: "",
      }),
    ).toEqual({ url: "https://www.example.co.jp/faq", title: "example.co.jp", description: null });
  });

  test("http も受け付ける", () => {
    expect(normalizeProductLinkFields({ url: "http://example.com" }).url).toBe(
      "http://example.com",
    );
  });

  test.each(["javascript:alert(1)", "ftp://example.com/file", "example.com", "", "https://"])(
    "http / https の URL でなければ弾く: %s",
    (url) => {
      expect(() => normalizeProductLinkFields({ url })).toThrow(BusinessRuleError);
    },
  );

  test("長すぎる入力は弾く", () => {
    const url = "https://example.com/";
    expect(() => normalizeProductLinkFields({ url: url + "a".repeat(2048) })).toThrow(
      BusinessRuleError,
    );
    expect(() => normalizeProductLinkFields({ url, title: "a".repeat(101) })).toThrow(
      BusinessRuleError,
    );
    expect(() => normalizeProductLinkFields({ url, description: "a".repeat(501) })).toThrow(
      BusinessRuleError,
    );
  });
});

describe("productLinkHostname", () => {
  test("ホスト名を返し、読めない URL は null", () => {
    expect(productLinkHostname("https://www.youtube.com/watch?v=x")).toBe("youtube.com");
    expect(productLinkHostname("not a url")).toBeNull();
  });
});
