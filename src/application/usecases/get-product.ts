import { NotFoundError } from "../../domain/errors";
import type { Product } from "../../domain/product/product";
import type { Deps } from "../deps";

export async function getProduct(
  deps: Pick<Deps, "auth" | "productRepository">,
  productId: string,
): Promise<Product> {
  const userId = await deps.auth.requireUserId();
  const product = await deps.productRepository.findById({ userId, productId });
  if (!product) {
    throw new NotFoundError("Product", productId);
  }
  return product;
}
