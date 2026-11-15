import { BusinessRuleError } from "../errors";
import { layoutBounds, type HomeLayout, type Point } from "./home-layout";

/**
 * 製品を間取りのどこに置いたか (1 製品 1 か所)。座標は間取りと同じ cm。
 * どの部屋にあるかは保存せず、表示するときに間取りから計算する (findRoomAt)。
 */
export type ProductPlacement = {
  productId: string;
  userId: string;
  x: number;
  y: number;
  updatedAt: Date;
};

/** 置く位置を確かめ、cm 単位に丸める。間取りの範囲の外には置けない。 */
export function normalizePlacementPoint(layout: HomeLayout, point: Point): Point {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new BusinessRuleError("置く位置が正しくありません");
  }
  const b = layoutBounds(layout);
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  if (x < b.minX || x > b.maxX || y < b.minY || y > b.maxY) {
    throw new BusinessRuleError("間取りの外には置けません");
  }
  return { x, y };
}

/** 間取りの範囲に収める (ドラッグで外へはみ出したとき用)。 */
export function clampToLayout(layout: HomeLayout, point: Point): Point {
  const b = layoutBounds(layout);
  return {
    x: Math.min(Math.max(point.x, b.minX), b.maxX),
    y: Math.min(Math.max(point.y, b.minY), b.maxY),
  };
}

/**
 * 近くに置いた製品をまとめる。キッチンのように点が重なる場所でも、押した点の吹き出しに並べて選べるようにする。
 * 近い順に並べ、基準の点を先頭にする。
 */
export function placementsNear<T extends { productId: string; x: number; y: number }>(
  placements: T[],
  center: T,
  radius: number,
): T[] {
  const distance = (p: T) => Math.hypot(p.x - center.x, p.y - center.y);
  return placements
    .filter((p) => p.productId === center.productId || distance(p) <= radius)
    .sort((a, b) =>
      a.productId === center.productId
        ? -1
        : b.productId === center.productId
          ? 1
          : distance(a) - distance(b),
    );
}
