import { and, eq } from "drizzle-orm";

import type { ProductPlacementRepositoryPort } from "../../../application/ports/product-placement-repository-port";
import type { Db } from "../client";
import { productPlacements } from "../schema";

export function createProductPlacementRepository(db: Db): ProductPlacementRepositoryPort {
  return {
    async listByUser(userId) {
      return db.select().from(productPlacements).where(eq(productPlacements.userId, userId));
    },
    async findByProduct({ userId, productId }) {
      const rows = await db
        .select()
        .from(productPlacements)
        .where(
          and(eq(productPlacements.userId, userId), eq(productPlacements.productId, productId)),
        )
        .limit(1);
      return rows[0] ?? null;
    },
    async save(placement) {
      await db
        .insert(productPlacements)
        .values(placement)
        .onConflictDoUpdate({
          target: productPlacements.productId,
          set: { x: placement.x, y: placement.y, updatedAt: placement.updatedAt },
          // 他のユーザーの製品の行は書き換えない
          setWhere: eq(productPlacements.userId, placement.userId),
        });
    },
    async delete({ userId, productId }) {
      await db
        .delete(productPlacements)
        .where(
          and(eq(productPlacements.userId, userId), eq(productPlacements.productId, productId)),
        );
    },
  };
}
