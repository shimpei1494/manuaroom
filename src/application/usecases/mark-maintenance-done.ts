import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../../infrastructure/deps";

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
 * 完了日基準で計算する (ADR-0001)。interval が定義されていない場合は次回予定日は null。
 */
export async function markMaintenanceDone(
  deps: Deps,
  input: MarkMaintenanceDoneInput,
): Promise<MarkMaintenanceDoneResult> {
  const userId = await deps.auth.requireUserId();
  const task = await deps.maintenanceTaskRepository.findById({ userId, taskId: input.taskId });
  if (!task) {
    throw new Error(`Maintenance task not found: ${input.taskId}`);
  }

  const doneAt = input.doneAt ?? new Date();
  const now = new Date();

  const log: MaintenanceLog = {
    id: crypto.randomUUID(),
    userId,
    taskId: task.id,
    doneAt,
    memo: input.memo ?? null,
    createdAt: now,
  };

  const nextDueDate =
    task.intervalValue !== null && task.intervalUnit !== null
      ? calculateNextDueDate(doneAt, task.intervalValue, task.intervalUnit)
      : null;

  const updatedTask: MaintenanceTask = {
    ...task,
    lastDoneAt: doneAt,
    nextDueDate,
    updatedAt: now,
  };

  await deps.maintenanceLogRepository.create(log);
  await deps.maintenanceTaskRepository.update(updatedTask);

  return { task: updatedTask, log };
}
