import { and, eq } from "drizzle-orm";

import type { ProductRepositoryPort } from "../../../application/ports/product-repository-port";
import type { Db } from "../client";
import { products } from "../schema";

export function createProductRepository(db: Db): ProductRepositoryPort {
  return {
    async create(product) {
      await db.insert(products).values(product);
    },
    async findById({ userId, productId }) {
      const rows = await db
        .select()
        .from(products)
        .where(and(eq(products.userId, userId), eq(products.id, productId)))
        .limit(1);
      return rows[0] ?? null;
    },
    async listByUser(userId) {
      const rows = await db
        .select()
        .from(products)
        .where(eq(products.userId, userId))
        .orderBy(products.createdAt);
      return rows;
    },
    async update(product) {
      await db
        .update(products)
        .set({
          name: product.name,
          manufacturer: product.manufacturer,
          modelNumber: product.modelNumber,
          category: product.category,
          location: product.location,
          purchaseDate: product.purchaseDate,
          warrantyUntil: product.warrantyUntil,
          memo: product.memo,
          updatedAt: product.updatedAt,
        })
        .where(and(eq(products.userId, product.userId), eq(products.id, product.id)));
    },
    async delete({ userId, productId }) {
      await db.delete(products).where(and(eq(products.userId, userId), eq(products.id, productId)));
    },
  };
}
