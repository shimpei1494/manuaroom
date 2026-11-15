import { expect, test } from "vite-plus/test";

import { makeProduct } from "../../application/testing/fake-deps";
import { describePlace, toPlacedProducts } from "./placed-products";
import { SAMPLE_HOME_LAYOUT } from "./sample-layout";

const AT = new Date("2026-11-15T00:00:00Z");

test("置き場所に製品と部屋名を付け、製品のない置き場所は捨てる", () => {
  const fridge = makeProduct({ name: "冷蔵庫" });
  const placed = toPlacedProducts(
    SAMPLE_HOME_LAYOUT,
    [
      { productId: fridge.id, userId: fridge.userId, x: 100, y: 500, updatedAt: AT },
      { productId: "deleted", userId: fridge.userId, x: 100, y: 500, updatedAt: AT },
    ],
    [fridge],
  );
  expect(placed).toEqual([
    { productId: fridge.id, x: 100, y: 500, product: fridge, roomName: "DK" },
  ]);
});

test("場所の説明は設置場所を優先し、部屋名を含まなければ部屋名を前に付ける", () => {
  const product = (location: string | null) => makeProduct({ location });
  expect(describePlace({ roomName: "DK", product: product("キッチンの奥") })).toBe(
    "DK ・ キッチンの奥",
  );
  expect(describePlace({ roomName: "DK", product: product("DK の窓の上") })).toBe("DK の窓の上");
  expect(describePlace({ roomName: "DK", product: product(null) })).toBe("DK");
  expect(describePlace({ roomName: null, product: product(null) })).toBeNull();
});
