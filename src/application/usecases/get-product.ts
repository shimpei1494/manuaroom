import type { Product } from "../../domain/product/product";
import type { Deps } from "../../infrastructure/deps";

export async function getProduct(deps: Deps, productId: string): Promise<Product> {
  const userId = await deps.auth.requireUserId();
  const product = await deps.productRepository.findById({ userId, productId });
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }
  return product;
}
