import {
  findRoomAt,
  isPointInPolygon,
  layoutBounds,
  roomPolygon,
  type Bounds,
  type HomeLayout,
  type HomeLayoutDoor,
  type Point,
} from "../../domain/home-map/home-layout";

/** 図のまわりに空ける余白 (cm) */
const PADDING = 30;

export type ViewBox = { x: number; y: number; width: number; height: number };

/** 図に描く範囲。家の外へ開くドアの扉も切れないように含める。 */
export function floorPlanViewBox(layout: HomeLayout): ViewBox {
  const b: Bounds = { ...layoutBounds(layout) };
  for (const door of layout.doors ?? []) {
    const shape = doorShape(layout, door);
    if (shape.kind !== "hinged") continue;
    const { x, y } = shape.leaf[1];
    b.minX = Math.min(b.minX, x);
    b.minY = Math.min(b.minY, y);
    b.maxX = Math.max(b.maxX, x);
    b.maxY = Math.max(b.maxY, y);
  }
  return {
    x: b.minX - PADDING,
    y: b.minY - PADDING,
    width: b.maxX - b.minX + PADDING * 2,
    height: b.maxY - b.minY + PADDING * 2,
  };
}

/** 間取りの座標 (cm) を、図の左上からの割合 (%) にする。HTML の点や文字を重ねる位置。 */
export function toPercent(view: ViewBox, point: Point): { left: string; top: string } {
  return {
    left: `${(((point.x - view.x) / view.width) * 100).toFixed(3)}%`,
    top: `${(((point.y - view.y) / view.height) * 100).toFixed(3)}%`,
  };
}

/** 図の上で押した位置 (画面の px) を間取りの座標 (cm) にする。 */
export function clientToLayout(
  view: ViewBox,
  rect: { left: number; top: number; width: number; height: number },
  client: { x: number; y: number },
): Point {
  return {
    x: view.x + ((client.x - rect.left) / rect.width) * view.width,
    y: view.y + ((client.y - rect.top) / rect.height) * view.height,
  };
}

export function polygonPoints(points: Point[]): string {
  return points.map((p) => `${p.x.toString()},${p.y.toString()}`).join(" ");
}

export type DoorShape =
  | {
      kind: "hinged";
      /** 壁を消す開口部 */
      opening: [Point, Point];
      /** 開いた扉の板 (蝶番 → 先端) */
      leaf: [Point, Point];
      /** 扉の先端が通る弧の SVG パス */
      arcPath: string;
    }
  | {
      kind: "sliding";
      opening: [Point, Point];
      /** 2 枚の戸 (少しずらして重ねる) */
      panels: [[Point, Point], [Point, Point]];
    };

/**
 * ドアの描き方を決める。開き戸は、蝶番から開く先の部屋の側へ 90 度開いた板と、先端が通る弧で描く。
 * 開く先が書かれていなければ、壁の線の進む向きに対して左側へ開く。
 */
export function doorShape(layout: HomeLayout, door: HomeLayoutDoor): DoorShape {
  const [x1, y1, x2, y2] = door.wall;
  const start = { x: x1, y: y1 };
  const end = { x: x2, y: y2 };
  const width = Math.hypot(x2 - x1, y2 - y1);
  // 壁の線に垂直な単位ベクトル (y が下向きの座標で、進む向きの左側)
  const normal = { x: (y2 - y1) / width, y: -(x2 - x1) / width };

  if (door.kind === "sliding") {
    const offset = Math.min(4, width / 10);
    const mid = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    const overlap = { x: ((x2 - x1) / width) * offset, y: ((y2 - y1) / width) * offset };
    const shift = (p: Point, sign: number) => ({
      x: p.x + normal.x * offset * sign,
      y: p.y + normal.y * offset * sign,
    });
    return {
      kind: "sliding",
      opening: [start, end],
      panels: [
        [shift(start, 1), shift({ x: mid.x + overlap.x, y: mid.y + overlap.y }, 1)],
        [shift({ x: mid.x - overlap.x, y: mid.y - overlap.y }, -1), shift(end, -1)],
      ],
    };
  }

  const side = openingSide(layout, door, start, end, normal, width);
  const [hinge, tip] = door.hinge === "end" ? [end, start] : [start, end];
  const open = {
    x: hinge.x + normal.x * side * width,
    y: hinge.y + normal.y * side * width,
  };
  // 開いた先端 → 閉じた先端へ、蝶番を中心に 90 度回る弧。
  // y が下向きの座標では、外積が正なら時計回り (SVG の sweep-flag = 1)
  const cross = (open.x - hinge.x) * (tip.y - hinge.y) - (open.y - hinge.y) * (tip.x - hinge.x);
  const sweep = cross > 0 ? 1 : 0;
  return {
    kind: "hinged",
    opening: [start, end],
    leaf: [hinge, open],
    arcPath: `M ${fmt(open.x)} ${fmt(open.y)} A ${fmt(width)} ${fmt(width)} 0 0 ${sweep.toString()} ${fmt(tip.x)} ${fmt(tip.y)}`,
  };
}

/** 壁の線の左側 (+1) と右側 (-1) のどちらへ開くか。 */
function openingSide(
  layout: HomeLayout,
  door: HomeLayoutDoor,
  start: Point,
  end: Point,
  normal: Point,
  width: number,
): 1 | -1 {
  if (door.opensInto === undefined) return 1;
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const probe = Math.min(width / 2, 20);
  const left = { x: mid.x + normal.x * probe, y: mid.y + normal.y * probe };
  if (door.opensInto === "outside") {
    return findRoomAt(layout, left) === null ? 1 : -1;
  }
  const room = layout.rooms.find((r) => r.id === door.opensInto);
  if (!room) return 1;
  return isPointInPolygon(left, roomPolygon(room)) ? 1 : -1;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}
