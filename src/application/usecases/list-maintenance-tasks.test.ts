import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { listMaintenanceTasks } from "./list-maintenance-tasks";
import { markMaintenanceDone } from "./mark-maintenance-done";
import { skipMaintenance } from "./skip-maintenance";

describe("listMaintenanceTasks", () => {
  test("タスクごとに、最後に完了してからのスキップ回数を付けて返す (ADR 0006)", async () => {
    const deps = createFakeDeps({ now: new Date("2026-01-01T00:00:00Z") });
    const skipped = makeMaintenanceTask({ intervalValue: 1, intervalUnit: "month" });
    const untouched = makeMaintenanceTask({ intervalValue: 1, intervalUnit: "month" });
    await deps.maintenanceTaskRepository.create(skipped);
    await deps.maintenanceTaskRepository.create(untouched);

    await skipMaintenance(deps, { taskId: skipped.id });
    deps.setNow(new Date("2026-02-01T00:00:00Z"));
    await skipMaintenance(deps, { taskId: skipped.id });

    const tasks = await listMaintenanceTasks(deps);

    expect(tasks.find((t) => t.id === skipped.id)?.skipCount).toBe(2);
    expect(tasks.find((t) => t.id === untouched.id)?.skipCount).toBe(0);
  });

  test("完了するとスキップ回数は 0 に戻る", async () => {
    const deps = createFakeDeps({ now: new Date("2026-01-01T00:00:00Z") });
    const task = makeMaintenanceTask({ intervalValue: 1, intervalUnit: "month" });
    await deps.maintenanceTaskRepository.create(task);
    await skipMaintenance(deps, { taskId: task.id });
    deps.setNow(new Date("2026-01-05T00:00:00Z"));

    await markMaintenanceDone(deps, { taskId: task.id });

    const [listed] = await listMaintenanceTasks(deps);
    expect(listed?.skipCount).toBe(0);
  });
});
