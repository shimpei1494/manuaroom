import { countSkipsSinceLastDone } from "../../domain/maintenance/count-skips-since-last-done";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../deps";

export type ListMaintenanceTasksInput = {
  productId?: string;
};

/** 一覧表示用。最後に実施してから何回続けてスキップしているかを添える (ADR 0006)。 */
export type MaintenanceTaskListItem = MaintenanceTask & { skipCount: number };

export async function listMaintenanceTasks(
  deps: Pick<Deps, "auth" | "maintenanceTaskRepository" | "maintenanceLogRepository">,
  input: ListMaintenanceTasksInput = {},
): Promise<MaintenanceTaskListItem[]> {
  const userId = await deps.auth.requireUserId();
  const [tasks, skippedLogs] = await Promise.all([
    input.productId === undefined
      ? deps.maintenanceTaskRepository.listByUser(userId)
      : deps.maintenanceTaskRepository.listByProduct({ userId, productId: input.productId }),
    // タスクごとに取ると N+1 になるので、スキップのログをまとめて取る
    deps.maintenanceLogRepository.listByKind({ userId, kind: "skipped" }),
  ]);

  const skippedLogsByTask = new Map<string, MaintenanceLog[]>();
  for (const log of skippedLogs) {
    const logs = skippedLogsByTask.get(log.taskId);
    if (logs) logs.push(log);
    else skippedLogsByTask.set(log.taskId, [log]);
  }
  return tasks.map((task) => ({
    ...task,
    skipCount: countSkipsSinceLastDone(skippedLogsByTask.get(task.id) ?? [], task.lastDoneAt),
  }));
}
