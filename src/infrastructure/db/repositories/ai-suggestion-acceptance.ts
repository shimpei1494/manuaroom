import { and, eq } from "drizzle-orm";

import type { AiSuggestionAcceptancePort } from "../../../application/ports/ai-suggestion-acceptance-port";
import type { MaintenanceTask } from "../../../domain/maintenance/maintenance-task";
import type { Db } from "../client";
import { aiSuggestions } from "../schema";

const INSERT_TASK_IF_SUGGESTION_ACCEPTED = `
  insert into maintenance_tasks (
    id, user_id, product_id, title, interval_value, interval_unit, next_due_date, last_done_at,
    memo, url, source, source_manual_id, source_page, created_at, updated_at
  )
  select ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  where changes() > 0
`;

function taskParams(task: MaintenanceTask) {
  return [
    task.id,
    task.userId,
    task.productId,
    task.title,
    task.intervalValue,
    task.intervalUnit,
    task.nextDueDate?.getTime() ?? null,
    task.lastDoneAt?.getTime() ?? null,
    task.memo,
    task.url,
    task.source,
    task.sourceManualId,
    task.sourcePage,
    task.createdAt.getTime(),
    task.updatedAt.getTime(),
  ];
}

/**
 * 候補ごとに「pending なら accepted にする」文と「直前の文が 1 行に効いたときだけタスクを作る」文を並べ、
 * 全件を 1 つの batch (1 トランザクション) で流す。maintenance-ledger と同じ考え方 (ADR 0009)。
 * 1 文あたりのバインド変数は 15 個までなので、D1 の上限 (1 文 100 個) に件数が効かない。
 * batch は何文入っていても D1 の「1 回の呼び出しあたりのクエリ数」では 1 回と数えられる。
 */
export function createAiSuggestionAcceptance(db: Db): AiSuggestionAcceptancePort {
  const d1 = db.$client;
  return {
    async accept({ userId, items }) {
      if (items.length === 0) return [];
      const statements = items.flatMap(({ suggestionId, task }) => {
        const { sql, params } = db
          .update(aiSuggestions)
          .set({ status: "accepted" })
          .where(
            and(
              eq(aiSuggestions.userId, userId),
              eq(aiSuggestions.id, suggestionId),
              eq(aiSuggestions.status, "pending"),
            ),
          )
          .toSQL();
        return [
          d1.prepare(sql).bind(...params),
          d1.prepare(INSERT_TASK_IF_SUGGESTION_ACCEPTED).bind(...taskParams(task)),
        ];
      });
      const results = await d1.batch(statements);
      return items
        .filter((_, i) => (results[i * 2 + 1]?.meta.changes ?? 0) > 0)
        .map(({ task }) => task.id);
    },
  };
}
