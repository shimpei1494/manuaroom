import { z } from "zod";

/**
 * 家の間取り (2D の平面図)。単位は cm、左上が原点で、x は右、y は下に増える。
 * 画像から AI に書いてもらった JSON を貼り付けて登録する (docs/home-map.md)。
 * 家族で 1 枚を共有する (他のデータと同じく共有のユーザー ID ごとに 1 件)。
 */
export type HomeLayout = z.infer<typeof HomeLayoutSchema>;
export type HomeLayoutRoom = HomeLayout["rooms"][number];
export type HomeLayoutDoor = NonNullable<HomeLayout["doors"]>[number];
export type RoomType = (typeof ROOM_TYPE_VALUES)[number];
export type Point = { x: number; y: number };

/** 保存済みの間取り。 */
export type SavedHomeLayout = {
  userId: string;
  layout: HomeLayout;
  updatedAt: Date;
};

export const ROOM_TYPE_VALUES = [
  "living",
  "dining",
  "kitchen",
  "bedroom",
  "japanese",
  "toilet",
  "bath",
  "washroom",
  "entrance",
  "hallway",
  "storage",
  "balcony",
  "other",
] as const;

/** 部屋の種類の日本語名 (AI 向けの説明や凡例に使う)。 */
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living: "リビング",
  dining: "ダイニング・DK",
  kitchen: "キッチン",
  bedroom: "洋室・寝室",
  japanese: "和室",
  toilet: "トイレ",
  bath: "浴室",
  washroom: "洗面所・脱衣所",
  entrance: "玄関",
  hallway: "廊下",
  storage: "収納・クローゼット",
  balcony: "バルコニー・ベランダ",
  other: "その他",
};

export const HOME_LAYOUT_LIMITS = {
  /** 貼り付ける JSON の文字数 */
  jsonLength: 50_000,
  /** 座標の上限 (cm)。平屋の 1 戸なら 100m 四方で十分 */
  coordinate: 10_000,
  rooms: 60,
  doors: 100,
  windows: 100,
  polygonPoints: 40,
  name: 40,
} as const;

const coordinate = z
  .number({ error: "数値で書いてください" })
  .min(0, "0 以上にしてください (左上が原点)")
  .max(HOME_LAYOUT_LIMITS.coordinate, `${HOME_LAYOUT_LIMITS.coordinate} cm 以下にしてください`);

const length = z
  .number({ error: "数値で書いてください" })
  .positive("0 より大きくしてください")
  .max(HOME_LAYOUT_LIMITS.coordinate, `${HOME_LAYOUT_LIMITS.coordinate} cm 以下にしてください`);

const pointTuple = z.tuple([coordinate, coordinate], {
  error: "[x, y] の形で書いてください",
});

/** 壁の上の線分 [x1, y1, x2, y2] */
const segment = z
  .tuple([coordinate, coordinate, coordinate, coordinate], {
    error: "[x1, y1, x2, y2] の形で書いてください",
  })
  .refine(([x1, y1, x2, y2]) => x1 !== x2 || y1 !== y2, "始点と終点が同じです");

const RoomSchema = z
  .strictObject({
    id: z
      .string({ error: "文字列で書いてください" })
      .regex(/^[a-z0-9_-]{1,40}$/, "英小文字・数字・_・- の 40 文字以内にしてください"),
    name: z
      .string({ error: "文字列で書いてください" })
      .trim()
      .min(1, "部屋名を書いてください")
      .max(HOME_LAYOUT_LIMITS.name, `${HOME_LAYOUT_LIMITS.name} 文字以内にしてください`),
    type: z.enum(ROOM_TYPE_VALUES, {
      error: `${ROOM_TYPE_VALUES.join(" / ")} のどれかにしてください`,
    }),
    /** 長方形の部屋 [x, y, 幅, 奥行き] */
    rect: z
      .tuple([coordinate, coordinate, length, length], {
        error: "[x, y, 幅, 奥行き] の形で書いてください",
      })
      .optional(),
    /** L 字などの部屋。角の座標を順番に並べる */
    polygon: z
      .array(pointTuple)
      .min(3, "角を 3 つ以上書いてください")
      .max(
        HOME_LAYOUT_LIMITS.polygonPoints,
        `角は ${HOME_LAYOUT_LIMITS.polygonPoints} 個以内にしてください`,
      )
      .optional(),
    /** 部屋名を出す位置。省略すると図形の中心 */
    labelAt: pointTuple.optional(),
  })
  .refine((room) => (room.rect === undefined) !== (room.polygon === undefined), {
    message: "rect か polygon のどちらか一方を書いてください",
  });

const DoorSchema = z.strictObject({
  /** 開口部 (ドアの幅) の線分 */
  wall: segment,
  /** 開き戸 (hinged) か引き戸 (sliding)。省略すると開き戸 */
  kind: z.enum(["hinged", "sliding"], { error: "hinged か sliding にしてください" }).optional(),
  /** 開き戸の蝶番が wall の始点 (start) か終点 (end) か。省略すると start */
  hinge: z.enum(["start", "end"], { error: "start か end にしてください" }).optional(),
  /** 開き戸が開く先の部屋の id。家の外へ開くなら "outside" */
  opensInto: z.string({ error: "部屋の id か outside を書いてください" }).optional(),
});

const WindowSchema = z.strictObject({ wall: segment });

export const HomeLayoutSchema = z
  .strictObject({
    version: z.literal(1, { error: "version は 1 にしてください" }),
    /** 間取りの名前 (例: 2DK のアパート) */
    name: z
      .string()
      .trim()
      .max(HOME_LAYOUT_LIMITS.name, `${HOME_LAYOUT_LIMITS.name} 文字以内にしてください`)
      .optional(),
    rooms: z
      .array(RoomSchema)
      .min(1, "部屋を 1 つ以上書いてください")
      .max(HOME_LAYOUT_LIMITS.rooms, `部屋は ${HOME_LAYOUT_LIMITS.rooms} 個以内にしてください`),
    doors: z
      .array(DoorSchema)
      .max(HOME_LAYOUT_LIMITS.doors, `ドアは ${HOME_LAYOUT_LIMITS.doors} 個以内にしてください`)
      .optional(),
    windows: z
      .array(WindowSchema)
      .max(HOME_LAYOUT_LIMITS.windows, `窓は ${HOME_LAYOUT_LIMITS.windows} 個以内にしてください`)
      .optional(),
  })
  .superRefine((layout, ctx) => {
    const ids = new Set<string>();
    layout.rooms.forEach((room, i) => {
      if (ids.has(room.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["rooms", i, "id"],
          message: `id「${room.id}」が重複しています`,
        });
      }
      ids.add(room.id);
    });
    layout.doors?.forEach((door, i) => {
      if (
        door.opensInto !== undefined &&
        door.opensInto !== "outside" &&
        !ids.has(door.opensInto)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["doors", i, "opensInto"],
          message: `部屋「${door.opensInto}」がありません (rooms の id か outside を書いてください)`,
        });
      }
    });
  });

export type ParseHomeLayoutResult =
  | { ok: true; layout: HomeLayout }
  | { ok: false; errors: string[] };

/** 貼り付けた JSON の文字列を読み、間取りとして正しいか確かめる。エラーは画面にそのまま出せる文にする。 */
export function parseHomeLayoutJson(text: string): ParseHomeLayoutResult {
  if (text.length > HOME_LAYOUT_LIMITS.jsonLength) {
    return {
      ok: false,
      errors: [`JSON は ${HOME_LAYOUT_LIMITS.jsonLength.toLocaleString()} 文字以内にしてください`],
    };
  }
  const trimmed = stripCodeFence(text.trim());
  if (trimmed === "") return { ok: false, errors: ["JSON を貼り付けてください"] };
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      errors: ["JSON として読めませんでした (括弧やカンマ、引用符を確かめてください)"],
    };
  }
  const result = HomeLayoutSchema.safeParse(value);
  if (result.success) return { ok: true, layout: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => {
      const path = formatPath(issue.path);
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    }),
  };
}

// AI が ```json ... ``` で囲んで返すことが多いので、そのまま貼り付けても読めるようにする
function stripCodeFence(text: string): string {
  const match = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/.exec(text);
  return match?.[1]?.trim() ?? text;
}

function formatPath(path: PropertyKey[]): string {
  return path
    .map((key, i) =>
      typeof key === "number" ? `[${key.toString()}]` : `${i === 0 ? "" : "."}${String(key)}`,
    )
    .join("");
}

/** 部屋の形を角の座標の並びにする。 */
export function roomPolygon(room: HomeLayoutRoom): Point[] {
  if (room.rect) {
    const [x, y, w, h] = room.rect;
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
  }
  return (room.polygon ?? []).map(([x, y]) => ({ x, y }));
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

/** 部屋・ドア・窓をすべて含む範囲。 */
export function layoutBounds(layout: HomeLayout): Bounds {
  const points: Point[] = layout.rooms.flatMap(roomPolygon);
  for (const { wall } of [...(layout.doors ?? []), ...(layout.windows ?? [])]) {
    points.push({ x: wall[0], y: wall[1] }, { x: wall[2], y: wall[3] });
  }
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  };
}

/** 点が多角形の内側にあるか (辺の上は内側とみなさないことがある)。 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** 点がある部屋。重なっていれば後に書いた部屋 (上に描かれる方) を返す。どの部屋にもなければ null。 */
export function findRoomAt(layout: HomeLayout, point: Point): HomeLayoutRoom | null {
  for (let i = layout.rooms.length - 1; i >= 0; i -= 1) {
    const room = layout.rooms[i];
    if (room && isPointInPolygon(point, roomPolygon(room))) return room;
  }
  return null;
}

/** 部屋名を出す位置 (labelAt があればそこ、なければ角の平均)。 */
export function roomLabelPosition(room: HomeLayoutRoom): Point {
  if (room.labelAt) return { x: room.labelAt[0], y: room.labelAt[1] };
  if (room.rect) {
    const [x, y, w, h] = room.rect;
    return { x: x + w / 2, y: y + h / 2 };
  }
  const points = roomPolygon(room);
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}
