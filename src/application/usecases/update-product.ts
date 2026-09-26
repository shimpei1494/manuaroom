import { NotFoundError } from "../../domain/errors";
import type { Product } from "../../domain/product/product";
import type { Deps } from "../deps";

export type UpdateProductInput = {
  productId: string;
  name: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  category?: string | null;
  location?: string | null;
  purchaseDate?: Date | null;
  warrantyUntil?: Date | null;
  memo?: string | null;
};

export async function updateProduct(
  deps: Pick<Deps, "auth" | "clock" | "productRepository">,
  input: UpdateProductInput,
): Promise<Product> {
  const userId = await deps.auth.requireUserId();
  const existing = await deps.productRepository.findById({
    userId,
    productId: input.productId,
  });
  if (!existing) {
    throw new NotFoundError("Product", input.productId);
  }
  const updated: Product = {
    ...existing,
    name: input.name,
    manufacturer: input.manufacturer ?? null,
    modelNumber: input.modelNumber ?? null,
    category: input.category ?? null,
    location: input.location ?? null,
    purchaseDate: input.purchaseDate ?? null,
    warrantyUntil: input.warrantyUntil ?? null,
    memo: input.memo ?? null,
    updatedAt: deps.clock.now(),
  };
  await deps.productRepository.update(updated);
  return updated;
}
