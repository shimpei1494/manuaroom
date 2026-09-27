import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError, NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { listMaintenanceLogs } from "./list-maintenance-logs";
import { markMaintenanceDone } from "./mark-maintenance-done";
import { skipMaintenance } from "./skip-maintenance";
import { undoMaintenanceLog } from "./undo-maintenance-log";

function setup() {
  const deps = createFakeDeps({ now: new Date("2026-07-20T00:00:00Z") });
  const task = makeMaintenanceTask({
    intervalValue: 1,
    intervalUnit: "month",
    nextDueDate: new Date("2026-07-10T00:00:00Z"),
    lastDoneAt: new Date("2026-06-10T00:00:00Z"),
  });
  return { deps, task };
}

describe("undoMaintenanceLog", () => {
  test("完了を取り消すと、次回予定日と最終実施日が完了前に戻り、記録が消える", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });

    const restored = await undoMaintenanceLog(deps, { logId: log.id });

    expect(restored.nextDueDate).toEqual(task.nextDueDate);
    expect(restored.lastDoneAt).toEqual(task.lastDoneAt);
    expect(
      await deps.maintenanceTaskRepository.findById({ userId: task.userId, taskId: task.id }),
    ).toEqual(restored);
    expect(
      await deps.maintenanceLogRepository.listByTask({ userId: task.userId, taskId: task.id }),
    ).toEqual([]);
  });

  test("スキップを取り消すと、次回予定日がスキップ前に戻る", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await skipMaintenance(deps, { taskId: task.id });

    const restored = await undoMaintenanceLog(deps, { logId: log.id });

    expect(restored.nextDueDate).toEqual(task.nextDueDate);
  });

  test("続けて記録したあとで前の記録は取り消せず、何も変えない", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const first = await skipMaintenance(deps, { taskId: task.id });
    deps.setNow(new Date("2026-07-21T00:00:00Z"));
    const second = await markMaintenanceDone(deps, { taskId: task.id });

    await expect(undoMaintenanceLog(deps, { logId: first.log.id })).rejects.toThrow(
      BusinessRuleError,
    );
    expect(
      await deps.maintenanceTaskRepository.findById({ userId: task.userId, taskId: task.id }),
    ).toEqual(second.task);
  });

  test("他のユーザーの記録は NotFoundError", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });
    const other = createFakeDeps({ userId: "someone-else" });
    other.maintenanceLogRepository = deps.maintenanceLogRepository;
    other.maintenanceTaskRepository = deps.maintenanceTaskRepository;

    await expect(undoMaintenanceLog(other, { logId: log.id })).rejects.toThrow(NotFoundError);
  });
});

describe("listMaintenanceLogs", () => {
  test("新しい順に返し、最後に記録したものだけ取り消せる", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const skipped = await skipMaintenance(deps, { taskId: task.id });
    deps.setNow(new Date("2026-07-21T00:00:00Z"));
    const done = await markMaintenanceDone(deps, { taskId: task.id });

    const logs = await listMaintenanceLogs(deps, { taskId: done.task.id });

    expect(logs.map((l) => [l.id, l.canUndo])).toEqual([
      [done.log.id, true],
      [skipped.log.id, false],
    ]);
  });

  test("取り消しに対応する前の記録は、最後のものでも取り消せない", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    await deps.maintenanceLogRepository.create({
      id: "legacy",
      userId: task.userId,
      taskId: task.id,
      kind: "done",
      doneAt: new Date("2026-06-10T00:00:00Z"),
      memo: null,
      previousTaskState: null,
      createdAt: new Date("2026-06-10T00:00:00Z"),
    });

    const logs = await listMaintenanceLogs(deps, { taskId: task.id });

    expect(logs.map((l) => l.canUndo)).toEqual([false]);
  });
});
