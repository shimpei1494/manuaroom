import { BusinessRuleError } from "../errors";
import type { MaintenanceLog, TaskStateBeforeLog } from "./maintenance-log";
import type { MaintenanceTask } from "./maintenance-task";

/** 記録する直前のタスクの状態。実施・スキップの記録に残し、取り消しに使う。 */
export function captureTaskStateBeforeLog(task: MaintenanceTask): TaskStateBeforeLog {
  return { nextDueDate: task.nextDueDate, lastDoneAt: task.lastDoneAt };
}

/** 最後に記録したもの (実施日ではなく記録した時刻で決める)。 */
export function findLatestRecordedLog(logs: MaintenanceLog[]): MaintenanceLog | undefined {
  let latest: MaintenanceLog | undefined;
  for (const log of logs) {
    if (!latest || log.createdAt.getTime() > latest.createdAt.getTime()) latest = log;
  }
  return latest;
}

/**
 * 実施・スキップの記録を取り消し、記録する前の次回予定日と最終実施日に戻したタスクを返す。
 * 戻す先は記録に残した状態なので、取り消せるのはそのタスクで最後に記録したもの (createdAt が最新) だけ。
 * logs はそのタスクの記録すべて。記録そのものの削除は呼び出し側で行う。
 */
export function undoMaintenanceLog(
  task: MaintenanceTask,
  logs: MaintenanceLog[],
  logId: string,
  now: Date,
): MaintenanceTask {
  const log = logs.find((l) => l.id === logId);
  if (!log) {
    throw new BusinessRuleError("取り消す記録が見つかりません");
  }
  if (findLatestRecordedLog(logs)?.id !== log.id) {
    throw new BusinessRuleError("取り消せるのは最後に記録したものだけです");
  }
  if (log.previousTaskState === null) {
    throw new BusinessRuleError(
      "この記録は取り消しに対応する前のものなので取り消せません。予定日を変えるには編集してください",
    );
  }
  return {
    ...task,
    nextDueDate: log.previousTaskState.nextDueDate,
    lastDoneAt: log.previousTaskState.lastDoneAt,
    updatedAt: now,
  };
}
