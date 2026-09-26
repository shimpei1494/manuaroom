import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import type { IntervalUnit, MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../../infrastructure/deps";

export type UpdateMaintenanceTaskInput = {
  taskId: string;
  title: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit | null;
  memo: string | null;
  url: string | null;
  /**
   * 次回予定日。明示指定なら採用、未指定 (undefined) なら既存値を維持。
   * interval 両方が変更されかつ未指定なら lastDoneAt (なければ今日) 基準で再計算。
   */
  nextDueDate?: Date | null;
};

export async function updateMaintenanceTask(
  deps: Deps,
  input: UpdateMaintenanceTaskInput,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();
  const existing = await deps.maintenanceTaskRepository.findById({ userId, taskId: input.taskId });
  if (!existing) {
    throw new Error(`Maintenance task not found: ${input.taskId}`);
  }

  const intervalChanged =
    existing.intervalValue !== input.intervalValue || existing.intervalUnit !== input.intervalUnit;

  let nextDueDate: Date | null;
  if (input.nextDueDate !== undefined) {
    nextDueDate = input.nextDueDate;
  } else if (intervalChanged && input.intervalValue !== null && input.intervalUnit !== null) {
    const base = existing.lastDoneAt ?? new Date();
    nextDueDate = calculateNextDueDate(base, input.intervalValue, input.intervalUnit);
  } else if (intervalChanged) {
    nextDueDate = null;
  } else {
    nextDueDate = existing.nextDueDate;
  }

  const updated: MaintenanceTask = {
    ...existing,
    title: input.title,
    intervalValue: input.intervalValue,
    intervalUnit: input.intervalUnit,
    memo: input.memo,
    url: input.url,
    nextDueDate,
    updatedAt: new Date(),
  };

  await deps.maintenanceTaskRepository.update(updated);
  return updated;
}
