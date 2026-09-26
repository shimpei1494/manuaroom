import { describe, expect, test } from "vite-plus/test";

import { completeMaintenanceTask } from "./complete-maintenance-task";
import type { MaintenanceTask } from "./maintenance-task";

const now = new Date("2026-01-10T12:00:00Z");

const baseTask: MaintenanceTask = {
  id: "task-1",
  userId: "user-1",
  productId: "product-1",
  title: "フィルター掃除",
  intervalValue: 2,
  intervalUnit: "week",
  nextDueDate: new Date("2026-01-01T00:00:00Z"),
  lastDoneAt: new Date("2025-12-18T00:00:00Z"),
  memo: null,
  url: null,
  source: "manual",
  sourceManualId: null,
  sourcePage: null,
  createdAt: new Date("2025-12-01T00:00:00Z"),
  updatedAt: new Date("2025-12-18T00:00:00Z"),
};

describe("completeMaintenanceTask", () => {
  test("ADR-0001: 1/1 予定を 1/10 に完了したら次回は 1/24、最終実施日は 1/10", () => {
    const doneAt = new Date("2026-01-10T00:00:00Z");

    const result = completeMaintenanceTask(baseTask, doneAt, now);

    expect(result.nextDueDate).toEqual(new Date("2026-01-24T00:00:00Z"));
    expect(result.lastDoneAt).toEqual(doneAt);
    expect(result.updatedAt).toEqual(now);
  });

  test("interval が未設定なら次回予定日は null", () => {
    const task = { ...baseTask, intervalValue: null, intervalUnit: null };

    const result = completeMaintenanceTask(task, new Date("2026-01-10T00:00:00Z"), now);

    expect(result.nextDueDate).toBeNull();
  });

  test("interval の片方だけ設定されていても次回予定日は null", () => {
    const task = { ...baseTask, intervalUnit: null };

    const result = completeMaintenanceTask(task, new Date("2026-01-10T00:00:00Z"), now);

    expect(result.nextDueDate).toBeNull();
  });

  test("元のタスクは変更しない", () => {
    completeMaintenanceTask(baseTask, new Date("2026-01-10T00:00:00Z"), now);

    expect(baseTask.lastDoneAt).toEqual(new Date("2025-12-18T00:00:00Z"));
  });
});
