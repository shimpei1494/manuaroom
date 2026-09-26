/** done: 実施した / skipped: その回はやらずに次の周期へ先送りした (ADR 0006) */
export const MAINTENANCE_LOG_KIND_VALUES = ["done", "skipped"] as const;
export type MaintenanceLogKind = (typeof MAINTENANCE_LOG_KIND_VALUES)[number];

export type MaintenanceLog = {
  id: string;
  userId: string;
  taskId: string;
  kind: MaintenanceLogKind;
  /** 記録した日 (実施日またはスキップした日) */
  doneAt: Date;
  memo: string | null;
  createdAt: Date;
};
