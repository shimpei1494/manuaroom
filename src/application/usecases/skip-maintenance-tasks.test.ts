import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { skipMaintenanceTasks } from "./skip-maintenance-tasks";
import { undoMaintenanceLog } from "./undo-maintenance-log";

const NOW = new Date("2026-07-20T00:00:00Z");
const SEEN_AT = new Date("2026-07-01T00:00:00Z");

function overdueTask(overrides: Parameters<typeof makeMaintenanceTask>[0] = {}) {
  return makeMaintenanceTask({
    intervalValue: 1,
    intervalUnit: "month",
    nextDueDate: new Date("2026-06-01T00:00:00Z"),
    lastDoneAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: SEEN_AT,
    ...overrides,
  });
}

const seen = (task: { id: string; updatedAt: Date }) => ({
  taskId: task.id,
  updatedAt: task.updatedAt,
});

describe("skipMaintenanceTasks", () => {
  test("ADR 0006: 各タスクを今日 + 周期へ送り、最終実施日は変えず、タスクごとにスキップのログを残す", async () => {
    const deps = createFakeDeps({ now: NOW });
    const monthly = overdueTask();
    const weekly = overdueTask({ intervalValue: 2, intervalUnit: "week" });
    await deps.maintenanceTaskRepository.create(monthly);
    await deps.maintenanceTaskRepository.create(weekly);

    const result = await skipMaintenanceTasks(deps, { tasks: [seen(monthly), seen(weekly)] });

    expect(result.notSkippedCount).toBe(0);
    expect(result.skipped.map(({ task }) => task.nextDueDate)).toEqual([
      new Date("2026-08-20T00:00:00Z"),
      new Date("2026-08-03T00:00:00Z"),
    ]);
    for (const original of [monthly, weekly]) {
      const stored = await deps.maintenanceTaskRepository.findById({
        userId: original.userId,
        taskId: original.id,
      });
      expect(stored?.lastDoneAt).toEqual(original.lastDoneAt);
      expect(stored?.updatedAt).toEqual(NOW);
      const logs = await deps.maintenanceLogRepository.listByTask({
        userId: original.userId,
        taskId: original.id,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ kind: "skipped", doneAt: NOW });
    }
  });

  test("まとめてスキップした記録も、タスクごとに元に戻せる", async () => {
    const deps = createFakeDeps({ now: NOW });
    const task = overdueTask();
    await deps.maintenanceTaskRepository.create(task);

    const { skipped } = await skipMaintenanceTasks(deps, { tasks: [seen(task)] });
    await undoMaintenanceLog(deps, { logId: skipped[0]?.log.id ?? "" });

    const stored = await deps.maintenanceTaskRepository.findById({
      userId: task.userId,
      taskId: task.id,
    });
    expect(stored?.nextDueDate).toEqual(task.nextDueDate);
    expect(
      await deps.maintenanceLogRepository.listByTask({ userId: task.userId, taskId: task.id }),
    ).toEqual([]);
  });

  test("周期のないタスク・画面を見たあとに更新されたタスク・他人のタスクは飛ばし、残りはスキップする", async () => {
    const deps = createFakeDeps({ now: NOW });
    const ok = overdueTask();
    const noInterval = overdueTask({ intervalValue: null, intervalUnit: null });
    const changed = overdueTask({ updatedAt: new Date("2026-07-15T00:00:00Z") });
    const others = overdueTask({ userId: "someone-else" });
    for (const t of [ok, noInterval, changed, others]) {
      await deps.maintenanceTaskRepository.create(t);
    }

    const result = await skipMaintenanceTasks(deps, {
      tasks: [
        seen(ok),
        seen(noInterval),
        // 画面を開いたときは SEEN_AT だったが、そのあと家族が完了した
        { taskId: changed.id, updatedAt: SEEN_AT },
        seen(others),
        { taskId: "missing", updatedAt: SEEN_AT },
      ],
    });

    expect(result.skipped.map(({ task }) => task.id)).toEqual([ok.id]);
    expect(result.notSkippedCount).toBe(4);
    const changedStored = await deps.maintenanceTaskRepository.findById({
      userId: changed.userId,
      taskId: changed.id,
    });
    expect(changedStored).toEqual(changed);
    expect(
      await deps.maintenanceLogRepository.listByTask({
        userId: changed.userId,
        taskId: changed.id,
      }),
    ).toEqual([]);
  });

  test("同じタスクが重複して渡されても 1 回だけスキップする", async () => {
    const deps = createFakeDeps({ now: NOW });
    const task = overdueTask();
    await deps.maintenanceTaskRepository.create(task);

    const result = await skipMaintenanceTasks(deps, { tasks: [seen(task), seen(task)] });

    expect(result.skipped).toHaveLength(1);
    expect(
      await deps.maintenanceLogRepository.listByTask({ userId: task.userId, taskId: task.id }),
    ).toHaveLength(1);
  });
});
