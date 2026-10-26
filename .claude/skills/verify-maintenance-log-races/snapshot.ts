/* oxlint-disable react-doctor/async-await-in-loop, react-doctor/js-tosorted-immutable -- 「元に戻す」は 1 回ずつ順番に押す。lib が ES2022 なので toSorted は使えない */
import type { Deps } from "../../../src/application/deps";
import { undoMaintenanceLog } from "../../../src/application/usecases/undo-maintenance-log";
import { findLatestRecordedLog } from "../../../src/domain/maintenance/undo-maintenance-log";

/** タスクの次回予定日と最終実施日 (ミリ秒。無ければ null)。 */
export type TaskState = { readonly nextDueDate: number | null; readonly lastDoneAt: number | null };

export type LogView = {
  readonly kind: string;
  readonly doneAt: number;
  /** 記録した直前のタスクの状態。取り消しでここへ戻る。 */
  readonly previous: TaskState | null;
};

/** 操作がすべて終わったあとの、利用者から見える状態。 */
export type Snapshot = {
  /** 操作ごとの結果。成功は "ok"、失敗は画面に出る文言。 */
  readonly results: readonly string[];
  readonly task: TaskState;
  /** 記録した順。 */
  readonly logs: readonly LogView[];
};

function time(date: Date | null): number | null {
  return date === null ? null : date.getTime();
}

export async function takeSnapshot(
  deps: Deps,
  taskId: string,
  results: readonly string[],
): Promise<Snapshot> {
  const userId = await deps.auth.requireUserId();
  const task = await deps.maintenanceTaskRepository.findById({ userId, taskId });
  if (!task) throw new Error("task disappeared");
  const logs = await deps.maintenanceLogRepository.listByTask({ userId, taskId });
  return {
    results,
    task: { nextDueDate: time(task.nextDueDate), lastDoneAt: time(task.lastDoneAt) },
    // tsconfig の lib が ES2022 なので toSorted は使えない
    logs: [...logs]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((log) => ({
        kind: log.kind,
        doneAt: log.doneAt.getTime(),
        previous: log.previousTaskState
          ? {
              nextDueDate: time(log.previousTaskState.nextDueDate),
              lastDoneAt: time(log.previousTaskState.lastDoneAt),
            }
          : null,
      })),
  };
}

export type UnwindResult =
  | { readonly ok: true; readonly task: TaskState; readonly steps: number }
  | { readonly ok: false; readonly reason: string };

/** 「元に戻す」を、記録がなくなるまで押し続ける。 */
export async function unwindAllLogs(deps: Deps, taskId: string): Promise<UnwindResult> {
  const userId = await deps.auth.requireUserId();
  let steps = 0;
  for (;;) {
    const logs = await deps.maintenanceLogRepository.listByTask({ userId, taskId });
    const latest = findLatestRecordedLog(logs);
    if (!latest) break;
    try {
      await undoMaintenanceLog(deps, { logId: latest.id });
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : "unknown error" };
    }
    steps += 1;
  }
  const task = await deps.maintenanceTaskRepository.findById({ userId, taskId });
  if (!task) return { ok: false, reason: "task disappeared" };
  return {
    ok: true,
    task: { nextDueDate: time(task.nextDueDate), lastDoneAt: time(task.lastDoneAt) },
    steps,
  };
}
