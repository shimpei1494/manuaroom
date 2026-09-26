import { and, eq } from "drizzle-orm";

import type { AiSuggestionRepositoryPort } from "../../../application/ports/ai-suggestion-repository-port";
import type { AiSuggestion, MaintenancePayload } from "../../../domain/ai-suggestion/ai-suggestion";
import type { Db } from "../client";
import { aiSuggestions } from "../schema";

type Row = typeof aiSuggestions.$inferSelect;

function toRow(s: AiSuggestion) {
  return {
    id: s.id,
    userId: s.userId,
    productId: s.productId,
    manualId: s.manualId,
    type: s.type,
    payloadJson: JSON.stringify(s.payload),
    status: s.status,
    createdAt: s.createdAt,
  };
}

function fromRow(row: Row): AiSuggestion {
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    manualId: row.manualId,
    type: row.type,
    payload: JSON.parse(row.payloadJson) as MaintenancePayload,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export function createAiSuggestionRepository(db: Db): AiSuggestionRepositoryPort {
  return {
    async replaceByManual({ userId, manualId, suggestions }) {
      await db.transaction(async (tx) => {
        await tx
          .delete(aiSuggestions)
          .where(and(eq(aiSuggestions.userId, userId), eq(aiSuggestions.manualId, manualId)));
        if (suggestions.length > 0) {
          await tx.insert(aiSuggestions).values(suggestions.map(toRow));
        }
      });
    },
    async findById({ userId, suggestionId }) {
      const rows = await db
        .select()
        .from(aiSuggestions)
        .where(and(eq(aiSuggestions.userId, userId), eq(aiSuggestions.id, suggestionId)))
        .limit(1);
      const row = rows[0];
      return row ? fromRow(row) : null;
    },
    async listByManual({ userId, manualId }) {
      const rows = await db
        .select()
        .from(aiSuggestions)
        .where(and(eq(aiSuggestions.userId, userId), eq(aiSuggestions.manualId, manualId)))
        .orderBy(aiSuggestions.createdAt);
      return rows.map(fromRow);
    },
    async updateStatus({ userId, suggestionId, status }) {
      await db
        .update(aiSuggestions)
        .set({ status })
        .where(and(eq(aiSuggestions.userId, userId), eq(aiSuggestions.id, suggestionId)));
    },
  };
}
