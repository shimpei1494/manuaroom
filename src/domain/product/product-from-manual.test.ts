import { describe, expect, test } from "vite-plus/test";

import { productFieldsFromManualInfo } from "./product-from-manual";

const empty = { name: null, manufacturer: null, modelNumber: null, category: null };

describe("productFieldsFromManualInfo", () => {
  test("読み取った項目の前後の空白を除き、空文字は null にする", () => {
    expect(
      productFieldsFromManualInfo(
        { name: " ルームエアコン ", manufacturer: "ダイキン", modelNumber: "  ", category: "" },
        "manual.pdf",
      ),
    ).toEqual({
      name: "ルームエアコン",
      manufacturer: "ダイキン",
      modelNumber: null,
      category: null,
    });
  });

  test("製品名が読めなければ メーカー + 型番 を製品名にする", () => {
    expect(
      productFieldsFromManualInfo(
        { ...empty, manufacturer: "パナソニック", modelNumber: "NA-LX129" },
        "manual.pdf",
      ).name,
    ).toBe("パナソニック NA-LX129");
  });

  test("製品名も型番も読めなければファイル名 (拡張子なし) を製品名にする", () => {
    expect(productFieldsFromManualInfo(empty, "洗濯機の説明書.PDF").name).toBe("洗濯機の説明書");
  });

  test("ファイル名も空なら仮の名前にする", () => {
    expect(productFieldsFromManualInfo(empty, ".pdf").name).toBe("名称未設定の製品");
  });
});
