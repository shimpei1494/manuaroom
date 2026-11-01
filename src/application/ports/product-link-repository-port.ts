import type { ProductLink } from "../../domain/product/product-link";

export type ProductLinkRepositoryPort = {
  create(link: ProductLink): Promise<void>;
  findById(input: { userId: string; linkId: string }): Promise<ProductLink | null>;
  /** 登録した順 (古いものが先) */
  listByProduct(input: { userId: string; productId: string }): Promise<ProductLink[]>;
  update(link: ProductLink): Promise<void>;
  delete(input: { userId: string; linkId: string }): Promise<void>;
};
