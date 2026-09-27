import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { listMaintenanceLogsInPeriod } from "./list-maintenance-logs-in-period";
import { markMaintenanceDone } from "./mark-maintenance-done";

describe("listMaintenanceLogsInPeriod", () => {
  test("記録した日が from 以上 to 未満の記録を返す", async () => {
    const deps = createFakeDeps({ now: new Date("2026-09-10T00:00:00Z") });
    const task = makeMaintenanceTask();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });
    const justAfter = new Date(log.doneAt.getTime() + 1);

    const [including, after] = await Promise.all([
      listMaintenanceLogsInPeriod(deps, { from: log.doneAt, to: justAfter }),
      listMaintenanceLogsInPeriod(deps, { from: justAfter, to: new Date("2026-11-01T00:00:00Z") }),
    ]);

    expect(including).toEqual([log]);
    expect(after).toEqual([]);
  });
});
