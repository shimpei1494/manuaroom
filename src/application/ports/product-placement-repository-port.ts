import type { ProductPlacement } from "../../domain/home-map/product-placement";

export type ProductPlacementRepositoryPort = {
  listByUser(userId: string): Promise<ProductPlacement[]>;
  findByProduct(input: { userId: string; productId: string }): Promise<ProductPlacement | null>;
  /** なければ作り、あれば位置を置き換える */
  save(placement: ProductPlacement): Promise<void>;
  delete(input: { userId: string; productId: string }): Promise<void>;
};
