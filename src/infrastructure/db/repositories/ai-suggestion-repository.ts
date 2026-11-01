import { and, eq } from "drizzle-orm";

import type { AiSuggestionRepositoryPort } from "../../../application/ports/ai-suggestion-repository-port";
import type { AiSuggestion, MaintenancePayload } from "../../../domain/ai-suggestion/ai-suggestion";
import type { Db } from "../client";
import { aiSuggestions } from "../schema";

type Row = typeof aiSuggestions.$inferSelect;

// D1 は 1 つの SQL 文に渡せる値 (バインド変数) が 100 個まで。1 行 8 列なので 12 行ずつ INSERT する
const D1_MAX_BOUND_PARAMETERS = 100;
const COLUMNS_PER_ROW = 8;
const ROWS_PER_INSERT = Math.floor(D1_MAX_BOUND_PARAMETERS / COLUMNS_PER_ROW);

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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
      // D1 は対話的なトランザクションを持たないため、batch で 1 トランザクションにまとめる
      const deleteExisting = db
        .delete(aiSuggestions)
        .where(and(eq(aiSuggestions.userId, userId), eq(aiSuggestions.manualId, manualId)));
      if (suggestions.length === 0) {
        await deleteExisting;
        return;
      }
      const inserts = chunk(suggestions.map(toRow), ROWS_PER_INSERT).map((rows) =>
        db.insert(aiSuggestions).values(rows),
      );
      await db.batch([deleteExisting, ...inserts]);
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
