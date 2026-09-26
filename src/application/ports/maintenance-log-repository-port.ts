import type { MaintenanceLog, MaintenanceLogKind } from "../../domain/maintenance/maintenance-log";

export type MaintenanceLogRepositoryPort = {
  create(log: MaintenanceLog): Promise<void>;
  listByTask(input: { userId: string; taskId: string }): Promise<MaintenanceLog[]>;
  /** ユーザーの全タスクのログのうち、指定した種類のもの (一覧でのスキップ回数の集計用) */
  listByKind(input: { userId: string; kind: MaintenanceLogKind }): Promise<MaintenanceLog[]>;
};
