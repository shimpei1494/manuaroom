import { describe, expect, test } from "vite-plus/test";

import { formatDueLabel, formatInterval } from "./format";

describe("formatInterval", () => {
  test("月は「か月」にして 6 月と読めないようにする", () => {
    expect(formatInterval(6, "month")).toBe("6か月ごと");
  });

  test("日・週・年", () => {
    expect(formatInterval(3, "day")).toBe("3日ごと");
    expect(formatInterval(2, "week")).toBe("2週間ごと");
    expect(formatInterval(1, "year")).toBe("1年ごと");
  });

  test("周期がなければ「—」", () => {
    expect(formatInterval(null, null)).toBe("—");
  });
});

describe("formatDueLabel", () => {
  const today = new Date("2026-07-20T15:00:00");

  test("今日が期限なら「今日」", () => {
    expect(formatDueLabel(new Date("2026-07-20T00:00:00"), today)).toBe("今日");
  });

  test("未来なら「あと〇日」", () => {
    expect(formatDueLabel(new Date("2026-07-23T00:00:00"), today)).toBe("あと3日");
  });

  test("過ぎていれば「〇日超過」", () => {
    expect(formatDueLabel(new Date("2026-07-15T00:00:00"), today)).toBe("5日超過");
  });
});
