import { and, eq, sql } from "drizzle-orm";

import type { MaintenanceLedgerPort } from "../../../application/ports/maintenance-ledger-port";
import type { MaintenanceTask } from "../../../domain/maintenance/maintenance-task";
import type { Db } from "../client";
import { maintenanceLogs, maintenanceTasks } from "../schema";

/** 読んだ時点から更新日時が変わっていなければ、次回予定日と最終実施日を書く。 */
function updateTaskIfUnchanged(db: Db, task: MaintenanceTask, readUpdatedAt: Date) {
  return db
    .update(maintenanceTasks)
    .set({ nextDueDate: task.nextDueDate, lastDoneAt: task.lastDoneAt, updatedAt: task.updatedAt })
    .where(
      and(
        eq(maintenanceTasks.userId, task.userId),
        eq(maintenanceTasks.id, task.id),
        eq(maintenanceTasks.updatedAt, readUpdatedAt),
      ),
    );
}

const INSERT_LOG_IF_TASK_UPDATED = `
  insert into maintenance_logs (
    id, user_id, task_id, kind, done_at, memo,
    has_previous_task_state, previous_next_due_date, previous_last_done_at, created_at
  )
  select ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  where changes() > 0
`;

/**
 * D1 は対話的なトランザクションを持たないので、batch (1 トランザクション) の中で、
 * 直前のタスクの更新が 1 行に効いたとき (changes() > 0) だけ、記録を書く・消す。
 * 効かなかったとき (他の操作が先にタスクを更新した) は、記録にも触らない。
 * drizzle の batch は、パラメータつきの生 SQL を受け付けないので、D1 の batch を直接使う。
 */
export function createMaintenanceLedger(db: Db): MaintenanceLedgerPort {
  const d1 = db.$client;
  const statementOf = (query: { toSQL(): { sql: string; params: unknown[] } }) => {
    const { sql: text, params } = query.toSQL();
    return d1.prepare(text).bind(...params);
  };
  return {
    async appendLog({ task, readUpdatedAt, log }) {
      const { previousTaskState: previous } = log;
      const [updated] = await d1.batch([
        statementOf(updateTaskIfUnchanged(db, task, readUpdatedAt)),
        d1
          .prepare(INSERT_LOG_IF_TASK_UPDATED)
          .bind(
            log.id,
            log.userId,
            log.taskId,
            log.kind,
            log.doneAt.getTime(),
            log.memo,
            previous === null ? 0 : 1,
            previous?.nextDueDate?.getTime() ?? null,
            previous?.lastDoneAt?.getTime() ?? null,
            log.createdAt.getTime(),
          ),
      ]);
      return (updated?.meta.changes ?? 0) > 0;
    },
    async revertLog({ task, readUpdatedAt, logId }) {
      const [updated] = await d1.batch([
        statementOf(updateTaskIfUnchanged(db, task, readUpdatedAt)),
        statementOf(
          db
            .delete(maintenanceLogs)
            .where(
              and(
                eq(maintenanceLogs.userId, task.userId),
                eq(maintenanceLogs.id, logId),
                sql`changes() > 0`,
              ),
            ),
        ),
      ]);
      return (updated?.meta.changes ?? 0) > 0;
    },
  };
}
