import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../errors";
import type { MaintenanceLog } from "./maintenance-log";
import type { MaintenanceTask } from "./maintenance-task";
import { findLatestRecordedLog, undoMaintenanceLog } from "./undo-maintenance-log";

const NOW = new Date("2026-08-01T00:00:00Z");

const task: MaintenanceTask = {
  id: "task-1",
  userId: "user-1",
  productId: "product-1",
  title: "フィルター掃除",
  intervalValue: 1,
  intervalUnit: "month",
  nextDueDate: new Date("2026-08-20T00:00:00Z"),
  lastDoneAt: new Date("2026-07-20T00:00:00Z"),
  memo: null,
  url: null,
  source: "manual",
  sourceManualId: null,
  sourcePage: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-07-20T00:00:00Z"),
};

function makeLog(overrides: Partial<MaintenanceLog>): MaintenanceLog {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    taskId: "task-1",
    kind: "done",
    doneAt: new Date("2026-07-20T00:00:00Z"),
    memo: null,
    previousTaskState: {
      nextDueDate: new Date("2026-07-15T00:00:00Z"),
      lastDoneAt: new Date("2026-06-15T00:00:00Z"),
    },
    createdAt: new Date("2026-07-20T00:00:00Z"),
    ...overrides,
  };
}

describe("undoMaintenanceLog", () => {
  test("記録する前の次回予定日と最終実施日に戻す", () => {
    const latest = makeLog({});

    const result = undoMaintenanceLog(task, [latest], latest.id, NOW);

    expect(result).toEqual({
      ...task,
      nextDueDate: new Date("2026-07-15T00:00:00Z"),
      lastDoneAt: new Date("2026-06-15T00:00:00Z"),
      updatedAt: NOW,
    });
  });

  test("スキップの取り消しでは最終実施日は変わらない (記録前も同じ値のため)", () => {
    const skipped = makeLog({
      kind: "skipped",
      previousTaskState: {
        nextDueDate: new Date("2026-07-15T00:00:00Z"),
        lastDoneAt: task.lastDoneAt,
      },
    });

    const result = undoMaintenanceLog(task, [skipped], skipped.id, NOW);

    expect(result.lastDoneAt).toEqual(task.lastDoneAt);
    expect(result.nextDueDate).toEqual(new Date("2026-07-15T00:00:00Z"));
  });

  test("直近 (最後に記録したもの) 以外は取り消せない", () => {
    const older = makeLog({ createdAt: new Date("2026-06-15T00:00:00Z") });
    // 実施日を過去にして記録しても、記録した順で判断する
    const latest = makeLog({
      doneAt: new Date("2026-05-01T00:00:00Z"),
      createdAt: new Date("2026-07-20T00:00:00Z"),
    });

    expect(() => undoMaintenanceLog(task, [latest, older], older.id, NOW)).toThrow(
      BusinessRuleError,
    );
    expect(undoMaintenanceLog(task, [older, latest], latest.id, NOW).updatedAt).toEqual(NOW);
  });

  test("取り消し機能より前の記録 (記録前の状態が無い) は取り消せない", () => {
    const legacy = makeLog({ previousTaskState: null });

    expect(() => undoMaintenanceLog(task, [legacy], legacy.id, NOW)).toThrow(BusinessRuleError);
  });

  test("そのタスクの記録に無い ID は取り消せない", () => {
    expect(() => undoMaintenanceLog(task, [makeLog({})], "unknown", NOW)).toThrow(
      BusinessRuleError,
    );
  });
});

describe("findLatestRecordedLog", () => {
  test("記録した時刻が最も新しいもの。空なら undefined", () => {
    const a = makeLog({ createdAt: new Date("2026-07-01T00:00:00Z") });
    const b = makeLog({ createdAt: new Date("2026-07-02T00:00:00Z") });

    expect(findLatestRecordedLog([b, a])).toBe(b);
    expect(findLatestRecordedLog([])).toBeUndefined();
  });
});
