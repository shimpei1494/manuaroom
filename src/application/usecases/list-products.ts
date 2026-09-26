import type { Product } from "../../domain/product/product";
import type { Deps } from "../../infrastructure/deps";

export async function listProducts(deps: Deps): Promise<Product[]> {
  const userId = await deps.auth.requireUserId();
  return deps.productRepository.listByUser(userId);
}
