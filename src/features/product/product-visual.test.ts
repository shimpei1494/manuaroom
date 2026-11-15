import {
  IconAirConditioning,
  IconBath,
  IconBox,
  IconCoffee,
  IconDroplet,
  IconShirt,
  IconSoup,
  IconSparkles,
  IconTemperatureSun,
  IconThermometer,
  IconToolsKitchen2,
  IconWind,
} from "@tabler/icons-react";
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

  // 本番に登録されている製品が、それぞれ合うアイコンになること
  test.each([
    { name: "加湿空気清浄機", category: "空気清浄機", icon: IconWind },
    { name: "ヘアードライヤー イオニティ", category: "ヘアドライヤー", icon: IconSparkles },
    {
      name: "浴室換気暖房乾燥機（24時間換気機能付き）",
      category: "浴室暖房乾燥機",
      icon: IconBath,
    },
    { name: "蛇口一体型浄水器 みず工房", category: "浄水器", icon: IconDroplet },
    { name: "電子体温計", category: "体温計", icon: IconThermometer },
    { name: "フェスティノ 充電式 EMSヘッドスパ", category: "ヘッドスパ", icon: IconSparkles },
    { name: "毛玉クリーナー", category: "毛玉クリーナー", icon: IconShirt },
    { name: "電気毛布", category: "電気ひざ掛け", icon: IconTemperatureSun },
    { name: "電気ケトル", category: "電気ケトル", icon: IconCoffee },
    { name: "グリルなべ 3枚プレート", category: "グリルなべ", icon: IconSoup },
  ])("$name → 合うアイコン", ({ name, category, icon }) => {
    expect(productVisual({ name, category }).icon).toBe(icon);
  });

  test("ヘアアイロンは衣類のアイロンより美容を優先する", () => {
    expect(productVisual({ name: "ストレートヘアアイロン", category: null }).icon).toBe(
      IconSparkles,
    );
    expect(productVisual({ name: "スチームアイロン", category: null }).icon).toBe(IconShirt);
  });
});
