import { describe, expect, test } from "vite-plus/test";

import { formatLastDone } from "./format-last-done";

const today = new Date("2026-07-20T15:00:00");

describe("formatLastDone", () => {
  test("日付と何日前かを出す", () => {
    expect(formatLastDone(new Date("2026-07-10T09:00:00"), today)).toBe("2026/07/10（10日前）");
  });

  test("今日なら「今日」", () => {
    expect(formatLastDone(new Date("2026-07-20T08:00:00"), today)).toBe("2026/07/20（今日）");
  });

  test("未実施なら「—」", () => {
    expect(formatLastDone(null, today)).toBe("—");
  });
});
