import { NotFoundError } from "../../domain/errors";
import { completeMaintenanceTask } from "../../domain/maintenance/complete-maintenance-task";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { captureTaskStateBeforeLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";
import { retryOnConflict } from "./retry-on-conflict";

export type MarkMaintenanceDoneInput = {
  taskId: string;
  /** 省略時は現在時刻。 */
  doneAt?: Date;
  memo?: string | null;
};

export type MarkMaintenanceDoneResult = {
  task: MaintenanceTask;
  log: MaintenanceLog;
};

/**
 * メンテナンスタスクを「完了済み」としてマークし、次回予定日を再計算する。
 * 再計算のルールは completeMaintenanceTask (ADR-0001)。
 * 読んだあとに他の操作でタスクが更新されたときは、読み直してやり直す (ADR 0009)。
 */
export async function markMaintenanceDone(
  deps: Pick<Deps, "auth" | "clock" | "maintenanceTaskRepository" | "maintenanceLedger">,
  input: MarkMaintenanceDoneInput,
): Promise<MarkMaintenanceDoneResult> {
  const userId = await deps.auth.requireUserId();
  return retryOnConflict(async () => {
    const task = await deps.maintenanceTaskRepository.findById({ userId, taskId: input.taskId });
    if (!task) {
      throw new NotFoundError("Maintenance task", input.taskId);
    }

    const now = deps.clock.now();
    const doneAt = input.doneAt ?? now;

    const log: MaintenanceLog = {
      id: crypto.randomUUID(),
      userId,
      taskId: task.id,
      kind: "done",
      doneAt,
      memo: input.memo ?? null,
      previousTaskState: captureTaskStateBeforeLog(task),
      createdAt: now,
    };

    const updatedTask = completeMaintenanceTask(task, doneAt, now);

    const written = await deps.maintenanceLedger.appendLog({
      task: updatedTask,
      readUpdatedAt: task.updatedAt,
      log,
    });
    return written ? { task: updatedTask, log } : null;
  });
}
