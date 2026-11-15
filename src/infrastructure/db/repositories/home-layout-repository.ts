import { eq } from "drizzle-orm";

import type { HomeLayoutRepositoryPort } from "../../../application/ports/home-layout-repository-port";
import { HomeLayoutSchema } from "../../../domain/home-map/home-layout";
import type { Db } from "../client";
import { homeLayouts } from "../schema";

export function createHomeLayoutRepository(db: Db): HomeLayoutRepositoryPort {
  return {
    async find(userId) {
      const rows = await db
        .select()
        .from(homeLayouts)
        .where(eq(homeLayouts.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        userId: row.userId,
        layout: HomeLayoutSchema.parse(JSON.parse(row.layoutJson)),
        updatedAt: row.updatedAt,
      };
    },
    async save({ userId, layout, updatedAt }) {
      const layoutJson = JSON.stringify(layout);
      await db
        .insert(homeLayouts)
        .values({ userId, layoutJson, updatedAt })
        .onConflictDoUpdate({ target: homeLayouts.userId, set: { layoutJson, updatedAt } });
    },
  };
}
