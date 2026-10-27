import { IconAirConditioning, IconBox, IconToolsKitchen2, IconWind } from "@tabler/icons-react";
import { describe, expect, test } from "vite-plus/test";

import { productVisual } from "./product-visual";

describe("productVisual", () => {
  test("カテゴリの言葉からアイコンを決める", () => {
    expect(productVisual({ name: "リビング", category: "エアコン" }).icon).toBe(
      IconAirConditioning,
    );
  });

  test("カテゴリがなければ製品名から決める", () => {
    expect(productVisual({ name: "寝室の空気清浄機", category: null }).icon).toBe(IconWind);
  });

  test("カテゴリを製品名より優先する", () => {
    expect(productVisual({ name: "エアコン用の棚", category: "キッチン" }).icon).toBe(
      IconToolsKitchen2,
    );
  });

  test("当てはまらなければ箱のアイコン", () => {
    expect(productVisual({ name: "なにか", category: null })).toEqual({
      icon: IconBox,
      color: "mint",
    });
  });
});
