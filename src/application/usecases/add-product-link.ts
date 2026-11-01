import { NotFoundError } from "../../domain/errors";
import { normalizeProductLinkFields, type ProductLink } from "../../domain/product/product-link";
import type { Deps } from "../deps";

export type ProductLinkInput = {
  url: string;
  title?: string | null;
  description?: string | null;
};

export async function addProductLink(
  deps: Pick<Deps, "auth" | "clock" | "productRepository" | "productLinkRepository">,
  input: ProductLinkInput & { productId: string },
): Promise<ProductLink> {
  const userId = await deps.auth.requireUserId();
  const product = await deps.productRepository.findById({ userId, productId: input.productId });
  if (!product) {
    throw new NotFoundError("Product", input.productId);
  }
  const now = deps.clock.now();
  const link: ProductLink = {
    id: crypto.randomUUID(),
    userId,
    productId: product.id,
    ...normalizeProductLinkFields(input),
    createdAt: now,
    updatedAt: now,
  };
  await deps.productLinkRepository.create(link);
  return link;
}
