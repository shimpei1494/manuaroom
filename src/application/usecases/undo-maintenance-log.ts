import { NotFoundError } from "../../domain/errors";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { undoMaintenanceLog as undoLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";
import { retryOnConflict } from "./retry-on-conflict";

export type UndoMaintenanceLogInput = { logId: string };

/**
 * 実施・スキップの記録を取り消し、タスクを記録する前の状態に戻す。
 * 取り消せる条件は undoMaintenanceLog (domain) を参照。
 * 読んだあとに他の操作でタスクが更新されたときは、読み直してやり直す (ADR 0009)。
 */
export async function undoMaintenanceLog(
  deps: Pick<
    Deps,
    | "auth"
    | "clock"
    | "maintenanceTaskRepository"
    | "maintenanceLogRepository"
    | "maintenanceLedger"
  >,
  input: UndoMaintenanceLogInput,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();
  return retryOnConflict(async () => {
    const log = await deps.maintenanceLogRepository.findById({ userId, logId: input.logId });
    if (!log) {
      throw new NotFoundError("Maintenance log", input.logId);
    }
    // タスクを先に読む。記録がタスクより新しいぶんには、書き込み時の比較で見つかる (ADR 0009)
    const task = await deps.maintenanceTaskRepository.findById({ userId, taskId: log.taskId });
    if (!task) {
      throw new NotFoundError("Maintenance task", log.taskId);
    }
    const logs = await deps.maintenanceLogRepository.listByTask({ userId, taskId: log.taskId });
    if (!logs.some((l) => l.id === log.id)) {
      throw new NotFoundError("Maintenance log", log.id);
    }

    const updatedTask = undoLog(task, logs, log.id, deps.clock.now());

    const written = await deps.maintenanceLedger.revertLog({
      task: updatedTask,
      readUpdatedAt: task.updatedAt,
      logId: log.id,
    });
    return written ? updatedTask : null;
  });
}
