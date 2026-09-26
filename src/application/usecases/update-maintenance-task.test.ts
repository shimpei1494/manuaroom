import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { updateMaintenanceTask } from "./update-maintenance-task";

const baseInput = { title: "フィルター掃除", memo: null, url: null };

describe("updateMaintenanceTask", () => {
  test("周期を変えたら最終実施日 + 新しい周期で予定日を立て直す", async () => {
    const deps = createFakeDeps({ now: new Date("2026-02-01T00:00:00Z") });
    const task = makeMaintenanceTask({
      intervalValue: 2,
      intervalUnit: "week",
      lastDoneAt: new Date("2026-01-10T00:00:00Z"),
      nextDueDate: new Date("2026-01-24T00:00:00Z"),
    });
    await deps.maintenanceTaskRepository.create(task);

    const updated = await updateMaintenanceTask(deps, {
      ...baseInput,
      taskId: task.id,
      intervalValue: 1,
      intervalUnit: "month",
    });

    expect(updated.nextDueDate).toEqual(new Date("2026-02-10T00:00:00Z"));
    expect(updated.updatedAt).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  test("周期を変えて未実施なら今日 + 新しい周期", async () => {
    const deps = createFakeDeps({ now: new Date("2026-02-01T00:00:00Z") });
    const task = makeMaintenanceTask({ intervalValue: 2, intervalUnit: "week" });
    await deps.maintenanceTaskRepository.create(task);

    const updated = await updateMaintenanceTask(deps, {
      ...baseInput,
      taskId: task.id,
      intervalValue: 3,
      intervalUnit: "day",
    });

    expect(updated.nextDueDate).toEqual(new Date("2026-02-04T00:00:00Z"));
  });

  test("周期を外したら予定日もなくなる", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({
      intervalValue: 2,
      intervalUnit: "week",
      nextDueDate: new Date("2026-01-24T00:00:00Z"),
    });
    await deps.maintenanceTaskRepository.create(task);

    const updated = await updateMaintenanceTask(deps, {
      ...baseInput,
      taskId: task.id,
      intervalValue: null,
      intervalUnit: null,
    });

    expect(updated.nextDueDate).toBeNull();
  });

  test("周期を変えなければ予定日はそのまま", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({
      intervalValue: 2,
      intervalUnit: "week",
      nextDueDate: new Date("2026-01-24T00:00:00Z"),
    });
    await deps.maintenanceTaskRepository.create(task);

    const updated = await updateMaintenanceTask(deps, {
      ...baseInput,
      taskId: task.id,
      title: "フィルター交換",
      intervalValue: 2,
      intervalUnit: "week",
    });

    expect(updated.nextDueDate).toEqual(new Date("2026-01-24T00:00:00Z"));
    expect(updated.title).toBe("フィルター交換");
  });

  test("予定日を明示したら周期の変更より優先する", async () => {
    const deps = createFakeDeps();
    const task = makeMaintenanceTask({ intervalValue: 2, intervalUnit: "week" });
    await deps.maintenanceTaskRepository.create(task);

    const updated = await updateMaintenanceTask(deps, {
      ...baseInput,
      taskId: task.id,
      intervalValue: 1,
      intervalUnit: "year",
      nextDueDate: new Date("2026-06-01T00:00:00Z"),
    });

    expect(updated.nextDueDate).toEqual(new Date("2026-06-01T00:00:00Z"));
  });
});
