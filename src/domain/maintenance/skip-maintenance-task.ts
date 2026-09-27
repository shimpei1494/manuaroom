import { BusinessRuleError } from "../errors";
import { calculateNextDueDate } from "./calculate-next-due-date";
import type { MaintenanceTask } from "./maintenance-task";

/**
 * タスクを skippedAt にスキップしたものとして、更新後のタスクを返す (ADR 0006)。
 * 次回予定日は「スキップした日 + interval」。最終実施日は変えない。
 * interval が片方でも欠けていれば次の周期がないのでスキップできない。
 */
export function skipMaintenanceTask(
  task: MaintenanceTask,
  skippedAt: Date,
  now: Date,
): MaintenanceTask {
  if (task.intervalValue === null || task.intervalUnit === null) {
    throw new BusinessRuleError(
      "周期が設定されていないタスクはスキップできません。予定日を変えるには編集してください",
    );
  }
  return {
    ...task,
    nextDueDate: calculateNextDueDate(skippedAt, task.intervalValue, task.intervalUnit),
    updatedAt: now,
  };
}
