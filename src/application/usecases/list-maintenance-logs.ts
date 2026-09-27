import { NotFoundError } from "../../domain/errors";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import { findLatestRecordedLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";

export type MaintenanceLogListItem = MaintenanceLog & {
  /** 今取り消せるか (そのタスクで最後に記録したもので、記録前の状態が残っている) */
  canUndo: boolean;
};

/** タスクの実施・スキップの履歴 (記録した日の新しい順)。 */
export async function listMaintenanceLogs(
  deps: Pick<Deps, "auth" | "maintenanceTaskRepository" | "maintenanceLogRepository">,
  input: { taskId: string },
): Promise<MaintenanceLogListItem[]> {
  const userId = await deps.auth.requireUserId();
  const task = await deps.maintenanceTaskRepository.findById({ userId, taskId: input.taskId });
  if (!task) {
    throw new NotFoundError("Maintenance task", input.taskId);
  }
  const logs = await deps.maintenanceLogRepository.listByTask({ userId, taskId: task.id });
  const latestId = findLatestRecordedLog(logs)?.id;
  return logs.map((log) => ({
    ...log,
    canUndo: log.id === latestId && log.previousTaskState !== null,
  }));
}
