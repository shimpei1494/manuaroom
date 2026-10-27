import { NotFoundError } from "../../domain/errors";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { skipMaintenanceTask } from "../../domain/maintenance/skip-maintenance-task";
import { captureTaskStateBeforeLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";
import { retryOnConflict } from "./retry-on-conflict";

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
 * 読んだあとに他の操作でタスクが更新されたときは、読み直してやり直す (ADR 0009)。
 */
export async function skipMaintenance(
  deps: Pick<Deps, "auth" | "clock" | "maintenanceTaskRepository" | "maintenanceLedger">,
  input: SkipMaintenanceInput,
): Promise<SkipMaintenanceResult> {
  const userId = await deps.auth.requireUserId();
  return retryOnConflict(async () => {
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

    const written = await deps.maintenanceLedger.appendLog({
      task: updatedTask,
      readUpdatedAt: task.updatedAt,
      log,
    });
    return written ? { task: updatedTask, log } : null;
  });
}
