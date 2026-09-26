import { calculateNextDueDate } from "./calculate-next-due-date";
import type { MaintenanceTask } from "./maintenance-task";

/**
 * タスクを doneAt に実施したものとして、更新後のタスクを返す。
 * 次回予定日は完了日基準で再計算する (ADR-0001)。interval が片方でも欠けていれば null。
 */
export function completeMaintenanceTask(
  task: MaintenanceTask,
  doneAt: Date,
  now: Date,
): MaintenanceTask {
  const nextDueDate =
    task.intervalValue !== null && task.intervalUnit !== null
      ? calculateNextDueDate(doneAt, task.intervalValue, task.intervalUnit)
      : null;

  return {
    ...task,
    lastDoneAt: doneAt,
    nextDueDate,
    updatedAt: now,
  };
}
