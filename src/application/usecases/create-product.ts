import type { Product } from "../../domain/product/product";
import type { Deps } from "../../infrastructure/deps";

export type CreateProductInput = {
  name: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  category?: string | null;
  location?: string | null;
  purchaseDate?: Date | null;
  warrantyUntil?: Date | null;
  memo?: string | null;
};

export async function createProduct(deps: Deps, input: CreateProductInput): Promise<Product> {
  const userId = await deps.auth.requireUserId();
  const now = new Date();
  const product: Product = {
    id: crypto.randomUUID(),
    userId,
    name: input.name,
    manufacturer: input.manufacturer ?? null,
    modelNumber: input.modelNumber ?? null,
    category: input.category ?? null,
    location: input.location ?? null,
    purchaseDate: input.purchaseDate ?? null,
    warrantyUntil: input.warrantyUntil ?? null,
    memo: input.memo ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await deps.productRepository.create(product);
  return product;
}
