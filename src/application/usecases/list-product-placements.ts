import type { ProductPlacement } from "../../domain/home-map/product-placement";
import type { Deps } from "../deps";

export async function listProductPlacements(
  deps: Pick<Deps, "auth" | "productPlacementRepository">,
): Promise<ProductPlacement[]> {
  const userId = await deps.auth.requireUserId();
  return deps.productPlacementRepository.listByUser(userId);
}

export async function getProductPlacement(
  deps: Pick<Deps, "auth" | "productPlacementRepository">,
  input: { productId: string },
): Promise<ProductPlacement | null> {
  const userId = await deps.auth.requireUserId();
  return deps.productPlacementRepository.findByProduct({ userId, productId: input.productId });
}
