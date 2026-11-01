import { NotFoundError } from "../../domain/errors";
import { normalizeProductLinkFields, type ProductLink } from "../../domain/product/product-link";
import type { Deps } from "../deps";
import type { ProductLinkInput } from "./add-product-link";

export async function updateProductLink(
  deps: Pick<Deps, "auth" | "clock" | "productLinkRepository">,
  input: ProductLinkInput & { linkId: string },
): Promise<ProductLink> {
  const userId = await deps.auth.requireUserId();
  const existing = await deps.productLinkRepository.findById({ userId, linkId: input.linkId });
  if (!existing) {
    throw new NotFoundError("ProductLink", input.linkId);
  }
  const updated: ProductLink = {
    ...existing,
    ...normalizeProductLinkFields(input),
    updatedAt: deps.clock.now(),
  };
  await deps.productLinkRepository.update(updated);
  return updated;
}
