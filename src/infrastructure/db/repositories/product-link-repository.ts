import { and, asc, eq } from "drizzle-orm";

import type { ProductLinkRepositoryPort } from "../../../application/ports/product-link-repository-port";
import type { Db } from "../client";
import { productLinks } from "../schema";

export function createProductLinkRepository(db: Db): ProductLinkRepositoryPort {
  return {
    async create(link) {
      await db.insert(productLinks).values(link);
    },
    async findById({ userId, linkId }) {
      const rows = await db
        .select()
        .from(productLinks)
        .where(and(eq(productLinks.userId, userId), eq(productLinks.id, linkId)))
        .limit(1);
      return rows[0] ?? null;
    },
    async listByProduct({ userId, productId }) {
      return db
        .select()
        .from(productLinks)
        .where(and(eq(productLinks.userId, userId), eq(productLinks.productId, productId)))
        .orderBy(asc(productLinks.createdAt), asc(productLinks.id));
    },
    async update(link) {
      await db
        .update(productLinks)
        .set({
          url: link.url,
          title: link.title,
          description: link.description,
          updatedAt: link.updatedAt,
        })
        .where(and(eq(productLinks.userId, link.userId), eq(productLinks.id, link.id)));
    },
    async delete({ userId, linkId }) {
      await db
        .delete(productLinks)
        .where(and(eq(productLinks.userId, userId), eq(productLinks.id, linkId)));
    },
  };
}
