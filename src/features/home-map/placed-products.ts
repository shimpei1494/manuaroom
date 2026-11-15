import { findRoomAt, type HomeLayout } from "../../domain/home-map/home-layout";
import type { ProductPlacement } from "../../domain/home-map/product-placement";
import type { Product } from "../../domain/product/product";

/** 間取りに置いた製品 (点 1 つ分の表示に要るもの)。 */
export type PlacedProduct = {
  productId: string;
  x: number;
  y: number;
  product: Product;
  /** 点がある部屋の名前。どの部屋の中でもなければ null */
  roomName: string | null;
};

/** 置き場所と製品を突き合わせる。製品が見つからない置き場所は捨てる。 */
export function toPlacedProducts(
  layout: HomeLayout,
  placements: ProductPlacement[],
  products: Product[],
): PlacedProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return placements.flatMap((placement) => {
    const product = byId.get(placement.productId);
    if (!product) return [];
    return [
      {
        productId: placement.productId,
        x: placement.x,
        y: placement.y,
        product,
        roomName: findRoomAt(layout, placement)?.name ?? null,
      },
    ];
  });
}

/** 吹き出しに出す場所の説明。製品に書いた設置場所を優先し、部屋名と違えば並べる。 */
export function describePlace(item: Pick<PlacedProduct, "roomName" | "product">): string | null {
  const location = item.product.location;
  if (location && item.roomName && !location.includes(item.roomName)) {
    return `${item.roomName} ・ ${location}`;
  }
  return location ?? item.roomName;
}
