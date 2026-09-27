import type { MaintenanceLog, MaintenanceLogKind } from "../../domain/maintenance/maintenance-log";

export type MaintenanceLogRepositoryPort = {
  create(log: MaintenanceLog): Promise<void>;
  findById(input: { userId: string; logId: string }): Promise<MaintenanceLog | null>;
  /** 記録した日の新しい順 */
  listByTask(input: { userId: string; taskId: string }): Promise<MaintenanceLog[]>;
  /** ユーザーの全タスクのログのうち、指定した種類のもの (一覧でのスキップ回数の集計用) */
  listByKind(input: { userId: string; kind: MaintenanceLogKind }): Promise<MaintenanceLog[]>;
  /** 記録した日が from 以上 to 未満のもの */
  listByPeriod(input: { userId: string; from: Date; to: Date }): Promise<MaintenanceLog[]>;
  delete(input: { userId: string; logId: string }): Promise<void>;
};
