import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError, NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { skipMaintenance } from "./skip-maintenance";

describe("skipMaintenance", () => {
  test("ADR 0006: スキップした日 + 周期で次回予定日を立て直し、スキップのログを残す", async () => {
    const deps = createFakeDeps({ now: new Date("2026-07-20T00:00:00Z") });
    const task = makeMaintenanceTask({
      intervalValue: 6,
      intervalUnit: "month",
      nextDueDate: new Date("2026-07-10T00:00:00Z"),
      lastDoneAt: new Date("2026-01-10T00:00:00Z"),
    });
    await deps.maintenanceTaskRepository.create(task);

    const result = await skipMaintenance(deps, { taskId: task.id, memo: "まだ汚れていない" });

    expect(result.task.nextDueDate).toEqual(new Date("2027-01-20T00:00:00Z"));
    expect(result.task.lastDoneAt).toEqual(new Date("2026-01-10T00:00:00Z"));
    expect(
      await deps.maintenanceTaskRepository.findById({ userId: task.userId, taskId: task.id }),
    ).toEqual(result.task);
    const logs = await deps.maintenanceLogRepository.listByTask({
      userId: task.userId,
      taskId: task.id,
    });
    expect(logs).toEqual([result.log]);
    expect(result.log).toMatchObject({
      kind: "skipped",
      doneAt: new Date("2026-07-20T00:00:00Z"),
      memo: "まだ汚れていない",
    });
  });

  test("interval が未設定のタスクは BusinessRuleError で、何も保存しない", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({ intervalValue: null, intervalUnit: null });
    await deps.maintenanceTaskRepository.create(task);

    await expect(skipMaintenance(deps, { taskId: task.id })).rejects.toThrow(BusinessRuleError);
    expect(
      await deps.maintenanceLogRepository.listByTask({ userId: task.userId, taskId: task.id }),
    ).toEqual([]);
  });

  test("他のユーザーのタスクは NotFoundError", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({
      userId: "someone-else",
      intervalValue: 1,
      intervalUnit: "week",
    });
    await deps.maintenanceTaskRepository.create(task);

    await expect(skipMaintenance(deps, { taskId: task.id })).rejects.toThrow(NotFoundError);
  });
});
