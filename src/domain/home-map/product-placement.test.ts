import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../errors";
import type { HomeLayout } from "./home-layout";
import { clampToLayout, normalizePlacementPoint, placementsNear } from "./product-placement";

const LAYOUT: HomeLayout = {
  version: 1,
  rooms: [{ id: "dk", name: "DK", type: "dining", rect: [100, 100, 300, 200] }],
};

describe("normalizePlacementPoint", () => {
  test("間取りの中なら cm に丸めて受け付ける", () => {
    expect(normalizePlacementPoint(LAYOUT, { x: 150.4, y: 299.6 })).toEqual({ x: 150, y: 300 });
  });

  test("間取りの外や数でない位置は弾く", () => {
    expect(() => normalizePlacementPoint(LAYOUT, { x: 50, y: 150 })).toThrow(BusinessRuleError);
    expect(() => normalizePlacementPoint(LAYOUT, { x: 150, y: 401 })).toThrow(
      "間取りの外には置けません",
    );
    expect(() => normalizePlacementPoint(LAYOUT, { x: Number.NaN, y: 150 })).toThrow(
      BusinessRuleError,
    );
  });
});

test("clampToLayout は間取りの範囲に収める", () => {
  expect(clampToLayout(LAYOUT, { x: 0, y: 500 })).toEqual({ x: 100, y: 300 });
  expect(clampToLayout(LAYOUT, { x: 200, y: 200 })).toEqual({ x: 200, y: 200 });
});

test("placementsNear は基準の点を先頭に、近い順で半径の内側だけを返す", () => {
  const center = { productId: "fridge", x: 100, y: 100 };
  const far = { productId: "aircon", x: 300, y: 100 };
  const near = { productId: "microwave", x: 120, y: 100 };
  const nearest = { productId: "kettle", x: 105, y: 100 };
  expect(placementsNear([far, near, center, nearest], center, 30).map((p) => p.productId)).toEqual([
    "fridge",
    "kettle",
    "microwave",
  ]);
});
