/** done: 実施した / skipped: その回はやらずに次の周期へ先送りした (ADR 0006) */
export const MAINTENANCE_LOG_KIND_VALUES = ["done", "skipped"] as const;
export type MaintenanceLogKind = (typeof MAINTENANCE_LOG_KIND_VALUES)[number];

/**
 * 記録する直前のタスクの状態。記録を取り消すときにこの状態へ戻す。
 * 取り消し機能より前に作られた記録には無い (null)。
 */
export type TaskStateBeforeLog = {
  nextDueDate: Date | null;
  lastDoneAt: Date | null;
};

export type MaintenanceLog = {
  id: string;
  userId: string;
  taskId: string;
  kind: MaintenanceLogKind;
  /** 記録した日 (実施日またはスキップした日) */
  doneAt: Date;
  memo: string | null;
  previousTaskState: TaskStateBeforeLog | null;
  createdAt: Date;
};
