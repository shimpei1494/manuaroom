import { describe, expect, test } from "vite-plus/test";

import {
  HOME_LAYOUT_LIMITS,
  findRoomAt,
  layoutBounds,
  parseHomeLayoutJson,
  roomLabelPosition,
  roomPolygon,
  type HomeLayout,
} from "./home-layout";

const LAYOUT: HomeLayout = {
  version: 1,
  rooms: [
    { id: "dk", name: "DK", type: "dining", rect: [0, 0, 360, 300] },
    {
      id: "bed",
      name: "寝室",
      type: "bedroom",
      polygon: [
        [360, 0],
        [660, 0],
        [660, 400],
        [500, 400],
        [500, 300],
        [360, 300],
      ],
    },
    { id: "toilet", name: "トイレ", type: "toilet", rect: [0, 300, 90, 160] },
  ],
  doors: [{ wall: [360, 120, 360, 200], hinge: "start", opensInto: "bed" }],
  windows: [{ wall: [400, 0, 600, 0] }],
};

function parse(value: Record<string, unknown>) {
  return parseHomeLayoutJson(JSON.stringify(value));
}

describe("parseHomeLayoutJson", () => {
  test("正しい間取りはそのまま読める", () => {
    expect(parse(LAYOUT)).toEqual({ ok: true, layout: LAYOUT });
  });

  test("AI が付けがちな ```json の囲みがあっても読める", () => {
    const text = "```json\n" + JSON.stringify(LAYOUT, null, 2) + "\n```";
    expect(parseHomeLayoutJson(text)).toEqual({ ok: true, layout: LAYOUT });
  });

  test("JSON として読めなければその旨を返す", () => {
    const result = parseHomeLayoutJson("{ version: 1 ");
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toContain("JSON として読めませんでした");
  });

  test("空なら貼り付けを促す", () => {
    expect(parseHomeLayoutJson("  ")).toEqual({ ok: false, errors: ["JSON を貼り付けてください"] });
  });

  test("長すぎる JSON は読まない", () => {
    const result = parseHomeLayoutJson(" ".repeat(HOME_LAYOUT_LIMITS.jsonLength + 1));
    expect(result.ok).toBe(false);
  });

  test("エラーにはどこが悪いかの場所を付ける", () => {
    const result = parse({
      ...LAYOUT,
      rooms: [{ id: "dk", name: "DK", type: "garage", rect: [0, 0, 360, 300] }],
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatch(/^rooms\[0\]\.type: /);
  });

  test("rect と polygon はどちらか一方だけ", () => {
    const both = parse({
      version: 1,
      rooms: [
        {
          id: "a",
          name: "A",
          type: "other",
          rect: [0, 0, 10, 10],
          polygon: [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        },
      ],
    });
    const neither = parse({ version: 1, rooms: [{ id: "a", name: "A", type: "other" }] });
    expect(both.ok).toBe(false);
    expect(neither.ok).toBe(false);
  });

  test("部屋の id が重なっていたら弾く", () => {
    const result = parse({
      version: 1,
      rooms: [
        { id: "a", name: "A", type: "other", rect: [0, 0, 10, 10] },
        { id: "a", name: "B", type: "other", rect: [10, 0, 10, 10] },
      ],
    });
    expect(!result.ok && result.errors).toEqual(["rooms[1].id: id「a」が重複しています"]);
  });

  test("ドアの開く先は部屋の id か outside", () => {
    const outside = parse({ ...LAYOUT, doors: [{ wall: [0, 0, 80, 0], opensInto: "outside" }] });
    const missing = parse({ ...LAYOUT, doors: [{ wall: [0, 0, 80, 0], opensInto: "living" }] });
    expect(outside.ok).toBe(true);
    expect(!missing.ok && missing.errors[0]).toContain("doors[0].opensInto");
  });

  test("負の座標や知らない項目は弾く", () => {
    expect(
      parse({ version: 1, rooms: [{ id: "a", name: "A", type: "other", rect: [-1, 0, 10, 10] }] })
        .ok,
    ).toBe(false);
    expect(parse({ ...LAYOUT, furniture: [] }).ok).toBe(false);
  });

  test("version は 1 だけ", () => {
    expect(parse({ ...LAYOUT, version: 2 }).ok).toBe(false);
  });
});

describe("間取りの計算", () => {
  test("長方形の部屋は 4 つの角になる", () => {
    expect(roomPolygon(LAYOUT.rooms[2]!)).toEqual([
      { x: 0, y: 300 },
      { x: 90, y: 300 },
      { x: 90, y: 460 },
      { x: 0, y: 460 },
    ]);
  });

  test("範囲は部屋・ドア・窓すべてを含む", () => {
    expect(layoutBounds(LAYOUT)).toEqual({ minX: 0, minY: 0, maxX: 660, maxY: 460 });
  });

  test("点がある部屋を返し、どこにもなければ null", () => {
    expect(findRoomAt(LAYOUT, { x: 100, y: 100 })?.id).toBe("dk");
    // L 字の出っ張り部分
    expect(findRoomAt(LAYOUT, { x: 600, y: 350 })?.id).toBe("bed");
    // L 字の欠けている部分
    expect(findRoomAt(LAYOUT, { x: 400, y: 350 })).toBeNull();
  });

  test("部屋名は labelAt があればそこ、なければ中心に出す", () => {
    expect(roomLabelPosition(LAYOUT.rooms[0]!)).toEqual({ x: 180, y: 150 });
    expect(roomLabelPosition({ ...LAYOUT.rooms[1]!, labelAt: [450, 150] })).toEqual({
      x: 450,
      y: 150,
    });
  });
});
