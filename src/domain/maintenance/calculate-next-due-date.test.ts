import { describe, expect, test } from "vite-plus/test";

import { calculateNextDueDate } from "./calculate-next-due-date";

describe("calculateNextDueDate", () => {
  test("2週間ごと: 完了日 + 14日", () => {
    const completedAt = new Date("2026-01-10T00:00:00Z");
    expect(calculateNextDueDate(completedAt, 2, "week")).toEqual(new Date("2026-01-24T00:00:00Z"));
  });

  test("1ヶ月ごと: 完了日 + 1ヶ月（月末でも合理的に丸める）", () => {
    const completedAt = new Date("2026-01-31T00:00:00Z");
    // dayjs は 1/31 + 1 month を 2/28 にする（2026年は平年）
    expect(calculateNextDueDate(completedAt, 1, "month")).toEqual(new Date("2026-02-28T00:00:00Z"));
  });

  test("3日ごと: 完了日 + 3日", () => {
    const completedAt = new Date("2026-05-15T09:30:00Z");
    expect(calculateNextDueDate(completedAt, 3, "day")).toEqual(new Date("2026-05-18T09:30:00Z"));
  });

  test("1年ごと: 閏年境界をまたいでも正しい", () => {
    const completedAt = new Date("2024-02-29T00:00:00Z"); // 閏日
    // dayjs: 2024-02-29 + 1 year = 2025-02-28
    expect(calculateNextDueDate(completedAt, 1, "year")).toEqual(new Date("2025-02-28T00:00:00Z"));
  });

  test("ADR-0001 のシナリオ: 1/1 予定が 1/10 まで遅れた場合、次回は 1/24", () => {
    const completedAt = new Date("2026-01-10T00:00:00Z");
    expect(calculateNextDueDate(completedAt, 2, "week")).toEqual(new Date("2026-01-24T00:00:00Z"));
  });

  test("intervalValue が 0 だと例外", () => {
    expect(() => calculateNextDueDate(new Date("2026-01-01"), 0, "day")).toThrow();
  });

  test("intervalValue が負だと例外", () => {
    expect(() => calculateNextDueDate(new Date("2026-01-01"), -1, "month")).toThrow();
  });

  test("intervalValue が整数でないと例外", () => {
    expect(() => calculateNextDueDate(new Date("2026-01-01"), 1.5, "week")).toThrow();
  });
});
