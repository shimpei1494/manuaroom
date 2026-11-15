import { describe, expect, test } from "vite-plus/test";

import type { HomeLayout } from "../../domain/home-map/home-layout";
import { clientToLayout, doorShape, floorPlanViewBox, toPercent } from "./floor-plan-geometry";

// 左に DK、右に寝室。間の壁 (x = 300) の y = 100〜180 にドア
const LAYOUT: HomeLayout = {
  version: 1,
  rooms: [
    { id: "dk", name: "DK", type: "dining", rect: [0, 0, 300, 300] },
    { id: "bed", name: "寝室", type: "bedroom", rect: [300, 0, 300, 300] },
  ],
};

describe("doorShape", () => {
  test("開く先の部屋の側へ扉が開く", () => {
    const intoBed = doorShape(LAYOUT, { wall: [300, 100, 300, 180], opensInto: "bed" });
    const intoDk = doorShape(LAYOUT, { wall: [300, 100, 300, 180], opensInto: "dk" });
    expect(intoBed.kind === "hinged" && intoBed.leaf).toEqual([
      { x: 300, y: 100 },
      { x: 380, y: 100 },
    ]);
    expect(intoDk.kind === "hinged" && intoDk.leaf).toEqual([
      { x: 300, y: 100 },
      { x: 220, y: 100 },
    ]);
  });

  test("蝶番を end にすると終点を軸に開く", () => {
    const shape = doorShape(LAYOUT, { wall: [300, 100, 300, 180], hinge: "end", opensInto: "bed" });
    expect(shape.kind === "hinged" && shape.leaf).toEqual([
      { x: 300, y: 180 },
      { x: 380, y: 180 },
    ]);
  });

  test("outside は部屋のない側へ開く", () => {
    // 上の外壁 (y = 0) のドア
    const shape = doorShape(LAYOUT, { wall: [50, 0, 130, 0], opensInto: "outside" });
    expect(shape.kind === "hinged" && shape.leaf[1].y).toBe(-80);
  });

  test("弧は開いた先端から閉じた先端まで描く", () => {
    const shape = doorShape(LAYOUT, { wall: [300, 100, 300, 180], opensInto: "bed" });
    expect(shape.kind === "hinged" && shape.arcPath).toBe("M 380 100 A 80 80 0 0 1 300 180");
  });

  test("引き戸は 2 枚の戸を左右にずらして描く", () => {
    const shape = doorShape(LAYOUT, { wall: [0, 300, 80, 300], kind: "sliding" });
    expect(shape.kind).toBe("sliding");
    if (shape.kind !== "sliding") return;
    expect(shape.panels[0][0].y).not.toBe(shape.panels[1][0].y);
  });
});

describe("座標の変換", () => {
  test("図の範囲は間取りのまわりに余白を足す", () => {
    expect(floorPlanViewBox(LAYOUT)).toEqual({ x: -30, y: -30, width: 660, height: 360 });
  });

  test("家の外へ開くドアの扉も範囲に含める", () => {
    const view = floorPlanViewBox({
      ...LAYOUT,
      doors: [{ wall: [50, 300, 130, 300], opensInto: "outside" }],
    });
    expect(view.y + view.height).toBe(300 + 80 + 30);
  });

  test("割合と画面の座標を行き来できる", () => {
    const view = floorPlanViewBox(LAYOUT);
    expect(toPercent(view, { x: 300, y: 150 })).toEqual({ left: "50.000%", top: "50.000%" });
    const point = clientToLayout(
      view,
      { left: 10, top: 20, width: 330, height: 180 },
      { x: 10 + 165, y: 20 + 90 },
    );
    expect(point).toEqual({ x: 300, y: 150 });
  });
});
