import { describe, expect, test } from "vite-plus/test";

import type { Product } from "./product";
import { filterProductsByQuery, normalizeSearchText } from "./product-search";

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: "p",
    userId: "u",
    name: "製品",
    manufacturer: null,
    modelNumber: null,
    category: null,
    location: null,
    purchaseDate: null,
    warrantyUntil: null,
    memo: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const aircon = makeProduct({
  id: "aircon",
  name: "リビングのエアコン",
  manufacturer: "ダイキン",
  modelNumber: "AN-40ZRP",
  category: "エアコン",
  location: "リビング",
});
const washer = makeProduct({
  id: "washer",
  name: "ドラム式洗濯機",
  manufacturer: "Panasonic",
  modelNumber: "NA-LX129",
  category: "洗濯機",
  location: "洗面所",
  memo: "フィルターは毎回掃除",
});
const products = [aircon, washer];

function ids(query: string): string[] {
  return filterProductsByQuery(products, query).map((p) => p.id);
}

describe("normalizeSearchText", () => {
  test("全角英数を半角に、英字を小文字に、カタカナをひらがなにそろえる", () => {
    expect(normalizeSearchText("ＡＮ－４０")).toBe("an-40");
    expect(normalizeSearchText("Panasonic")).toBe("panasonic");
    expect(normalizeSearchText("エアコン")).toBe("えあこん");
    expect(normalizeSearchText("ｴｱｺﾝ")).toBe("えあこん");
  });
});

describe("filterProductsByQuery", () => {
  test("空や空白だけの検索語なら全件をそのままの順で返す", () => {
    expect(ids("")).toEqual(["aircon", "washer"]);
    expect(ids("  　 ")).toEqual(["aircon", "washer"]);
  });

  test("製品名の一部で絞り込める", () => {
    expect(ids("洗濯")).toEqual(["washer"]);
  });

  test("メーカー・型番・カテゴリ・設置場所でも絞り込める", () => {
    expect(ids("ダイキン")).toEqual(["aircon"]);
    expect(ids("LX129")).toEqual(["washer"]);
    expect(ids("エアコン")).toEqual(["aircon"]);
    expect(ids("洗面所")).toEqual(["washer"]);
  });

  test("大文字小文字・全角半角・ひらがなカタカナの違いは無視する", () => {
    expect(ids("panasonic")).toEqual(["washer"]);
    expect(ids("ｎａ－ｌｘ")).toEqual(["washer"]);
    expect(ids("だいきん")).toEqual(["aircon"]);
  });

  test("空白で区切った語はすべてを含む製品だけに絞る", () => {
    expect(ids("リビング ダイキン")).toEqual(["aircon"]);
    expect(ids("リビング　Panasonic")).toEqual([]);
  });

  test("メモは検索の対象にしない", () => {
    expect(ids("フィルター")).toEqual([]);
  });

  test("項目をまたいだ文字列には一致しない", () => {
    // 製品名の末尾「エアコン」とメーカー「ダイキン」をつなげた文字列
    expect(ids("エアコンダイキン")).toEqual([]);
  });
});
