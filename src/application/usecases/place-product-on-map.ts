import { BusinessRuleError, NotFoundError } from "../../domain/errors";
import {
  normalizePlacementPoint,
  type ProductPlacement,
} from "../../domain/home-map/product-placement";
import type { Deps } from "../deps";

/** 製品を間取りの上に置く。置いてあれば位置を動かす。 */
export async function placeProductOnMap(
  deps: Pick<
    Deps,
    "auth" | "clock" | "productRepository" | "homeLayoutRepository" | "productPlacementRepository"
  >,
  input: { productId: string; x: number; y: number },
): Promise<ProductPlacement> {
  const userId = await deps.auth.requireUserId();
  const product = await deps.productRepository.findById({ userId, productId: input.productId });
  if (!product) throw new NotFoundError("Product", input.productId);
  const saved = await deps.homeLayoutRepository.find(userId);
  if (!saved) throw new BusinessRuleError("先に「間取り設定」で間取りを登録してください");
  const point = normalizePlacementPoint(saved.layout, input);
  const placement: ProductPlacement = {
    productId: product.id,
    userId,
    ...point,
    updatedAt: deps.clock.now(),
  };
  await deps.productPlacementRepository.save(placement);
  return placement;
}
