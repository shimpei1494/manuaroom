import type { Product } from "../../domain/product/product";

export type ProductRepositoryPort = {
  create(product: Product): Promise<void>;
  findById(input: { userId: string; productId: string }): Promise<Product | null>;
  listByUser(userId: string): Promise<Product[]>;
  update(product: Product): Promise<void>;
  delete(input: { userId: string; productId: string }): Promise<void>;
};
