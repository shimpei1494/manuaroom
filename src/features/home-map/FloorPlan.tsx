import { useId, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import {
  roomLabelPosition,
  roomPolygon,
  type HomeLayout,
  type Point,
  type RoomType,
} from "../../domain/home-map/home-layout";
import {
  clientToLayout,
  doorShape,
  floorPlanViewBox,
  polygonPoints,
  toPercent,
  type ViewBox,
} from "./floor-plan-geometry";

// 部屋の種類ごとの床の色 (Mantine の light 色は、ダークモードでは暗めの色に切り替わる)
const ROOM_COLORS: Record<RoomType, string> = {
  living: "apricot",
  dining: "apricot",
  kitchen: "apricot",
  bedroom: "mint",
  japanese: "lime",
  toilet: "cyan",
  bath: "cyan",
  washroom: "cyan",
  entrance: "gray",
  hallway: "gray",
  storage: "yellow",
  balcony: "gray",
  other: "gray",
};

/**
 * 間取りの平面図。部屋・壁・ドア・窓を SVG で描き、部屋名と children (家電の点など) を HTML で重ねる。
 * HTML で重ねるのは、図をどの大きさで表示しても文字や点の大きさを変えず、押しやすくするため。
 */
export function FloorPlan({
  layout,
  children,
  onPlanClick,
}: {
  layout: HomeLayout;
  /** 図の上に重ねるもの。位置は floor-plan-geometry の toPercent で決める */
  children?: (view: ViewBox) => ReactNode;
  /** 図を押したときに、押した位置 (間取りの座標、cm) を受け取る */
  onPlanClick?: (point: Point) => void;
}) {
  const titleId = useId();
  const view = floorPlanViewBox(layout);
  const ratio = view.width / view.height;
  const style: CSSProperties = {
    aspectRatio: `${view.width.toString()} / ${view.height.toString()}`,
    // 縦長の間取りでも画面に収まるよう、高さを画面の 7 割までにする
    width: `min(100%, calc(70dvh * ${ratio.toFixed(4)}))`,
  };
  // 置く位置を選ぶとき。キーボードでは Enter で図の真ん中に置き、あとは点を矢印キーで動かす
  const interaction: HTMLAttributes<HTMLDivElement> = onPlanClick
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": "押した場所に置く",
        onKeyDown: (e) => {
          if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          onPlanClick({ x: view.x + view.width / 2, y: view.y + view.height / 2 });
        },
        onClick: (e) => {
          onPlanClick(
            clientToLayout(view, e.currentTarget.getBoundingClientRect(), {
              x: e.clientX,
              y: e.clientY,
            }),
          );
        },
      }
    : {};
  return (
    <div className="floor-plan" style={style} {...interaction}>
      <svg
        viewBox={`${view.x.toString()} ${view.y.toString()} ${view.width.toString()} ${view.height.toString()}`}
        aria-labelledby={titleId}
      >
        <title id={titleId}>{layout.name ? `間取り図: ${layout.name}` : "間取り図"}</title>
        {layout.rooms.map((room) => (
          <polygon
            key={room.id}
            points={polygonPoints(roomPolygon(room))}
            className="floor-plan-room"
            data-room-type={room.type}
            style={{ fill: `var(--mantine-color-${ROOM_COLORS[room.type]}-light)` }}
          />
        ))}
        {layout.windows?.map(({ wall: [x1, y1, x2, y2] }, i) => (
          // 窓は太い水色の線の中を背景色で抜いて、二重線に見せる
          <g key={`window-${i.toString()}`} className="floor-plan-window">
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="floor-plan-window-frame" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} className="floor-plan-window-glass" />
          </g>
        ))}
        {layout.doors?.map((door, i) => {
          const shape = doorShape(layout, door);
          const [a, b] = shape.opening;
          return (
            <g key={`door-${i.toString()}`} className="floor-plan-door">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="floor-plan-opening" />
              {shape.kind === "hinged" ? (
                <>
                  <path d={shape.arcPath} className="floor-plan-door-arc" />
                  <line
                    x1={shape.leaf[0].x}
                    y1={shape.leaf[0].y}
                    x2={shape.leaf[1].x}
                    y2={shape.leaf[1].y}
                    className="floor-plan-door-leaf"
                  />
                </>
              ) : (
                shape.panels.map(([p, q], j) => (
                  <line
                    key={j}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    className="floor-plan-door-leaf"
                  />
                ))
              )}
            </g>
          );
        })}
      </svg>
      {layout.rooms.map((room) => (
        <span
          key={room.id}
          className="floor-plan-label"
          style={toPercent(view, roomLabelPosition(room))}
        >
          {room.name}
        </span>
      ))}
      {children?.(view)}
    </div>
  );
}
