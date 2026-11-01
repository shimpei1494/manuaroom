import type { ProductLink } from "../../domain/product/product-link";
import type { Deps } from "../deps";

export async function listProductLinks(
  deps: Pick<Deps, "auth" | "productLinkRepository">,
  input: { productId: string },
): Promise<ProductLink[]> {
  const userId = await deps.auth.requireUserId();
  return deps.productLinkRepository.listByProduct({ userId, productId: input.productId });
}
