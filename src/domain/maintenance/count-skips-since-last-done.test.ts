import { describe, expect, test } from "vite-plus/test";

import { countSkipsSinceLastDone } from "./count-skips-since-last-done";
import type { MaintenanceLog } from "./maintenance-log";

function log(kind: MaintenanceLog["kind"], doneAt: string): MaintenanceLog {
  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    taskId: "task-1",
    kind,
    doneAt: new Date(doneAt),
    memo: null,
    createdAt: new Date(doneAt),
  };
}

describe("countSkipsSinceLastDone", () => {
  test("ADR 0006: 最終実施日より後のスキップだけを数える", () => {
    const logs = [
      log("skipped", "2025-12-01T00:00:00Z"),
      log("done", "2026-01-10T00:00:00Z"),
      log("skipped", "2026-07-20T00:00:00Z"),
      log("skipped", "2027-01-25T00:00:00Z"),
    ];

    expect(countSkipsSinceLastDone(logs, new Date("2026-01-10T00:00:00Z"))).toBe(2);
  });

  test("一度も完了していなければすべてのスキップを数える", () => {
    const logs = [log("skipped", "2026-01-01T00:00:00Z"), log("skipped", "2026-02-01T00:00:00Z")];

    expect(countSkipsSinceLastDone(logs, null)).toBe(2);
  });

  test("完了した直後はスキップ回数が 0 に戻る", () => {
    const logs = [log("skipped", "2026-07-20T00:00:00Z"), log("done", "2026-08-01T00:00:00Z")];

    expect(countSkipsSinceLastDone(logs, new Date("2026-08-01T00:00:00Z"))).toBe(0);
  });

  test("実施ログは数えない", () => {
    const logs = [log("done", "2026-07-20T00:00:00Z")];

    expect(countSkipsSinceLastDone(logs, null)).toBe(0);
  });
});
