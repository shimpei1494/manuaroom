import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import { isSkippable, skipMaintenanceTask } from "../../domain/maintenance/skip-maintenance-task";
import { captureTaskStateBeforeLog } from "../../domain/maintenance/undo-maintenance-log";
import type { Deps } from "../deps";

export type SkipMaintenanceTasksInput = {
  /** 利用者が確認ダイアログで見たタスクと、そのときの更新日時 */
  tasks: { taskId: string; updatedAt: Date }[];
};

export type SkipMaintenanceTasksResult = {
  skipped: { task: MaintenanceTask; log: MaintenanceLog }[];
  /** 見つからない・周期がない・画面を見たあとに更新された、のどれかで飛ばした件数 */
  notSkippedCount: number;
};

/**
 * 複数のタスクをまとめてスキップする (期限切れをまとめて先送りする用途)。
 * 1 件ずつのスキップ (skipMaintenance) と同じく、次回予定日は「今日 + 周期」、
 * 記録はタスクごとに 1 件残すので、取り消しもタスクごとにできる (ADR 0006)。
 *
 * 利用者が見たときから更新されたタスク (家族が先に完了した など) は、見ていない状態を
 * スキップしないよう、やり直さずに飛ばす。書き込みは全件を 1 トランザクションで行う (ADR 0009)。
 */
export async function skipMaintenanceTasks(
  deps: Pick<Deps, "auth" | "clock" | "maintenanceTaskRepository" | "maintenanceLedger">,
  input: SkipMaintenanceTasksInput,
): Promise<SkipMaintenanceTasksResult> {
  const userId = await deps.auth.requireUserId();
  const requested = new Map(input.tasks.map((t) => [t.taskId, t.updatedAt] as const));
  const now = deps.clock.now();

  // D1 の 1 回の呼び出しあたりのクエリ数に上限があるので、1 件ずつ読まずにまとめて読む
  const tasksById = new Map(
    (await deps.maintenanceTaskRepository.listByUser(userId)).map((t) => [t.id, t] as const),
  );
  const entries: { task: MaintenanceTask; readUpdatedAt: Date; log: MaintenanceLog }[] = [];
  for (const [taskId, seenUpdatedAt] of requested) {
    const task = tasksById.get(taskId);
    if (!task || !isSkippable(task)) continue;
    if (task.updatedAt.getTime() !== seenUpdatedAt.getTime()) continue;
    entries.push({
      task: skipMaintenanceTask(task, now, now),
      readUpdatedAt: task.updatedAt,
      log: {
        id: crypto.randomUUID(),
        userId,
        taskId: task.id,
        kind: "skipped",
        doneAt: now,
        memo: null,
        previousTaskState: captureTaskStateBeforeLog(task),
        createdAt: now,
      },
    });
  }

  const writtenIds = new Set(
    entries.length === 0 ? [] : await deps.maintenanceLedger.appendLogs(entries),
  );
  const skipped = entries
    .filter(({ log }) => writtenIds.has(log.id))
    .map(({ task, log }) => ({ task, log }));
  return { skipped, notSkippedCount: requested.size - skipped.length };
}
