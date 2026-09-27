import { describe, expect, test } from "vite-plus/test";

import { buildCalendarEntries } from "./build-calendar-entries";

// 日付の比較はテスト実行環境のタイムゾーンに依らないよう、ローカル時刻の正午で作る
const day = (s: string) => new Date(`${s}T12:00:00`);

const TODAY = day("2026-09-15");

function task(overrides: {
  id?: string;
  nextDueDate: string | null;
  intervalValue?: number | null;
  intervalUnit?: "day" | "week" | "month" | "year" | null;
}) {
  return {
    id: overrides.id ?? "task-1",
    nextDueDate: overrides.nextDueDate === null ? null : day(overrides.nextDueDate),
    intervalValue: overrides.intervalValue ?? null,
    intervalUnit: overrides.intervalUnit ?? null,
  };
}

describe("buildCalendarEntries", () => {
  test("次回予定日をその日に出す。表示する月の外の予定は出さない", () => {
    const entries = buildCalendarEntries({
      tasks: [
        task({ id: "a", nextDueDate: "2026-09-20" }),
        task({ id: "b", nextDueDate: "2026-10-01" }),
      ],
      logs: [],
      month: day("2026-09-01"),
      today: TODAY,
    });

    expect(entries).toEqual([{ day: "2026-09-20", kind: "due", taskId: "a" }]);
  });

  test("期限超過は今日のセルにまとめる。今日が別の月なら出さない", () => {
    const tasks = [task({ nextDueDate: "2026-08-30" })];

    expect(
      buildCalendarEntries({ tasks, logs: [], month: day("2026-09-01"), today: TODAY }),
    ).toEqual([{ day: "2026-09-15", kind: "overdue", taskId: "task-1" }]);
    expect(
      buildCalendarEntries({ tasks, logs: [], month: day("2026-08-01"), today: TODAY }),
    ).toEqual([]);
  });

  test("目安は次回予定日から周期を足して、今日から 3 か月先まで出す", () => {
    const tasks = [task({ nextDueDate: "2026-09-20", intervalValue: 1, intervalUnit: "month" })];

    const months = ["2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01"].map((m) =>
      buildCalendarEntries({ tasks, logs: [], month: day(m), today: TODAY }),
    );

    expect(months).toEqual([
      [{ day: "2026-10-20", kind: "projected", taskId: "task-1" }],
      [{ day: "2026-11-20", kind: "projected", taskId: "task-1" }],
      // 12/20 は今日 (9/15) から 3 か月 (12/15) より先なので出さない
      [],
      [],
    ]);
  });

  test("期限超過のタスクの目安は今日を起点にする (今日完了すれば今日 + 周期になるため)", () => {
    const entries = buildCalendarEntries({
      tasks: [task({ nextDueDate: "2026-09-01", intervalValue: 2, intervalUnit: "week" })],
      logs: [],
      month: day("2026-09-01"),
      today: TODAY,
    });

    expect(entries).toEqual([
      { day: "2026-09-15", kind: "overdue", taskId: "task-1" },
      { day: "2026-09-29", kind: "projected", taskId: "task-1" },
    ]);
  });

  test("月末起点でも日付がずれていかない", () => {
    const tasks = [task({ nextDueDate: "2026-10-31", intervalValue: 1, intervalUnit: "month" })];

    const dec = buildCalendarEntries({
      tasks,
      logs: [],
      month: day("2026-12-01"),
      today: day("2026-10-01"),
      projectionMonths: 6,
    });

    // 10/31 → 11/30 → 12/30 ではなく 12/31
    expect(dec).toEqual([{ day: "2026-12-31", kind: "projected", taskId: "task-1" }]);
  });

  test("予定日も周期もないタスクは出さない", () => {
    expect(
      buildCalendarEntries({
        tasks: [task({ nextDueDate: null, intervalValue: 1, intervalUnit: "month" })],
        logs: [],
        month: day("2026-09-01"),
        today: TODAY,
      }),
    ).toEqual([]);
  });

  test("実施とスキップの記録をその日に出す", () => {
    const entries = buildCalendarEntries({
      tasks: [],
      logs: [
        { taskId: "a", kind: "done", doneAt: day("2026-09-03") },
        { taskId: "b", kind: "skipped", doneAt: day("2026-09-10") },
        { taskId: "c", kind: "done", doneAt: day("2026-08-31") },
      ],
      month: day("2026-09-01"),
      today: TODAY,
    });

    expect(entries).toEqual([
      { day: "2026-09-03", kind: "done", taskId: "a" },
      { day: "2026-09-10", kind: "skipped", taskId: "b" },
    ]);
  });
});
