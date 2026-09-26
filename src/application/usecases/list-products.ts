import type { Product } from "../../domain/product/product";
import type { Deps } from "../deps";

export async function listProducts(
  deps: Pick<Deps, "auth" | "productRepository">,
): Promise<Product[]> {
  const userId = await deps.auth.requireUserId();
  return deps.productRepository.listByUser(userId);
}
