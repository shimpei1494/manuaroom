import { NotFoundError } from "../../domain/errors";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { undoMaintenanceLog as undoLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";

export type UndoMaintenanceLogInput = { logId: string };

/**
 * 実施・スキップの記録を取り消し、タスクを記録する前の状態に戻す。
 * 取り消せる条件は undoMaintenanceLog (domain) を参照。
 */
export async function undoMaintenanceLog(
  deps: Pick<Deps, "auth" | "clock" | "maintenanceTaskRepository" | "maintenanceLogRepository">,
  input: UndoMaintenanceLogInput,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();
  const log = await deps.maintenanceLogRepository.findById({ userId, logId: input.logId });
  if (!log) {
    throw new NotFoundError("Maintenance log", input.logId);
  }
  const [task, logs] = await Promise.all([
    deps.maintenanceTaskRepository.findById({ userId, taskId: log.taskId }),
    deps.maintenanceLogRepository.listByTask({ userId, taskId: log.taskId }),
  ]);
  if (!task) {
    throw new NotFoundError("Maintenance task", log.taskId);
  }

  const updatedTask = undoLog(task, logs, log.id, deps.clock.now());

  await deps.maintenanceTaskRepository.update(updatedTask);
  await deps.maintenanceLogRepository.delete({ userId, logId: log.id });
  return updatedTask;
}
