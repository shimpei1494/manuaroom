import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { markMaintenanceDone } from "./mark-maintenance-done";

describe("markMaintenanceDone", () => {
  test("ADR-0001: 完了日 + 周期で次回予定日を立て直し、実施ログを残す", async () => {
    const deps = createFakeDeps({ now: new Date("2026-01-10T00:00:00Z") });
    const task = makeMaintenanceTask({
      intervalValue: 2,
      intervalUnit: "week",
      nextDueDate: new Date("2026-01-01T00:00:00Z"),
    });
    await deps.maintenanceTaskRepository.create(task);

    const result = await markMaintenanceDone(deps, { taskId: task.id, memo: "交換した" });

    expect(result.task.nextDueDate).toEqual(new Date("2026-01-24T00:00:00Z"));
    expect(result.task.lastDoneAt).toEqual(new Date("2026-01-10T00:00:00Z"));
    const saved = await deps.maintenanceTaskRepository.findById({
      userId: task.userId,
      taskId: task.id,
    });
    expect(saved).toEqual(result.task);
    const logs = await deps.maintenanceLogRepository.listByTask({
      userId: task.userId,
      taskId: task.id,
    });
    expect(logs).toEqual([result.log]);
    expect(result.log.memo).toBe("交換した");
  });

  test("実施日を指定したらその日を基準にする", async () => {
    const deps = createFakeDeps({ now: new Date("2026-01-10T00:00:00Z") });
    const task = makeMaintenanceTask({ intervalValue: 1, intervalUnit: "month" });
    await deps.maintenanceTaskRepository.create(task);

    const result = await markMaintenanceDone(deps, {
      taskId: task.id,
      doneAt: new Date("2026-01-05T00:00:00Z"),
    });

    expect(result.task.nextDueDate).toEqual(new Date("2026-02-05T00:00:00Z"));
    expect(result.log.doneAt).toEqual(new Date("2026-01-05T00:00:00Z"));
    expect(result.log.createdAt).toEqual(new Date("2026-01-10T00:00:00Z"));
  });

  test("他のユーザーのタスクは NotFoundError", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({ userId: "someone-else" });
    await deps.maintenanceTaskRepository.create(task);

    await expect(markMaintenanceDone(deps, { taskId: task.id })).rejects.toThrow(NotFoundError);
  });
});
