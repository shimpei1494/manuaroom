import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../errors";
import type { MaintenanceTask } from "./maintenance-task";
import { skipMaintenanceTask } from "./skip-maintenance-task";

const now = new Date("2026-07-20T12:00:00Z");

const baseTask: MaintenanceTask = {
  id: "task-1",
  userId: "user-1",
  productId: "product-1",
  title: "フィルター交換",
  intervalValue: 6,
  intervalUnit: "month",
  nextDueDate: new Date("2026-07-10T00:00:00Z"),
  lastDoneAt: new Date("2026-01-10T00:00:00Z"),
  memo: null,
  url: null,
  source: "manual",
  sourceManualId: null,
  sourcePage: null,
  createdAt: new Date("2025-12-01T00:00:00Z"),
  updatedAt: new Date("2026-01-10T00:00:00Z"),
};

describe("skipMaintenanceTask", () => {
  test("ADR 0006: 7/10 予定を 7/20 にスキップしたら次回は 1/20、最終実施日は 1/10 のまま", () => {
    const skippedAt = new Date("2026-07-20T00:00:00Z");

    const result = skipMaintenanceTask(baseTask, skippedAt, now);

    expect(result.nextDueDate).toEqual(new Date("2027-01-20T00:00:00Z"));
    expect(result.lastDoneAt).toEqual(new Date("2026-01-10T00:00:00Z"));
    expect(result.updatedAt).toEqual(now);
  });

  test("ADR 0006: interval が未設定のタスクはスキップできない", () => {
    const task = { ...baseTask, intervalValue: null, intervalUnit: null };

    expect(() => skipMaintenanceTask(task, now, now)).toThrow(BusinessRuleError);
  });

  test("interval の片方だけ設定されていてもスキップできない", () => {
    const task = { ...baseTask, intervalUnit: null };

    expect(() => skipMaintenanceTask(task, now, now)).toThrow(BusinessRuleError);
  });

  test("元のタスクは変更しない", () => {
    skipMaintenanceTask(baseTask, now, now);

    expect(baseTask.nextDueDate).toEqual(new Date("2026-07-10T00:00:00Z"));
  });
});
