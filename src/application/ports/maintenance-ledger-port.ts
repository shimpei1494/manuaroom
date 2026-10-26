import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";

/**
 * 実施・スキップの記録と、タスクの次回予定日・最終実施日の更新を、切り離せない 1 つの操作として行う (ADR 0009)。
 * どちらも、タスクを読んだ時点 (readUpdatedAt) から他の操作で更新されていなければ書き、
 * 更新されていたら何も書かずに false を返す。呼び出し側は読み直してやり直す。
 */
export type MaintenanceLedgerPort = {
  /** 記録を追加し、task の次回予定日・最終実施日・更新日時を書く。 */
  appendLog(input: {
    task: MaintenanceTask;
    readUpdatedAt: Date;
    log: MaintenanceLog;
  }): Promise<boolean>;
  /** 記録を削除し、task の次回予定日・最終実施日・更新日時を書く。 */
  revertLog(input: { task: MaintenanceTask; readUpdatedAt: Date; logId: string }): Promise<boolean>;
};
