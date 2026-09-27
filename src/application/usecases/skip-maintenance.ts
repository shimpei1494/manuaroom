import { NotFoundError } from "../../domain/errors";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { skipMaintenanceTask } from "../../domain/maintenance/skip-maintenance-task";
import { captureTaskStateBeforeLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";

export type SkipMaintenanceInput = {
  taskId: string;
  memo?: string | null;
};

export type SkipMaintenanceResult = {
  task: MaintenanceTask;
  log: MaintenanceLog;
};

/**
 * その回はやらずに次の周期へ先送りする。再計算のルールは skipMaintenanceTask (ADR 0006)。
 */
export async function skipMaintenance(
  deps: Pick<Deps, "auth" | "clock" | "maintenanceTaskRepository" | "maintenanceLogRepository">,
  input: SkipMaintenanceInput,
): Promise<SkipMaintenanceResult> {
  const userId = await deps.auth.requireUserId();
  const task = await deps.maintenanceTaskRepository.findById({ userId, taskId: input.taskId });
  if (!task) {
    throw new NotFoundError("Maintenance task", input.taskId);
  }

  const now = deps.clock.now();
  const updatedTask = skipMaintenanceTask(task, now, now);

  const log: MaintenanceLog = {
    id: crypto.randomUUID(),
    userId,
    taskId: task.id,
    kind: "skipped",
    doneAt: now,
    memo: input.memo ?? null,
    previousTaskState: captureTaskStateBeforeLog(task),
    createdAt: now,
  };

  await deps.maintenanceLogRepository.create(log);
  await deps.maintenanceTaskRepository.update(updatedTask);

  return { task: updatedTask, log };
}
