import { and, eq } from "drizzle-orm";

import type { ManualRepositoryPort } from "../../../application/ports/manual-repository-port";
import type { Db } from "../client";
import { manuals } from "../schema";

export function createManualRepository(db: Db): ManualRepositoryPort {
  return {
    async create(manual) {
      await db.insert(manuals).values(manual);
    },
    async findById({ userId, manualId }) {
      const rows = await db
        .select()
        .from(manuals)
        .where(and(eq(manuals.userId, userId), eq(manuals.id, manualId)))
        .limit(1);
      return rows[0] ?? null;
    },
    async listByProduct({ userId, productId }) {
      const rows = await db
        .select()
        .from(manuals)
        .where(and(eq(manuals.userId, userId), eq(manuals.productId, productId)))
        .orderBy(manuals.createdAt);
      return rows;
    },
    async updateAiStatus({ userId, manualId, aiStatus }) {
      await db
        .update(manuals)
        .set({ aiStatus })
        .where(and(eq(manuals.userId, userId), eq(manuals.id, manualId)));
    },
    async delete({ userId, manualId }) {
      await db.delete(manuals).where(and(eq(manuals.userId, userId), eq(manuals.id, manualId)));
    },
  };
}
